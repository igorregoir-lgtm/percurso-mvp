// Percurso — busca no corpus RAG (Fase 1 do plano de IA).
//
// FTS5/BM25 sobre data/rag/corpus.db (construído por src/rag/ingest.mjs).
// Lexical por decisão de gate: embeddings/híbrida/reranking só entram se a
// medição mostrar que o FTS5 não basta (plano de arquitetura, §1.2).
//
// Morfologia pt-BR: tokens com 4+ letras entram também como consulta de
// prefixo ("leitura"* casa "leituras"); acentos são normalizados pelo
// tokenizer (unicode61 remove_diacritics 2) dos dois lados.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CORPUS_DB = process.env.PERCURSO_RAG_DB || join(RAIZ, 'data', 'rag', 'corpus.db');

let db = null;
let abertoEm = null; // mtime do arquivo quando o handle foi aberto
export function corpusDisponivel() { return existsSync(CORPUS_DB); }

function abrir() {
  if (!corpusDisponivel()) {
    fecharCorpus();
    const e = new Error('Corpus RAG não construído. Rode: node src/rag/ingest.mjs');
    e.status = 503;
    throw e;
  }
  // Reabre quando o ingest reconstruiu o arquivo (rm + recria): um handle
  // preso ao inode antigo continuaria lendo o corpus deletado para sempre.
  const mtime = statSync(CORPUS_DB).mtimeMs;
  if (db && abertoEm !== mtime) fecharCorpus();
  if (db) return db;
  db = new DatabaseSync(CORPUS_DB, { readOnly: true });
  abertoEm = mtime;
  return db;
}
export function fecharCorpus() {
  if (db) { try { db.close(); } catch {} db = null; abertoEm = null; }
}

function consultaFts(q) {
  // Só palavras entram; operadores/aspas do usuário nunca chegam crus ao FTS5.
  const tokens = (String(q ?? '').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).slice(0, 12);
  if (!tokens.length) return null;
  return tokens
    .map(t => t.length >= 4 ? `("${t}" OR "${t}"*)` : `"${t}"`)
    .join(' OR ');
}

/**
 * Busca top-k com filtros. A query deve chegar AQUI já anonimizada (a rota e o
 * copilot aplicam anonimizarTexto antes) — esta camada não conhece nomes.
 * @returns {Array<{chunk_id, source_id, titulo, secao, tema, faixa_etaria, excerto, conteudo}>}
 */
export function buscar({ q, k = 5, source_id = null, tema = null, faixa_etaria = null }) {
  const d = abrir();
  if (!Number.isFinite(Number(k))) k = 5; // 'k=abc' não pode virar LIMIT NaN (500)
  k = Math.trunc(Number(k));
  const match = consultaFts(q);
  if (!match) return [];
  const cond = [];
  const p = [match];
  if (source_id) { cond.push(`c.source_id = ?`); p.push(source_id); }
  if (tema) { cond.push(`c.tema = ?`); p.push(tema); }
  // Filtro de faixa: casa a faixa exata OU material geral (que serve a todas).
  if (faixa_etaria) { cond.push(`(c.faixa_etaria = ? OR c.faixa_etaria = 'geral')`); p.push(faixa_etaria); }
  p.push(Math.min(Math.max(1, k), 20));
  const linhas = d.prepare(`
    SELECT c.id AS chunk_id, c.source_id, c.titulo, c.secao, c.tema, c.faixa_etaria,
           c.conteudo,
           snippet(chunk_fts, 0, '«', '»', ' … ', 20) AS excerto,
           bm25(chunk_fts, 1.0, 0.6, 0.4) AS pontos
      FROM chunk_fts
      JOIN chunk c ON c.id = chunk_fts.rowid
     WHERE chunk_fts MATCH ?
       ${cond.length ? 'AND ' + cond.join(' AND ') : ''}
     ORDER BY pontos
     LIMIT ?`).all(...p);
  return linhas.map(l => ({ ...l, conteudo: l.conteudo }));
}

/** Verificador de citação: todo ID citado precisa apontar para chunk real. */
export function chunkExiste(chunkId) {
  const d = abrir();
  return !!d.prepare(`SELECT 1 x FROM chunk WHERE id = ?`).get(Number(chunkId));
}

/** Trechos por id — para montar o prompt do copilot com os identificadores. */
export function trechosPorIds(ids) {
  const d = abrir();
  return ids.map(i => d.prepare(
    `SELECT id AS chunk_id, source_id, titulo, secao, conteudo FROM chunk WHERE id = ?`).get(Number(i)))
    .filter(Boolean);
}

export function infoCorpus() {
  const d = abrir();
  const meta = Object.fromEntries(d.prepare(`SELECT chave, valor FROM meta`).all().map(m => [m.chave, m.valor]));
  const fontes = d.prepare(`SELECT source_id, titulo, COUNT(*) AS chunks FROM chunk GROUP BY source_id ORDER BY source_id`).all();
  return { ...meta, fontes };
}
