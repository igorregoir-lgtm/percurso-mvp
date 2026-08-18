// Percurso — camada de banco.
// SQLite embutido do proprio Node (node:sqlite). Nenhuma dependencia externa,
// nenhuma licenca recorrente: o banco inteiro e um arquivo em data/percurso.db.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DB_PATH = process.env.PERCURSO_DB || join(ROOT, 'data', 'percurso.db');

let db = null;

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  criarEsquema(db);
  return db;
}

export function closeDb() {
  if (db) { db.close(); db = null; }
}

// --------------------------------------------------------------------------
// Esquema. Uma decisao de modelagem organiza tudo: CRIANCA e' a entidade unica
// e MATRICULA e' a relacao crianca x programa x periodo. E' a resposta a
// pergunta 1 do bloco 7 do dossie ("120 e' crianca ou matricula?").
// --------------------------------------------------------------------------
function criarEsquema(d) {
  d.exec(`
  CREATE TABLE IF NOT EXISTS educador (
    id       INTEGER PRIMARY KEY,
    nome     TEXT NOT NULL,
    apelido  TEXT NOT NULL,
    papel    TEXT NOT NULL CHECK (papel IN ('educador','coordenacao'))
  );

  CREATE TABLE IF NOT EXISTS programa (
    id        INTEGER PRIMARY KEY,
    nome      TEXT NOT NULL UNIQUE,
    faixa     TEXT NOT NULL,
    cadencia  TEXT NOT NULL,
    no_escopo INTEGER NOT NULL DEFAULT 1,
    nota      TEXT
  );

  CREATE TABLE IF NOT EXISTS turma (
    id          INTEGER PRIMARY KEY,
    programa_id INTEGER NOT NULL REFERENCES programa(id),
    nome        TEXT NOT NULL,
    turno       TEXT NOT NULL,
    educador_id INTEGER REFERENCES educador(id)
  );

  CREATE TABLE IF NOT EXISTS crianca (
    id           INTEGER PRIMARY KEY,
    codigo       TEXT NOT NULL UNIQUE,
    nome         TEXT NOT NULL,
    nascimento   TEXT NOT NULL,
    responsavel  TEXT NOT NULL,
    -- Aspiracao declarada no Laboratorio de Sonhos (metodologia do Instituto,
    -- bloco 3 do dossie): a crianca nomeia o que quer ser; o ciclo se repete
    -- a cada ano. Individual fica dentro; para fora, so o agregado por area.
    aspiracao    TEXT,
    ativo        INTEGER NOT NULL DEFAULT 1,
    criado_em    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matricula (
    id          INTEGER PRIMARY KEY,
    crianca_id  INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
    programa_id INTEGER NOT NULL REFERENCES programa(id),
    turma_id    INTEGER REFERENCES turma(id),
    entrada     TEXT NOT NULL,
    saida       TEXT,
    status      TEXT NOT NULL CHECK (status IN ('ativa','encerrada')),
    UNIQUE (crianca_id, programa_id, entrada)
  );

  CREATE TABLE IF NOT EXISTS encontro (
    id               INTEGER PRIMARY KEY,
    turma_id         INTEGER NOT NULL REFERENCES turma(id),
    data             TEXT NOT NULL,
    registrado_por   INTEGER REFERENCES educador(id),
    registrado_em    TEXT,
    -- Quanto tempo a chamada levou, em segundos. E' a metrica do experimento de
    -- validacao do modulo: sucesso = tempo medio de registro abaixo de 2 minutos.
    duracao_segundos INTEGER,
    UNIQUE (turma_id, data)
  );

  CREATE TABLE IF NOT EXISTS presenca (
    id          INTEGER PRIMARY KEY,
    encontro_id INTEGER NOT NULL REFERENCES encontro(id) ON DELETE CASCADE,
    crianca_id  INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
    status      TEXT NOT NULL CHECK (status IN ('P','F')),
    UNIQUE (encontro_id, crianca_id)
  );

  CREATE TABLE IF NOT EXISTS ciclo (
    id     INTEGER PRIMARY KEY,
    nome   TEXT NOT NULL,
    ano    INTEGER NOT NULL,
    ordem  INTEGER NOT NULL,
    inicio TEXT NOT NULL,
    fim    TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('aberto','fechado')),
    UNIQUE (ano, ordem)
  );

  CREATE TABLE IF NOT EXISTS dimensao (
    id        INTEGER PRIMARY KEY,
    codigo    TEXT NOT NULL UNIQUE,
    nome      TEXT NOT NULL,
    descricao TEXT NOT NULL,
    ordem     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ancora (
    id          INTEGER PRIMARY KEY,
    dimensao_id INTEGER NOT NULL REFERENCES dimensao(id) ON DELETE CASCADE,
    nivel       INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
    texto       TEXT NOT NULL,
    UNIQUE (dimensao_id, nivel)
  );

  CREATE TABLE IF NOT EXISTS observacao (
    id            INTEGER PRIMARY KEY,
    ciclo_id      INTEGER NOT NULL REFERENCES ciclo(id),
    crianca_id    INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
    educador_id   INTEGER NOT NULL REFERENCES educador(id),
    status        TEXT NOT NULL CHECK (status IN ('rascunho','concluida')),
    nota_livre    TEXT,
    atualizado_em TEXT NOT NULL,
    concluido_em  TEXT,
    UNIQUE (ciclo_id, crianca_id)
  );

  CREATE TABLE IF NOT EXISTS observacao_item (
    id            INTEGER PRIMARY KEY,
    observacao_id INTEGER NOT NULL REFERENCES observacao(id) ON DELETE CASCADE,
    dimensao_id   INTEGER NOT NULL REFERENCES dimensao(id),
    nivel         INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
    UNIQUE (observacao_id, dimensao_id)
  );

  -- Regra 3 do bloco 6: todo campo declara base legal, titular, acesso e retencao.
  CREATE TABLE IF NOT EXISTS governanca_campo (
    campo               TEXT PRIMARY KEY,
    rotulo              TEXT NOT NULL,
    base_legal          TEXT NOT NULL,
    titular             TEXT NOT NULL,
    acesso              TEXT NOT NULL,
    retencao            TEXT NOT NULL,
    exige_consentimento INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS consentimento (
    id            INTEGER PRIMARY KEY,
    crianca_id    INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
    campo         TEXT NOT NULL REFERENCES governanca_campo(campo),
    status        TEXT NOT NULL CHECK (status IN ('ativo','pendente','revogado')),
    responsavel   TEXT,
    data_registro TEXT,
    UNIQUE (crianca_id, campo)
  );

  CREATE TABLE IF NOT EXISTS alerta (
    id            INTEGER PRIMARY KEY,
    crianca_id    INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL,
    detalhe       TEXT NOT NULL,
    criado_em     TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('aberto','em_acompanhamento','resolvido')),
    tratativa     TEXT,
    atualizado_em TEXT,
    UNIQUE (crianca_id, tipo)
  );

  CREATE TABLE IF NOT EXISTS sintese (
    id             INTEGER PRIMARY KEY,
    ciclo_id       INTEGER NOT NULL REFERENCES ciclo(id),
    programa_id    INTEGER REFERENCES programa(id),
    texto          TEXT NOT NULL,
    numeros_json   TEXT NOT NULL,
    revisor_status TEXT NOT NULL,
    revisor_notas  TEXT,
    status         TEXT NOT NULL CHECK (status IN ('rascunho','aprovada')),
    gerado_em      TEXT NOT NULL,
    aprovado_por   INTEGER REFERENCES educador(id),
    aprovado_em    TEXT,
    UNIQUE (ciclo_id, programa_id)
  );

  -- Anti-abandono: registra atividade para reconhecer retomada apos lapso.
  CREATE TABLE IF NOT EXISTS atividade (
    id          INTEGER PRIMARY KEY,
    educador_id INTEGER NOT NULL REFERENCES educador(id) ON DELETE CASCADE,
    data        TEXT NOT NULL,
    tipo        TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS ix_presenca_crianca ON presenca(crianca_id);
  CREATE INDEX IF NOT EXISTS ix_encontro_turma   ON encontro(turma_id, data);
  CREATE INDEX IF NOT EXISTS ix_matricula_prog   ON matricula(programa_id, status);
  CREATE INDEX IF NOT EXISTS ix_obs_ciclo        ON observacao(ciclo_id, status);
  CREATE INDEX IF NOT EXISTS ix_atividade_edu    ON atividade(educador_id, data);
  `);
}

// Helpers finos sobre o driver -------------------------------------------------
export const all = (sql, ...p) => getDb().prepare(sql).all(...p);
export const get = (sql, ...p) => getDb().prepare(sql).get(...p);
export const run = (sql, ...p) => getDb().prepare(sql).run(...p);
export const tx = (fn) => {
  const d = getDb();
  d.exec('BEGIN');
  try { const r = fn(); d.exec('COMMIT'); return r; }
  catch (e) { d.exec('ROLLBACK'); throw e; }
};
