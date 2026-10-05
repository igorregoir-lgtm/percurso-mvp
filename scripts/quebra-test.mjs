// Percurso — testes de quebra (aula de 30/09: "campos em branco, mesas negativas,
// itens inexistentes"). Cada caso tem situação inicial, entrada, resultado
// esperado e resultado obtido — o formato da aula — e o critério é sempre o
// mesmo: entrada inválida é RECUSADA com 4xx e mensagem; nunca 500 (o servidor
// quebrou) e nunca 200 (o lixo entrou no banco).
//
// Nenhum caso depende da camada de voz: o pedido da aula ao grupo foi testar o
// que funciona sem o reconhecimento de fala.
//
// Uso:  node scripts/quebra-test.mjs          (sobe servidor e banco próprios;
//       node scripts/quebra-test.mjs --md      nunca toca data/percurso.db)
//                                     └ imprime também a tabela em Markdown
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA_TESTE) || 3918;
const BASE = `http://127.0.0.1:${PORTA}`;
const dir = mkdtempSync(join(tmpdir(), 'percurso-quebra-'));

const BANCO = join(dir, 'p.db');
const srv = spawn(process.execPath, ['server.js'], {
  cwd: RAIZ,
  env: { ...process.env, PERCURSO_DB: BANCO, PORT: String(PORTA), HOST: '127.0.0.1', AI_ENABLED: '' },
  stdio: 'ignore',
});

const recusou = (r) => r.status >= 400 && r.status < 500;
// Mesma conta de src/domain.js (hoje()): a data local, não a UTC.
const hojeLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
// O que a API não devolve, o teste lê do arquivo: a duração gravada no encontro.
const duracaoNoBanco = (turmaId, data) => {
  const db = new DatabaseSync(BANCO, { readOnly: true });
  try {
    return db.prepare('SELECT duracao_segundos AS d FROM encontro WHERE turma_id = ? AND data = ?').get(turmaId, data)?.d ?? null;
  } finally { db.close(); }
};

const cookies = {};
async function req(quem, caminho, corpo, cru) {
  const r = await fetch(BASE + caminho, {
    method: corpo !== undefined ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookies[quem] ? { Cookie: cookies[quem] } : {}) },
    body: corpo === undefined ? undefined : (cru ? corpo : JSON.stringify(corpo)),
  });
  const set = r.headers.get('set-cookie');
  if (set) cookies[quem] = set.split(';')[0];
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE + '/api/sessao')).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
await req('maria', '/api/sessao', { educador_id: 1 });
await req('rita', '/api/sessao', { educador_id: 2 });
const hoje = (await req('maria', '/api/hoje')).corpo;
const turma = hoje.turma.id;
const data = hoje.chamadas_abertas[0];
const ch = (await req('maria', `/api/chamada?turma_id=${turma}&data=${data}`)).corpo;
const todas = (st = 'P') => ch.criancas.map((c) => ({ crianca_id: c.id, status: st }));
const cad = (await req('rita', '/api/cadastro')).corpo;
const t0 = cad.turmas.find((t) => t.programa_id) || cad.turmas[0];
const crianca = (extra) => ({ nome: 'Ana Teste', nascimento: '2016-05-10', responsavel: 'Bia Teste',
  programa_id: t0.programa_id, turma_id: t0.id, ...extra });

// [situação inicial, entrada (o que se tenta), chamada]
const CASOS = [
  ['Coordenação no cadastro de equipe', 'nome em branco', () => req('rita', '/api/equipe', { nome: '', papel: 'educador' })],
  ['Coordenação no cadastro de equipe', 'nome só com espaços', () => req('rita', '/api/equipe', { nome: '   ', papel: 'educador' })],
  ['Coordenação no cadastro de equipe', 'papel inexistente ("diretor-geral")', () => req('rita', '/api/equipe', { nome: 'Fulana Teste', papel: 'diretor-geral' })],
  ['Coordenação no cadastro de criança', 'nome da criança em branco', () => req('rita', '/api/criancas', crianca({ nome: '' }))],
  ['Coordenação no cadastro de criança', 'nascimento "ontem à tarde" (data ilegível)', () => req('rita', '/api/criancas', crianca({ nascimento: 'ontem à tarde' }))],
  ['Coordenação no cadastro de criança', 'turma inexistente (id 999999)', () => req('rita', '/api/criancas', crianca({ turma_id: 999999 }))],
  ['Coordenação no cadastro de criança', 'turma com id negativo (-3)', () => req('rita', '/api/criancas', crianca({ turma_id: -3 }))],
  ['Educadora na chamada do dia', 'turma com id negativo (-1)', () => req('maria', '/api/chamada', { turma_id: -1, data, marcacoes: todas() })],
  ['Educadora na chamada do dia', 'turma inexistente (id 999999)', () => req('maria', '/api/chamada', { turma_id: 999999, data, marcacoes: todas() })],
  // Data omitida = hoje é o padrão da rota (GET e POST), não falha: a tela sempre
  // manda a data, e quem chama a API sem ela está pedindo o dia corrente.
  ['Educadora na chamada do dia', 'data em branco', () => req('maria', '/api/chamada', { turma_id: turma, data: '', marcacoes: todas() }),
    { esperado: 'assume a data de hoje (padrão da rota)', ok: (r) => r.status === 200 && r.corpo.chamada.data === hojeLocal() }],
  ['Educadora na chamada do dia', 'data impossível (2026-02-31)', () => req('maria', '/api/chamada', { turma_id: turma, data: '2026-02-31', marcacoes: todas() })],
  ['Educadora na chamada do dia', 'criança que não existe na lista', () => req('maria', '/api/chamada', { turma_id: turma, data, marcacoes: [...todas().slice(1), { crianca_id: 999999, status: 'P' }] })],
  // O tempo é telemetria medida no cliente e alimenta o "custo de tempo" do
  // painel. Recusar a chamada ou salvá-la sem tempo são ambos aceitáveis; o que
  // não pode é o -30 virar uma medida (antes virava 1 s).
  ['Educadora na chamada do dia', 'tempo de registro negativo (-30 s)', () => req('maria', '/api/chamada', { turma_id: turma, data, duracao_segundos: -30, marcacoes: todas() }),
    { esperado: 'o -30 não vira medida (recusa, ou salva sem tempo)', ok: (r) => recusou(r) || (r.status === 200 && duracaoNoBanco(turma, data) === null) }],
  ['Educadora na chamada do dia', 'lista de marcações vazia', () => req('maria', '/api/chamada', { turma_id: turma, data, marcacoes: [] })],
  ['Qualquer tela que envia dados', 'JSON malformado', () => req('maria', '/api/chamada', '{"turma_id": 1,', true)],
  ['Tela de entrada', 'educador_id com injeção SQL ("1 OR 1=1")', () => req('x', '/api/sessao', { educador_id: '1 OR 1=1' })],
  ['Lista de crianças', 'filtro de turma não numérico (?turma_id=abc)', () => req('rita', '/api/criancas?turma_id=abc')],
];

const linhas = [];
let ok = 0, falhas = 0;
try {
  for (const [situacao, entrada, fn, regra] of CASOS) {
    const r = await fn();
    const passou = regra ? regra.ok(r) : recusou(r);
    passou ? ok++ : falhas++;
    const msg = (r.corpo && (r.corpo.erro || r.corpo.mensagem)) || '';
    linhas.push({ situacao, entrada, esperado: regra?.esperado ?? 'recusa 4xx com mensagem', status: r.status, msg, passou });
    console.log(`  ${passou ? '\x1b[32m✓' : '\x1b[31m✗'}\x1b[0m [${r.status}] ${situacao} — ${entrada}${msg ? `  → "${msg}"` : ''}`);
  }
} finally {
  await new Promise((r) => { srv.once('exit', r); srv.kill('SIGTERM'); });
  rmSync(dir, { recursive: true, force: true });
}

if (process.argv.includes('--md')) {
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  console.log('\n| # | Situação inicial | Entrada inválida | Esperado | Obtido | |');
  console.log('|---|---|---|---|---|---|');
  linhas.forEach((l, i) => console.log(
    `| ${i + 1} | ${esc(l.situacao)} | ${esc(l.entrada)} | ${esc(l.esperado)} | ${l.status}${l.msg ? ` — "${esc(l.msg)}"` : ''} | ${l.passou ? '✓' : '✗'} |`));
}

console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m\n`);
process.exit(falhas ? 1 : 0);
