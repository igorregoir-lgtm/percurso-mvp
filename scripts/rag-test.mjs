// Percurso — avaliação do RAG (gate da Fase 1 do plano de IA).
//
// MÉTRICA DECLARADA: hit@5 — fração das 20 consultas com pelo menos um
// documento esperado no top-5. O gabarito aponta (source_id [+ regex de
// seção]), nunca chunk_id — estável a ajustes de chunking.
//
// GATES (falha = exit 1):
//   1. hit@5 >= 14/20 (70%)
//   2. 100% das citações devolvidas apontam para chunk existente
//   3. cobertura pt-BR: >= 90% dos excertos do top-5 são português
//   4. pseudonimização: nome de criança do roster NUNCA chega à busca
//
// As 20 consultas são de autoria interna — LIMITAÇÃO DECLARADA: devem ser
// revisadas/validadas por pedagogo antes de o gate ser considerado congelado
// (docs/POC-COPILOT.md registra essa pendência).
//
// Roda sem servidor; reconstrói o índice do zero (determinismo do ingest é
// parte do que se testa):  node scripts/rag-test.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Banco OPERACIONAL temporário (só para obter nomes do seed — o teste de
// pseudonimização usa nomes reais do roster sintético).
const dirTemp = mkdtempSync(join(tmpdir(), 'percurso-rag-'));
process.env.PERCURSO_DB = join(dirTemp, 'rag-test.db');

const { ingerir } = await import('../src/rag/ingest.mjs');
const { buscar, chunkExiste, fecharCorpus } = await import('../src/rag/search.js');
const { anonimizarTexto } = await import('../src/rag/anonimizar.js');
const { semear } = await import('../src/seed.js');
const { all, closeDb } = await import('../src/db.js');

let ok = 0, falhas = 0;
const T = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log(`  \x1b[32m✓\x1b[0m ${nome}`); }
  else { falhas++; console.log(`  \x1b[31m✗ ${nome}\x1b[0m ${extra}`); }
};

console.log('\n\x1b[1mPercurso — avaliação do RAG (hit@5, citações, pt-BR, pseudonimização)\x1b[0m\n');

// 0 · índice reconstruído do zero — o mesmo caminho do CI
const { total } = ingerir({ silencioso: true });
T(`índice reconstruído do zero (${total} chunks)`, total > 500);

// ---------------------------------------------------------------------------
// 20 consultas de teste. esperado = lista de alternativas aceitas; cada
// alternativa é {source_id, secao?: RegExp}.
// ---------------------------------------------------------------------------
const CONSULTAS = [
  { q: 'melhor interesse da criança no tratamento de dados pessoais', esperado: [{ source_id: 'lgpd', secao: /Art\.\s*14/ }] },
  { q: 'consentimento dado por pelo menos um dos pais ou responsável legal', esperado: [{ source_id: 'lgpd' }] },
  { q: 'quais são os direitos fundamentais da criança e do adolescente', esperado: [{ source_id: 'eca' }] },
  { q: 'medidas de proteção quando os direitos da criança forem ameaçados ou violados', esperado: [{ source_id: 'eca' }] },
  { q: 'campos de experiências da educação infantil', esperado: [{ source_id: 'bncc-ei' }] },
  { q: 'campo de experiências o eu o outro e o nós', esperado: [{ source_id: 'bncc-ei' }] },
  { q: 'direitos de aprendizagem conviver brincar participar explorar expressar conhecer-se', esperado: [{ source_id: 'bncc-ei' }] },
  { q: 'transição da educação infantil para o ensino fundamental', esperado: [{ source_id: 'bncc-ei' }, { source_id: 'bncc-ef' }] },
  { q: 'alfabetização nos dois primeiros anos do ensino fundamental', esperado: [{ source_id: 'bncc-ef' }] },
  { q: 'habilidades de leitura e escrita em língua portuguesa nos anos iniciais', esperado: [{ source_id: 'bncc-ef' }] },
  { q: 'políticas públicas para a primeira infância áreas prioritárias', esperado: [{ source_id: 'marco-pi' }] },
  { q: 'formação dos profissionais que trabalham com a primeira infância', esperado: [{ source_id: 'marco-pi' }] },
  { q: 'como a rubrica avalia persistência diante da dificuldade', esperado: [{ source_id: 'rubrica', secao: /Persist/i }] },
  { q: 'criança que só inicia a tarefa com a educadora ao lado', esperado: [{ source_id: 'rubrica' }] },
  { q: 'o que é exigido antes da primeira observação de uma criança recém-matriculada', esperado: [{ source_id: 'protocolo' }, { source_id: 'rubrica' }] },
  { q: 'o que acontece quando o responsável revoga o consentimento', esperado: [{ source_id: 'protocolo' }] },
  { q: 'por que o relatório do doador não pode usar verbos causais fortes', esperado: [{ source_id: 'doutrina' }] },
  { q: 'nenhuma média circula com menos de cinco crianças', esperado: [{ source_id: 'doutrina' }, { source_id: 'protocolo' }] },
  // filtro de faixa etária (COMPLETUDE-01): a consulta declara a faixa da turma
  { q: 'interações e brincadeiras como eixos estruturantes', faixa_etaria: '3-5', esperado: [{ source_id: 'bncc-ei' }] },
  { q: 'objetivos de conhecimento de matemática', faixa_etaria: '6-14', esperado: [{ source_id: 'bncc-ef' }] },
];

let hits = 0;
const excertos = [];
for (const c of CONSULTAS) {
  const top = buscar({ q: c.q, k: 5, faixa_etaria: c.faixa_etaria || null });
  excertos.push(...top.map(t => t.excerto));
  const hit = top.some(t => c.esperado.some(e =>
    t.source_id === e.source_id && (!e.secao || e.secao.test(t.secao) || e.secao.test(t.conteudo || ''))));
  if (hit) hits++;
  console.log(`  ${hit ? '\x1b[32m•\x1b[0m' : '\x1b[31m•\x1b[0m'} [${hit ? 'hit ' : 'MISS'}] ${c.q}` +
    (hit ? '' : `  → veio: ${top.map(t => t.source_id).join(', ') || 'nada'}`));

  // gate 2: toda citação devolvida aponta para chunk real
  for (const t of top) {
    if (!chunkExiste(t.chunk_id)) T(`citação órfã: chunk ${t.chunk_id}`, false);
  }
}
console.log();
T(`hit@5 = ${hits}/20 (gate: >= 14)`, hits >= 14);
T('100% das citações apontam para chunk existente', true); // falha teria sido registrada acima

// gate 3: cobertura pt-BR — heurística: acento OU stopword portuguesa no excerto
const ehPt = (t) => /[áàâãéêíóôõúç]/i.test(t) || /\b(de|da|do|que|para|com|uma|não)\b/i.test(t);
const ptOk = excertos.filter(ehPt).length;
T(`cobertura pt-BR dos excertos: ${ptOk}/${excertos.length} (gate: >= 90%)`,
  ptOk / Math.max(1, excertos.length) >= 0.9);

// gate 4: pseudonimização da consulta (COMPLETUDE-02) — nomes reais do roster
semear();
const nomes = all(`SELECT nome FROM crianca WHERE ativo = 1 LIMIT 20`).map(r => r.nome);
const alvo = nomes[3];
const { texto: anonima, substituicoes } = anonimizarTexto(
  `como ajudar ${alvo} com a agressividade na roda`, nomes);
T('a consulta anonimizada não contém o nome da criança',
  !anonima.includes(alvo.split(' ')[0]) && substituicoes >= 1, `(${anonima})`);
const rAnon = buscar({ q: anonima, k: 3 });
T('a busca executa sobre a consulta anonimizada sem erro', Array.isArray(rAnon));

fecharCorpus();
closeDb();
rmSync(dirTemp, { recursive: true, force: true });

console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m`);
process.exit(falhas ? 1 : 0);
