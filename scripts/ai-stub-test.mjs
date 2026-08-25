// Percurso — testes da camada de IA SEM modelo (gate de CI das Fases 0 e 2).
//
// Sobe o stub do llama-server (scripts/ai-stub.mjs, em processo filho) e
// exercita: contrato de 7 blocos validado por schema, verificador de citações,
// fallback em saída inválida/timeout/500, fila de 2+teto, e o Modo A
// (extrairComModelo) com pseudonimização reversível e fallback lexical.
//
// Roda sozinho:  node scripts/ai-stub-test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8099;

// Ambiente ANTES dos imports dinâmicos — ai-client lê env no import.
const dirTemp = mkdtempSync(join(tmpdir(), 'percurso-ai-'));
process.env.PERCURSO_DB = join(dirTemp, 'ai-test.db');
process.env.AI_ENABLED = '1';
process.env.AI_URL_REFLEXIVO = `http://127.0.0.1:${PORTA}`;
process.env.AI_URL_ESTRUTURADO = `http://127.0.0.1:${PORTA}`;
process.env.AI_TIMEOUT_REFLEXIVO_MS = '2500';
process.env.AI_TIMEOUT_ESTRUTURADO_MS = '2500';

const stub = spawn(process.execPath, [join(RAIZ, 'scripts', 'ai-stub.mjs')], {
  env: { ...process.env, PORTA: String(PORTA) }, stdio: 'ignore',
});
await new Promise((res, rej) => {
  const t0 = Date.now();
  (function tenta() {
    fetch(`http://127.0.0.1:${PORTA}/health`).then(r => r.ok ? res() : setTimeout(tenta, 100))
      .catch(() => Date.now() - t0 > 5000 ? rej(new Error('stub não subiu')) : setTimeout(tenta, 100));
  })();
});

const { semear } = await import('../src/seed.js');
const { closeDb, all } = await import('../src/db.js');
const C = await import('../src/copilot.js');
semear();

let ok = 0, falhas = 0;
const T = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log(`  \x1b[32m✓\x1b[0m ${nome}`); }
  else { falhas++; console.log(`  \x1b[31m✗ ${nome}\x1b[0m ${extra}`); }
};
console.log('\n\x1b[1mPercurso — camada de IA com stub (CI, sem modelo)\x1b[0m\n');

const educadora = { id: 1, papel: 'educador' };

// 1 · contrato de 7 blocos + citação verificada -------------------------------
{
  const r = await C.chat(educadora, { message: 'A turma se dispersa na roda de conversa depois de dez minutos. O que testar?' });
  T('chat devolve tipo reflexao', r.tipo === 'reflexao');
  const b = r.resposta;
  T('os 7 blocos vêm presentes', ['entendi', 'perguntas', 'hipoteses', 'alternativas', 'contraponto', 'fontes', 'proximo_passo']
    .every(k => b[k] !== undefined) && 'escalonamento' in b);
  T('2-3 perguntas socráticas', b.perguntas.length >= 2 && b.perguntas.length <= 3);
  T('hipóteses todas rotuladas', b.hipoteses.every(h => ['possível', 'a investigar'].includes(h.rotulo)));
  T('>= 3 alternativas com limites', b.alternativas.length >= 3 && b.alternativas.every(a => a.acao && a.limites));
  // o stub cita "stub-1", que NÃO é chunk real do corpus → o verificador descarta
  T('citação inventada é descartada pelo verificador',
    b.fontes_invalidas_descartadas >= 1 && b.fontes.length === 0 && b.sem_fonte_no_corpus === true);
  T('aviso fixo presente na resposta', /decisão pedagógica é sua/i.test(r.aviso));
}

// 2 · perímetro e recusa NUNCA chegam ao modelo -------------------------------
{
  const nomes = C.nomesParaAnonimizar(educadora);
  const nome = nomes[0];
  const r = await C.chat(educadora, { message: `O ${nome} está muito deprimido.` });
  T('estado interno de criança nomeada vira encaminhamento (sem modelo)', r.tipo === 'encaminhamento');
  const r2 = await C.chat(educadora, { message: 'Qual nota você daria para essa criança na atividade?' });
  T('pedido de nota vira recusa determinística (sem modelo)', r2.tipo === 'recusa');
  const prep = C.prepararEntrada(`A ${nome} chorou o encontro inteiro e não fala com ninguém.`, nomes);
  T('invariante: frase de estado interno não sobrevive ao preparo',
    prep.barrado || !new RegExp(nome.split(' ')[0], 'i').test(prep.anon?.texto || ''));
}

// 3 · fallbacks: saída inválida, timeout e 500 --------------------------------
{
  for (const [marcador, rotulo] of [['__stub_invalido__', 'saída inválida'], ['__stub_500__', 'HTTP 500']]) {
    let falhou = false;
    try { await C.chat(educadora, { message: `situação de teste para o fallback ${marcador}` }); }
    catch (e) { falhou = e.status === 503 && /registro manual continua/.test(e.message); }
    T(`${rotulo} → 503 com fallback claro`, falhou);
  }
  let falhou = false;
  const t0 = Date.now();
  try { await C.chat(educadora, { message: 'situação de teste para o fallback __stub_trava__' }); }
  catch (e) { falhou = e.status === 503; }
  T('timeout aborta e devolve fallback claro', falhou && Date.now() - t0 < 10_000);
}

// 4 · fila: 2 em voo, espera limitada, teto → 503 -----------------------------
{
  // 7 pedidos que travam: 2 entram, 4 esperam, o 7º recebe "ocupado".
  const pedidos = Array.from({ length: 7 }, () =>
    C.chat(educadora, { message: 'teste de fila __stub_trava__' }).then(() => 'ok').catch(e => e.message));
  const resultados = await Promise.all(pedidos);
  const ocupados = resultados.filter(m => /ocupado/.test(m)).length;
  const timeouts = resultados.filter(m => /fora do ar/.test(m)).length;
  T(`fila: ${ocupados} recusado(s) por teto e ${timeouts} timeout(s)`, ocupados >= 1 && timeouts === 6);
}

// 5 · Modo A: extrairComModelo com pseudonimização reversível ------------------
{
  const nomes = all(`SELECT c.nome FROM crianca c JOIN matricula m ON m.crianca_id=c.id
     JOIN turma t ON t.id=m.turma_id WHERE t.educador_id=1 AND m.status='ativa' LIMIT 5`).map(r => r.nome);
  const r = await C.extrairComModelo('Hoje fizemos roda de conversa sobre saúde, a turma colaborou bastante e três crianças pediram ajuda.', nomes);
  T('Modo A: origem modelo com saída validada pelo MESMO schema do extrator lexical',
    r.origem === 'modelo' && r.extracao.atividade === 'roda');
  const { validarExtracao } = await import('../src/voz.js');
  T('Modo A: validarExtracao aprova a saída do modelo', validarExtracao(r.extracao).valido);
  const r2 = await C.extrairComModelo('__stub_invalido__ hoje teve brincadeira no parque e todo mundo participou', nomes);
  T('Modo A: falha do modelo cai para o extrator lexical (origem regras)',
    r2.origem === 'regras' && validarExtracao(r2.extracao).valido);
}

stub.kill();
closeDb();
rmSync(dirTemp, { recursive: true, force: true });
console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m`);
process.exit(falhas ? 1 : 0);
