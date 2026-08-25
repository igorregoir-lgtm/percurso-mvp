// Percurso — ingestão do corpus RAG (Fase 1 do plano de IA).
//
// Lê data/rag/manifest.json, valida a admissão de cada fonte (hash do texto
// canônico, campos obrigatórios, contains_child_data) e reconstrói DO ZERO o
// índice data/rag/corpus.db (SQLite + FTS5). Determinístico: mesmas fontes →
// mesmo banco (fontes e chunks ordenados por chave estável antes da inserção).
//
// O corpus.db NÃO entra no git — quem precisar dele roda este script (CI faz
// isso). O banco principal (data/percurso.db) NUNCA ganha tabelas FTS5 — a
// migração por assinatura de DDL (drop/recreate) não sobrevive às shadow
// tables; o RAG vive neste arquivo separado.
//
// Uso:  node src/rag/ingest.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAG = join(RAIZ, 'data', 'rag');
export const CORPUS_DB = process.env.PERCURSO_RAG_DB || join(RAG, 'corpus.db');

const ALVO_PALAVRAS = 300;   // ~300-500 tokens pt-BR ≈ 200-350 palavras; alvo no meio
const MAX_PALAVRAS = 350;
const SOBREPOSICAO = 40;     // palavras herdadas do chunk anterior num corte forçado

const OBRIGATORIOS = ['source_id', 'titulo', 'source_url', 'license_spdx', 'license_evidence',
  'version_date', 'arquivo_canonico', 'hash_canonico', 'allowed_use', 'attribution',
  'pii_review', 'reviewer', 'destination', 'removal_contact', 'tema', 'faixa_etaria'];

const sha = (t) => createHash('sha256').update(t).digest('hex');
const contarPalavras = (t) => (t.match(/\S+/g) || []).length;

function secoesDe(texto, modo) {
  // Divide o texto canônico em seções nomeadas — a seção é o que a citação e o
  // gabarito do rag-test usam (estável entre ajustes de chunking).
  const linhas = texto.split('\n');
  const secoes = [];
  let atual = { rotulo: 'preâmbulo', linhas: [] };
  const ehCabecalho = (l) => {
    if (modo === 'artigo') return /^Art\.\s*\d+/.test(l.trim());
    // md: cabeçalhos markdown; txt (BNCC): linha numerada de capítulo/seção OU
    // linha inteira em caixa alta com 3+ palavras.
    const t = l.trim();
    if (/^#{1,4}\s+\S/.test(t)) return true;
    if (/^\d+(\.\d+)*\.?\s+[A-ZÀ-Ú]/.test(t) && t.length < 90) return true;
    if (/^[A-ZÀ-Ú][A-ZÀ-Ú0-9 ,–—-]{8,80}$/.test(t) && t.split(/\s+/).length >= 2) return true;
    return false;
  };
  for (const l of linhas) {
    if (ehCabecalho(l)) {
      if (atual.linhas.some(x => x.trim())) secoes.push(atual);
      const rotulo = modo === 'artigo'
        ? (l.trim().match(/^Art\.\s*\d+[ºA-Za-z.-]*/)?.[0] ?? l.trim().slice(0, 80))
        : l.trim().replace(/^#+\s*/, '').slice(0, 100);
      atual = { rotulo, linhas: [l] };
    } else {
      atual.linhas.push(l);
    }
  }
  if (atual.linhas.some(x => x.trim())) secoes.push(atual);
  return secoes.map(s => ({ rotulo: s.rotulo, texto: s.linhas.join('\n').trim() }));
}

function chunksDe(secao) {
  // Empacota parágrafos da seção em janelas de ~ALVO_PALAVRAS; parágrafo
  // gigante é fatiado por palavras com sobreposição fixa. Determinístico.
  const paragrafos = secao.texto.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let atual = [];
  let palavras = 0;
  const fechar = () => {
    if (palavras > 0) chunks.push(atual.join('\n\n'));
    atual = []; palavras = 0;
  };
  for (const p of paragrafos) {
    const n = contarPalavras(p);
    if (n > MAX_PALAVRAS) {
      fechar();
      const todas = p.match(/\S+/g) || [];
      for (let i = 0; i < todas.length; i += ALVO_PALAVRAS - SOBREPOSICAO) {
        chunks.push(todas.slice(i, i + ALVO_PALAVRAS).join(' '));
        if (i + ALVO_PALAVRAS >= todas.length) break;
      }
      continue;
    }
    if (palavras + n > MAX_PALAVRAS) fechar();
    atual.push(p); palavras += n;
  }
  fechar();
  return chunks.filter(c => contarPalavras(c) >= 15); // migalha não vira chunk citável
}

export function ingerir({ silencioso = false } = {}) {
  const manifest = JSON.parse(readFileSync(join(RAG, 'manifest.json'), 'utf8'));
  const log = (...a) => { if (!silencioso) console.log(...a); };

  for (const suf of ['', '-wal', '-shm']) { try { rmSync(CORPUS_DB + suf); } catch {} }
  const db = new DatabaseSync(CORPUS_DB);
  db.exec(`
    CREATE TABLE meta (chave TEXT PRIMARY KEY, valor TEXT);
    CREATE TABLE chunk (
      id INTEGER PRIMARY KEY,
      source_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      secao TEXT NOT NULL,
      tema TEXT NOT NULL,
      faixa_etaria TEXT NOT NULL,
      licenca TEXT NOT NULL,
      versao TEXT NOT NULL,
      hash_fonte TEXT NOT NULL,
      palavras INTEGER NOT NULL,
      conteudo TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE chunk_fts USING fts5(
      conteudo, secao, titulo,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `);

  const fontes = manifest.fontes
    .filter(f => f.destination === 'rag')
    .sort((a, b) => a.source_id.localeCompare(b.source_id, 'en'));
  const puladas = manifest.fontes.filter(f => f.destination !== 'rag');
  for (const f of puladas) log(`  (não indexada: ${f.source_id} — destino "${f.destination}")`);

  let id = 0;
  const resumo = [];
  for (const f of fontes) {
    // ---- gates de admissão: sem metadado completo, NÃO indexa -------------
    const faltando = OBRIGATORIOS.filter(c => f[c] == null || f[c] === '');
    if (faltando.length) throw new Error(`Fonte ${f.source_id}: campos de admissão faltando: ${faltando.join(', ')}`);
    if (f.contains_child_data === true) throw new Error(`Fonte ${f.source_id}: contains_child_data=true — bloqueada SEMPRE.`);
    const caminho = join(RAG, f.arquivo_canonico);
    if (!existsSync(caminho)) throw new Error(`Fonte ${f.source_id}: texto canônico ausente (${f.arquivo_canonico}).`);
    const texto = readFileSync(caminho, 'utf8');
    const hash = sha(texto);
    if (hash !== f.hash_canonico)
      throw new Error(`Fonte ${f.source_id}: hash do texto canônico não confere com o manifest.\n  manifest: ${f.hash_canonico}\n  arquivo:  ${hash}\nRode node src/rag/preparar-fontes.mjs e atualize o manifest conscientemente.`);

    // ---- seções → chunks, em ordem estável --------------------------------
    let n = 0;
    for (const secao of secoesDe(texto, f.secao_por === 'artigo' ? 'artigo' : 'titulo')) {
      for (const conteudo of chunksDe(secao)) {
        id += 1; n += 1;
        db.prepare(`INSERT INTO chunk (id, source_id, titulo, secao, tema, faixa_etaria, licenca, versao, hash_fonte, palavras, conteudo)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
          .run(id, f.source_id, f.titulo, secao.rotulo, f.tema, f.faixa_etaria,
               f.license_spdx, String(f.version_date), hash, contarPalavras(conteudo), conteudo);
        db.prepare(`INSERT INTO chunk_fts (rowid, conteudo, secao, titulo) VALUES (?,?,?,?)`)
          .run(id, conteudo, secao.rotulo, f.titulo);
      }
    }
    resumo.push({ source_id: f.source_id, chunks: n });
    log(`  ${f.source_id}: ${n} chunks`);
  }

  db.prepare(`INSERT INTO meta (chave, valor) VALUES ('versao_corpus', ?)`).run(manifest.versao_corpus);
  db.prepare(`INSERT INTO meta (chave, valor) VALUES ('total_chunks', ?)`).run(String(id));
  db.close();
  log(`\nÍndice reconstruído: ${CORPUS_DB} (${id} chunks, corpus ${manifest.versao_corpus})`);
  return { total: id, fontes: resumo };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  ingerir();
}
