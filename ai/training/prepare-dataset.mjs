// Percurso — preparação do dataset LoRA a partir das DOAÇÕES explícitas.
//
// Lê data/ai-doacoes.jsonl (interações doadas conscientemente pelos pedagogos,
// já validadas contra anonimização na gravação), REVALIDA a anonimização e
// produz os splits 80/10/10 em JSONL conversacional (system/user/assistant),
// separados POR CENÁRIO (hash da pergunta) para não vazar a mesma situação
// entre treino e teste.
//
// GATE IMPRESSO NO FINAL: o treino só se justifica com >= 200 exemplos
// aprovados. Este script não treina nada — ele prepara e conta.
//
// Uso:  node ai/training/prepare-dataset.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOACOES = join(RAIZ, 'data', 'ai-doacoes.jsonl');
const SAIDA = join(RAIZ, 'data', 'rag', 'private', 'lora-dataset');
const MINIMO = 200;

if (!existsSync(DOACOES)) {
  console.log('Nenhuma doação em data/ai-doacoes.jsonl — nada a preparar.');
  console.log(`Gate da Fase 4: >= ${MINIMO} interações aprovadas. Hoje: 0.`);
  process.exit(0);
}

// Revalidação de anonimização: o dataset nunca depende de o caminho feliz ter
// funcionado — qualquer nome do banco operacional presente aborta o exemplo.
process.env.PERCURSO_DB ??= join(RAIZ, 'data', 'percurso.db');
const { getDb, all, closeDb } = await import('../../src/db.js');
const { anonimizarTexto } = await import('../../src/rag/anonimizar.js');
getDb();
const nomes = all(`SELECT nome FROM crianca`).map(r => r.nome);
closeDb();

const SYSTEM = readFileSync(join(RAIZ, 'ai', 'prompts', 'copilot-reflexivo.md'), 'utf8')
  .split('\n---\n').pop().trim();

const linhas = readFileSync(DOACOES, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const exemplos = [];
let descartados = 0;
for (const d of linhas) {
  const blob = JSON.stringify({ p: d.pergunta, r: d.resposta });
  if (anonimizarTexto(blob, nomes).substituicoes > 0) { descartados++; continue; }
  exemplos.push({
    cenario: createHash('sha256').update(d.pergunta).digest('hex').slice(0, 12),
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: d.pergunta },
      { role: 'assistant', content: JSON.stringify(d.resposta) },
    ],
  });
}

// Splits POR CENÁRIO, determinísticos (ordena por hash do cenário).
const porCenario = [...new Set(exemplos.map(e => e.cenario))].sort();
const corte1 = Math.floor(porCenario.length * 0.8);
const corte2 = Math.floor(porCenario.length * 0.9);
const destino = new Map(porCenario.map((c, i) => [c, i < corte1 ? 'train' : i < corte2 ? 'val' : 'test']));

mkdirSync(SAIDA, { recursive: true });
const grupos = { train: [], val: [], test: [] };
for (const e of exemplos) grupos[destino.get(e.cenario)].push({ messages: e.messages });
for (const [nome, itens] of Object.entries(grupos)) {
  writeFileSync(join(SAIDA, `${nome}.jsonl`), itens.map(i => JSON.stringify(i)).join('\n') + (itens.length ? '\n' : ''));
}
writeFileSync(join(SAIDA, 'manifest.json'), JSON.stringify({
  gerado_em: new Date().toISOString(),
  total: exemplos.length,
  descartados_por_anonimizacao: descartados,
  splits: Object.fromEntries(Object.entries(grupos).map(([k, v]) => [k, v.length])),
  cenarios: porCenario.length,
  gate_minimo: MINIMO,
  gate_cumprido: exemplos.length >= MINIMO,
  aviso: 'Cada exemplo ainda exige revisão humana de pedagogo antes do treino.',
}, null, 2));

console.log(`Exemplos válidos: ${exemplos.length} (descartados por anonimização: ${descartados})`);
console.log(`Splits por cenário — train: ${grupos.train.length} · val: ${grupos.val.length} · test: ${grupos.test.length}`);
console.log(exemplos.length >= MINIMO
  ? 'Gate de volume CUMPRIDO — próximo passo: revisão humana exemplo a exemplo.'
  : `Gate de volume NÃO cumprido (${exemplos.length}/${MINIMO}) — o treino não se justifica ainda.`);
