// Percurso — a memória de uso do Passo. Banco DERIVADO e próprio.
//
// POR QUE FORA DO BANCO PRINCIPAL: src/db.js derruba TODAS as tabelas quando a
// assinatura do DDL muda, e scripts/reset.mjs limpa. Aprendizado guardado lá
// morreria a cada mudança de esquema. O precedente correto já existe no
// produto: data/rag/corpus.db, com conexão própria (decisão 20).
//
// O QUE ENTRA: só o que a pessoa faz COM O PASSO — o que ele ofereceu, o que
// ela tocou, o que ela dispensou, e em que tela ela o abriu.
// O QUE NUNCA ENTRA: texto de pergunta, texto de resposta, transcrição, id de
// criança, id de turma, HORA (só o dia) e navegação fora do Passo. O
// vocabulário é FECHADO por código, não por convenção: `registrar()` lança em
// qualquer chave que não seja id do catálogo, tipo ou rota conhecida — um nome
// de criança não tem por onde virar chave.
//
// NASCE DESLIGADO. Num produto cujo padrão é tudo desligado (AI_ENABLED=0,
// som=0), a única coisa que grava algo sobre a PESSOA não pode ser a exceção
// que nasce ligada com o aviso enterrado numa seção que ela talvez nunca role.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hoje, addDias, diasEntre, erro } from '../domain.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PERFIL_DB = process.env.PERCURSO_PASSO_DB || join(RAIZ, 'data', 'passo', 'uso.db');

export const PASSO_PERFIL = !['0', 'false'].includes(
  String(process.env.PASSO_PERFIL ?? '').toLowerCase());

const MEIA_VIDA_DIAS = 21;
const RETENCAO_DIAS = 90;
const SILENCIO_DIAS = 14;

let db = null;
let purgadoEm = null;

function conectar() {
  if (db) return db;
  mkdirSync(dirname(PERFIL_DB), { recursive: true });
  db = new DatabaseSync(PERFIL_DB);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS uso (
      educador_id INTEGER NOT NULL,
      familia     TEXT NOT NULL CHECK (familia IN ('sugestao','tipo','tela')),
      chave       TEXT NOT NULL,
      evento      TEXT NOT NULL CHECK (evento IN ('mostrada','aceita','dispensada')),
      peso        REAL NOT NULL DEFAULT 0,
      n           INTEGER NOT NULL DEFAULT 0,
      dia_ultimo  TEXT NOT NULL,
      PRIMARY KEY (educador_id, familia, chave, evento)
    ) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS silenciada (
      educador_id INTEGER NOT NULL, sugestao_id TEXT NOT NULL,
      ate TEXT NOT NULL, criado_em TEXT NOT NULL,
      PRIMARY KEY (educador_id, sugestao_id)
    ) WITHOUT ROWID;
    -- Dedupe de 'mostrada' DENTRO do dia: quem abre o painel oito vezes não
    -- afunda a novidade de tudo que viu sem ter lido nada. É intra-dia por
    -- construção — guardar isso por 90 dias seria um diário de presença por
    -- pessoa, que este produto não tem e não vai passar a ter.
    CREATE TABLE IF NOT EXISTS mostrada_dia (
      educador_id INTEGER NOT NULL, sugestao_id TEXT NOT NULL, dia TEXT NOT NULL,
      PRIMARY KEY (educador_id, sugestao_id, dia)
    ) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS preferencia (
      educador_id   INTEGER PRIMARY KEY,
      aprender      INTEGER NOT NULL DEFAULT 0 CHECK (aprender IN (0,1)),
      resumo_do_dia INTEGER NOT NULL DEFAULT 1 CHECK (resumo_do_dia IN (0,1)),
      prefere_tipo  TEXT,
      convidado     INTEGER NOT NULL DEFAULT 0 CHECK (convidado IN (0,1)),
      atualizado_em TEXT NOT NULL
    ) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS ix_uso_purga ON uso(dia_ultimo);
  `);
  return db;
}

/** Purga na abertura, uma vez por dia por processo. */
function purgar(ref) {
  if (purgadoEm === ref) return;
  purgadoEm = ref;
  const d = conectar();
  const limite = addDias(ref, -RETENCAO_DIAS);
  d.prepare(`DELETE FROM uso WHERE dia_ultimo < ?`).run(limite);
  d.prepare(`DELETE FROM silenciada WHERE ate < ?`).run(ref);
  // mostrada_dia é intra-dia: nada dela sobrevive à virada do dia.
  d.prepare(`DELETE FROM mostrada_dia WHERE dia < ?`).run(ref);
}

const decair = (peso, dia, ref) =>
  peso * Math.pow(0.5, Math.max(0, diasEntre(dia, ref)) / MEIA_VIDA_DIAS);

// --------------------------------------------------------------------------
// Vocabulário fechado — a fronteira que impede um nome de virar chave.
// --------------------------------------------------------------------------
const FORMA = /^[a-z0-9_.#/\-:]{1,64}$/i;
let VALIDA = null;
export function ligarVocabulario({ ids, tipos, rotas }) {
  VALIDA = {
    sugestao: (v) => ids.has(v) || v.startsWith('guia:'),
    tipo: (v) => tipos.includes(v),
    tela: (v) => rotas.has(v) || v === '',
  };
}

/** A fronteira, num lugar só: TODA escrita passa por aqui, sem exceção. */
function validarChave(familia, chave) {
  if (!VALIDA) throw erro(422, 'Vocabulário do Passo não inicializado.');
  if (!FORMA.test(String(chave ?? '')) || !VALIDA[familia]?.(String(chave)))
    throw erro(422, 'Chave de uso fora do vocabulário do Passo.');
}

export function preferenciaDe(educadorId) {
  if (!PASSO_PERFIL) return { aprender: 0, resumo_do_dia: 1, prefere_tipo: null, convidado: 1 };
  const d = conectar();
  const r = d.prepare(`SELECT * FROM preferencia WHERE educador_id = ?`).get(educadorId);
  return r ?? { educador_id: educadorId, aprender: 0, resumo_do_dia: 1, prefere_tipo: null, convidado: 0 };
}

export function salvarPreferencia(educadorId, mudanca = {}) {
  if (!PASSO_PERFIL) throw erro(422, 'A memória do Passo está desligada nesta instalação.');
  const atual = preferenciaDe(educadorId);
  const tipos = ['acao', 'pergunta', 'aprimoramento', 'duvida'];
  const nova = {
    aprender: mudanca.aprender == null ? atual.aprender : (mudanca.aprender ? 1 : 0),
    resumo_do_dia: mudanca.resumo_do_dia == null ? atual.resumo_do_dia : (mudanca.resumo_do_dia ? 1 : 0),
    prefere_tipo: mudanca.prefere_tipo === undefined ? (atual.prefere_tipo ?? null)
      : (tipos.includes(mudanca.prefere_tipo) ? mudanca.prefere_tipo : null),
    convidado: mudanca.convidado == null ? atual.convidado : (mudanca.convidado ? 1 : 0),
  };
  conectar().prepare(
    `INSERT INTO preferencia (educador_id, aprender, resumo_do_dia, prefere_tipo, convidado, atualizado_em)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(educador_id) DO UPDATE SET aprender=excluded.aprender,
       resumo_do_dia=excluded.resumo_do_dia, prefere_tipo=excluded.prefere_tipo,
       convidado=excluded.convidado, atualizado_em=excluded.atualizado_em`)
    // DIA, nunca hora — a política que a tela mostra diz literalmente "não
    // guardo hora, só o dia", e `toISOString()` a tornava falsa.
    .run(educadorId, nova.aprender, nova.resumo_do_dia, nova.prefere_tipo, nova.convidado, hoje());
  // Desligar o aprendizado APAGA o que já foi aprendido. "Pare de aprender" e
  // "esqueça o que aprendeu" são a mesma expectativa para quem desliga.
  if (!nova.aprender && atual.aprender) apagarMemoria(educadorId);
  return { educador_id: educadorId, ...nova };
}

/** Registra um evento. No-op silencioso quando o aprendizado está desligado. */
export function registrar(educadorId, familia, chave, evento, ref = hoje()) {
  if (!PASSO_PERFIL) return { ok: true, gravado: false };
  if (!VALIDA) return { ok: true, gravado: false };
  if (!['mostrada', 'aceita', 'dispensada'].includes(evento))
    throw erro(422, 'Evento fora do vocabulário do Passo.');
  validarChave(familia, chave);
  if (!preferenciaDe(educadorId).aprender) return { ok: true, gravado: false };

  purgar(ref);
  const d = conectar();
  // 'mostrada' conta UMA vez por dia — e para as TRÊS famílias. Cobrindo só
  // `sugestao`, cada repintura do painel (e o refinamento pelo modelo é uma)
  // inflava `tipo:*:mostrada` e `tela:*:mostrada`, que entram no ranking pelo
  // termo de afinidade de tipo: a memória da pessoa era afogada por ruído do
  // próprio cliente.
  if (evento === 'mostrada') {
    const marca = `${familia}:${chave}`;
    const ja = d.prepare(`SELECT 1 x FROM mostrada_dia WHERE educador_id=? AND sugestao_id=? AND dia=?`)
      .get(educadorId, marca, ref);
    if (ja) return { ok: true, gravado: false };
    d.prepare(`INSERT OR IGNORE INTO mostrada_dia (educador_id, sugestao_id, dia) VALUES (?,?,?)`)
      .run(educadorId, marca, ref);
  }
  const atual = d.prepare(
    `SELECT peso, n, dia_ultimo FROM uso WHERE educador_id=? AND familia=? AND chave=? AND evento=?`)
    .get(educadorId, familia, chave, evento);
  const peso = (atual ? decair(atual.peso, atual.dia_ultimo, ref) : 0) + 1;
  d.prepare(
    `INSERT INTO uso (educador_id, familia, chave, evento, peso, n, dia_ultimo) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(educador_id, familia, chave, evento) DO UPDATE
       SET peso=excluded.peso, n=uso.n+1, dia_ultimo=excluded.dia_ultimo`)
    .run(educadorId, familia, chave, evento, peso, 1, ref);
  return { ok: true, gravado: true };
}

/** "Hoje não". Silêncio SEMPRE expira — nunca existe "nunca mais me mostre". */
export function silenciar(educadorId, sugestaoId, { nucleo = false, ref = hoje() } = {}) {
  if (!PASSO_PERFIL) return { ate: ref };
  // A MESMA fronteira de registrar(), e ela precisa estar AQUI: silenciar()
  // gravava string livre e passava por fora do vocabulário fechado. Um POST
  // com id = "Joao Pedro da Silva" respondia 422 (porque registrar() lançava
  // depois) e mesmo assim deixava a linha gravada, visível na tela de memória
  // por 14 dias. O 422 mentia: a escrita já tinha acontecido.
  validarChave('sugestao', sugestaoId);
  const ate = nucleo ? ref : addDias(ref, SILENCIO_DIAS);
  conectar().prepare(
    `INSERT INTO silenciada (educador_id, sugestao_id, ate, criado_em) VALUES (?,?,?,?)
     ON CONFLICT(educador_id, sugestao_id) DO UPDATE SET ate=excluded.ate, criado_em=excluded.criado_em`)
    .run(educadorId, sugestaoId, ate, ref);   // DIA, nunca hora
  return { ate };
}

/** Pesos para o ranking. `{}` quando desligado — o ranking fica idêntico ao puro. */
export function pesosDe(educadorId, ref = hoje()) {
  if (!PASSO_PERFIL || !preferenciaDe(educadorId).aprender) return {};
  purgar(ref);
  const out = {};
  for (const r of conectar().prepare(`SELECT familia, chave, evento, peso, dia_ultimo FROM uso WHERE educador_id = ?`).all(educadorId))
    out[`${r.familia}:${r.chave}:${r.evento}`] = decair(r.peso, r.dia_ultimo, ref);
  return out;
}

export function silenciadasDe(educadorId, ref = hoje()) {
  if (!PASSO_PERFIL) return new Set();
  purgar(ref);
  return new Set(conectar().prepare(
    `SELECT sugestao_id FROM silenciada WHERE educador_id = ? AND ate >= ?`).all(educadorId, ref)
    .map(r => r.sugestao_id));
}

/** O que a pessoa vê quando pergunta "o que você sabe de mim?". */
export function memoriaDe(educadorId, ref = hoje()) {
  const prefs = preferenciaDe(educadorId);
  if (!PASSO_PERFIL) return { ligada: false, ...prefs, linhas: [], silenciadas: [] };
  purgar(ref);
  const d = conectar();
  return {
    ligada: true,
    aprender: !!prefs.aprender, resumo_do_dia: !!prefs.resumo_do_dia,
    prefere_tipo: prefs.prefere_tipo ?? null, convidado: !!prefs.convidado,
    linhas: d.prepare(
      `SELECT familia, chave, evento, n FROM uso WHERE educador_id = ? ORDER BY n DESC LIMIT 40`).all(educadorId),
    silenciadas: d.prepare(
      `SELECT sugestao_id, ate FROM silenciada WHERE educador_id = ? AND ate >= ?`).all(educadorId, ref),
    politica: `Eu conto só o que você faz comigo: o que eu te ofereci, o que você tocou, o que você dispensou `
      + `e em que telas você me abriu. Não observo sua navegação no Percurso, não meço o seu tempo, não guardo `
      + `o texto das suas perguntas nem nome de criança nenhuma, e não guardo hora — só o dia. `
      + `Cada coisa que eu aprendi some ${RETENCAO_DIAS} dias depois da última vez que aconteceu.`,
  };
}

export function apagarMemoria(educadorId) {
  if (!PASSO_PERFIL) return { apagados: 0 };
  const d = conectar();
  let n = 0;
  for (const t of ['uso', 'silenciada', 'mostrada_dia'])
    n += d.prepare(`DELETE FROM ${t} WHERE educador_id = ?`).run(educadorId).changes ?? 0;
  return { apagados: n, aviso: 'Apaguei o que eu sabia do seu uso.' };
}

export function fecharPerfil() { if (db) { db.close(); db = null; purgadoEm = null; } }
