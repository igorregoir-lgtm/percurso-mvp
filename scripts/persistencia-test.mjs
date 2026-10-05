// Percurso — o dado sobrevive ao servidor? (critério de "versão concluída" da aula de 30/09)
//
// A bateria de fluxo (smoke-test.mjs) relê o que gravou, mas com o MESMO processo
// no ar — isso prova o banco, não o disco. Este teste derruba o servidor no meio:
//   1. sobe um servidor próprio, numa porta própria, com um banco temporário;
//   2. grava por dois caminhos do fluxo principal que não dependem de voz:
//      a chamada (tabelas encontro + presenca) e o cadastro de uma professora (educador);
//   3. encerra o processo e sobe outro, apontando para o mesmo arquivo;
//   4. relê pela API e confere que tudo voltou igual.
//
// Uso:  node scripts/persistencia-test.mjs      (não precisa de servidor no ar;
//       nunca toca data/percurso.db)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA_TESTE) || 3917;
const BASE = `http://127.0.0.1:${PORTA}`;
const dir = mkdtempSync(join(tmpdir(), 'percurso-persist-'));
const BANCO = join(dir, 'percurso.db');

let ok = 0, falhas = 0;
const T = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log(`  \x1b[32m✓\x1b[0m ${nome}`); }
  else { falhas++; console.log(`  \x1b[31m✗ ${nome}\x1b[0m ${extra}`); }
};

function subir() {
  const p = spawn(process.execPath, ['server.js'], {
    cwd: RAIZ,
    env: { ...process.env, PERCURSO_DB: BANCO, PORT: String(PORTA), HOST: '127.0.0.1', AI_ENABLED: '' },
    stdio: 'ignore',
  });
  return p;
}

async function noAr(tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    try { if ((await fetch(BASE + '/api/sessao')).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

const derrubar = (p) => new Promise((r) => { p.once('exit', r); p.kill('SIGTERM'); });

// Cookie por pessoa, como o navegador faria. A sessão mora no banco (decisão 51),
// mas aqui cada processo novo entra de novo — o teste é do DADO, não da sessão.
const cookies = {};
async function req(quem, caminho, corpo) {
  const r = await fetch(BASE + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookies[quem] ? { Cookie: cookies[quem] } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const set = r.headers.get('set-cookie');
  if (set) cookies[quem] = set.split(';')[0];
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

console.log('\n\x1b[1mPercurso — persistência após reiniciar o servidor\x1b[0m');
console.log(`Banco temporário: ${BANCO}\n`);

let srv = subir();
try {
  T('1º servidor sobe e cria/semeia o banco sozinho', await noAr());

  await req('maria', '/api/sessao', { educador_id: 1 });
  await req('rita', '/api/sessao', { educador_id: 2 });

  const hoje = (await req('maria', '/api/hoje')).corpo;
  const turmaId = hoje.turma.id;
  const data = hoje.chamadas_abertas[0];
  const ch = (await req('maria', `/api/chamada?turma_id=${turmaId}&data=${data}`)).corpo;
  const marcacoes = ch.criancas.map((c, i) => ({ crianca_id: c.id, status: i % 5 === 0 ? 'F' : 'P' }));
  const esperado = Object.fromEntries(marcacoes.map((m) => [m.crianca_id, m.status]));
  const salva = await req('maria', '/api/chamada', { turma_id: turmaId, data, marcacoes });
  T(`chamada de ${data} gravada (${marcacoes.length} crianças)`, salva.status === 200 && salva.corpo.ok);

  const nova = await req('rita', '/api/equipe', { nome: 'Teste de Persistência', papel: 'educador' });
  const novaId = nova.corpo?.pessoa?.id;
  T('professora nova cadastrada pela coordenação', nova.status === 200 && !!novaId);

  await derrubar(srv);
  T('1º servidor encerrado', srv.exitCode !== null || srv.signalCode !== null);

  srv = subir();
  T('2º servidor sobe sobre o MESMO arquivo de banco', await noAr());

  await req('maria', '/api/sessao', { educador_id: 1 });
  const rel = (await req('maria', `/api/chamada?turma_id=${turmaId}&data=${data}`)).corpo;
  T('a chamada continua registrada depois do reinício', rel.registrada === true);
  T('cada presença/falta voltou exatamente como foi marcada',
    rel.criancas.length === marcacoes.length && rel.criancas.every((c) => c.status === esperado[c.id]));
  const pendentes = (await req('maria', '/api/hoje')).corpo.chamadas_abertas;
  T('a data gravada não volta para a lista de pendentes', !pendentes.includes(data));

  const usuarios = (await req('anon', '/api/sessao')).corpo.usuarios;
  T('a professora cadastrada continua na tela de entrada', usuarios.some((u) => u.id === novaId));
} finally {
  await derrubar(srv);
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m\n`);
process.exit(falhas ? 1 : 0);
