// Percurso — camada de banco.
// SQLite embutido do proprio Node (node:sqlite). Nenhuma dependencia externa,
// nenhuma licenca recorrente: o banco inteiro e um arquivo em data/percurso.db.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DB_PATH = process.env.PERCURSO_DB || join(ROOT, 'data', 'percurso.db');

// Versao legivel do esquema, para documentacao e handover.
export const ESQUEMA_VERSAO = 2;

// GUARDA: nenhuma virtual table FTS5 neste banco — a migracao por assinatura
// (drop de todas as tabelas + recriacao) nao sobrevive as shadow tables do
// FTS. O RAG vive em data/rag/corpus.db, derivado e reconstrucao propria
// (decisao 20; src/rag/ingest.mjs).

let db = null;

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  // Migracao: todo dado do Percurso e' sintetico e a semeadura e' deterministica,
  // entao a estrategia mais segura e' recriar quando o esquema muda. A versao
  // gravada e' a ASSINATURA DO PROPRIO DDL — assim nao ha como esquecer de
  // incrementar um numero e ficar com banco velho carimbado de novo. Banco novo
  // chega com 0 e o drop e' inofensivo (nao ha tabela).
  // Antes de operar com dado real isto vira migracao incremental (decisao 14).
  const versao = db.prepare('PRAGMA user_version').get().user_version;
  if (versao !== ASSINATURA) {
    derrubarEsquema(db);
    criarEsquema(db);
    db.exec(`PRAGMA user_version = ${ASSINATURA};`);
  }
  return db;
}

// Hash 31 bits estavel do texto do esquema (djb2). Nao e' criptografico: so
// precisa mudar quando o DDL muda.
function assinar(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
  return h % 2147483647;
}

function derrubarEsquema(d) {
  d.exec('PRAGMA foreign_keys = OFF;');
  for (const t of d.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all())
    d.exec(`DROP TABLE IF EXISTS "${t.name}";`);
  d.exec('PRAGMA foreign_keys = ON;');
}

export function closeDb() {
  if (db) { db.close(); db = null; }
}

// --------------------------------------------------------------------------
// Esquema. Uma decisao de modelagem organiza tudo: CRIANCA e' a entidade unica
// e MATRICULA e' a relacao crianca x programa x periodo. E' a resposta a
// pergunta 1 do bloco 7 do dossie ("120 e' crianca ou matricula?").
// --------------------------------------------------------------------------
const ESQUEMA_SQL = `
  CREATE TABLE IF NOT EXISTS educador (
    id       INTEGER PRIMARY KEY,
    nome     TEXT NOT NULL,
    apelido  TEXT NOT NULL,
    papel    TEXT NOT NULL CHECK (papel IN ('educador','profissional','coordenacao','diretoria')),
    -- Ninguem e' apagado deste banco. Quem sai do pipeline ganha data aqui e
    -- some das listas vivas; o que ela registrou continua de pe' e assinado
    -- com o nome dela (decisao 30). NULL = esta' na ativa.
    -- A crianca ja tinha o equivalente desde a v1: crianca.ativo mais
    -- matricula.saida. Aqui a coluna e' data, nao booleano, porque para
    -- pessoa da equipe QUANDO saiu e' a pergunta que se faz depois.
    arquivado_em TEXT
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


  -- ========================================================================
  -- v2 — folha do dia, camada de voz, exposicao, pauta e saida para o doador.
  -- ========================================================================

  -- Aspiracao declarada no Laboratorio de Sonhos (metodologia do Instituto,
  -- bloco 3 do dossie): a crianca nomeia o que quer ser. Individual fica dentro;
  -- para fora, so o agregado por area (score de exposicao).
  CREATE TABLE IF NOT EXISTS aspiracao (
    id            INTEGER PRIMARY KEY,
    crianca_id    INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
    area          TEXT NOT NULL,
    declarada_em  TEXT NOT NULL,
    UNIQUE (crianca_id, area)
  );

  -- Folha do dia: o registro E' DA TURMA. Nao existe campo sobre crianca
  -- nomeada aqui — a linha "o que cada crianca fez nao entra aqui" e' regra
  -- de esquema, nao so de copy.
  CREATE TABLE IF NOT EXISTS folha (
    id                INTEGER PRIMARY KEY,
    encontro_id       INTEGER NOT NULL UNIQUE REFERENCES encontro(id) ON DELETE CASCADE,
    atividade         TEXT NOT NULL,
    area_tematica     TEXT NOT NULL,
    pediram_ajuda     INTEGER NOT NULL DEFAULT 0 CHECK (pediram_ajuda BETWEEN 0 AND 30),
    origem            TEXT NOT NULL CHECK (origem IN ('voz','manual')),
    -- Confianca devolvida pelo extrator e quantos campos a educadora corrigiu na
    -- confirmacao: e' a metrica-chave de qualidade do agente (07-SCORES).
    confianca         REAL,
    campos_sugeridos  INTEGER NOT NULL DEFAULT 0,
    campos_editados   INTEGER NOT NULL DEFAULT 0,
    -- Marca que a fala continha material fora do perimetro. Guarda o FATO de
    -- ter havido exclusao, jamais o conteudo excluido.
    conteudo_excluido INTEGER NOT NULL DEFAULT 0,
    -- Decisao 31 (campo, 29/08/2026): o registro de vivencia. Procedimento e
    -- objetivo em lista fechada (a psicologa registra O QUE FEZ, no padrao do
    -- conselho) e o check-in de grupo — CONTAGENS da turma, nunca quem. NULL =
    -- nao registrado (folha anterior a esta versao, ou campo nao informado).
    procedimento      TEXT,
    objetivo          TEXT,
    ajudaram_sem_pedir               INTEGER CHECK (ajudaram_sem_pedir IS NULL OR ajudaram_sem_pedir BETWEEN 0 AND 30),
    participaram_inteiro             INTEGER CHECK (participaram_inteiro IS NULL OR participaram_inteiro BETWEEN 0 AND 30),
    conflitos                        INTEGER CHECK (conflitos IS NULL OR conflitos BETWEEN 0 AND 30),
    conflitos_resolvidos_conversando INTEGER CHECK (conflitos_resolvidos_conversando IS NULL OR
                                                    (conflitos_resolvidos_conversando BETWEEN 0 AND 30
                                                     AND (conflitos IS NULL OR conflitos_resolvidos_conversando <= conflitos))),
    nao_observados                   INTEGER CHECK (nao_observados IS NULL OR nao_observados BETWEEN 0 AND 30),
    -- O relato do procedimento so' vale depois do OK da profissional: "ele so'
    -- vai liberar o relatorio se voce der ok" (campo). Quem liberou e quando.
    relato_liberado_por INTEGER REFERENCES educador(id),
    relato_liberado_em  TEXT,
    confirmado_por    INTEGER NOT NULL REFERENCES educador(id),
    confirmado_em     TEXT NOT NULL,
    status            TEXT NOT NULL CHECK (status IN ('aberta','fechada'))
  );

  CREATE TABLE IF NOT EXISTS folha_marcador (
    id       INTEGER PRIMARY KEY,
    folha_id INTEGER NOT NULL REFERENCES folha(id) ON DELETE CASCADE,
    marcador TEXT NOT NULL,
    UNIQUE (folha_id, marcador)
  );

  -- Atividade por area tematica — o denominador do score de exposicao.
  CREATE TABLE IF NOT EXISTS atividade_area (
    id       INTEGER PRIMARY KEY,
    turma_id INTEGER NOT NULL REFERENCES turma(id),
    area     TEXT NOT NULL,
    data     TEXT NOT NULL,
    origem   TEXT NOT NULL DEFAULT 'folha'
  );

  -- Pauta de segunda: a devolucao. O DESCARTE e' o dado que interessa —
  -- taxa de descarte acima de 30% significa agente generico (06-AGENTES-IA).
  CREATE TABLE IF NOT EXISTS pauta (
    id              INTEGER PRIMARY KEY,
    turma_id        INTEGER NOT NULL REFERENCES turma(id),
    semana          TEXT NOT NULL,
    sugestao_codigo TEXT NOT NULL,
    sugestao_titulo TEXT NOT NULL,
    decisao         TEXT CHECK (decisao IN ('aceita','descartada')),
    decidido_por    INTEGER REFERENCES educador(id),
    decidido_em     TEXT,
    UNIQUE (turma_id, semana)
  );

  -- Saida para o doador. Artefato gerado, revisado e publicado — o doador
  -- nao tem login e nao acessa a base (08-RELATORIO-DOADOR, regra zero).
  CREATE TABLE IF NOT EXISTS relatorio (
    id              INTEGER PRIMARY KEY,
    tipo            TEXT NOT NULL CHECK (tipo IN ('ciclo','carta')),
    periodo         TEXT NOT NULL,
    periodo_inicio  TEXT NOT NULL,
    periodo_fim     TEXT NOT NULL,
    blocos_json     TEXT NOT NULL,
    texto           TEXT NOT NULL,
    revisor_status  TEXT NOT NULL,
    revisor_notas   TEXT,
    supressoes_json TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('rascunho','publicado')),
    gerado_em       TEXT NOT NULL,
    publicado_por   INTEGER REFERENCES educador(id),
    publicado_em    TEXT,
    UNIQUE (tipo, periodo)
  );

  -- Ingestao retroativa das planilhas antigas: o log fica, a planilha nao.
  CREATE TABLE IF NOT EXISTS importacao (
    id             INTEGER PRIMARY KEY,
    origem         TEXT NOT NULL,
    linhas         INTEGER NOT NULL,
    criancas_novas INTEGER NOT NULL,
    reconhecidas   INTEGER NOT NULL,
    duplicatas     INTEGER NOT NULL,
    encontros      INTEGER NOT NULL,
    presencas      INTEGER NOT NULL,
    descartadas    INTEGER NOT NULL,
    relatorio_json TEXT NOT NULL,
    executado_por  INTEGER REFERENCES educador(id),
    executado_em   TEXT NOT NULL
  );

  -- Decisao 32 (campo, 29/08/2026): o parecer profissional-a-profissional. A
  -- assistente social do projeto parceiro pergunta "como ele esta'" e hoje e'
  -- respondida de memoria. O parecer sai por CODIGO, so' com consentimento
  -- especifico do responsavel e com a liberacao registrada — e o registro de
  -- que saiu, para quem e por quem e' permanente (trilha de auditoria).
  CREATE TABLE IF NOT EXISTS parecer (
    id            INTEGER PRIMARY KEY,
    crianca_id    INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
    destinatario  TEXT NOT NULL,
    texto         TEXT NOT NULL,
    numeros_json  TEXT NOT NULL,
    revisor_status TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('rascunho','liberado')),
    gerado_por    INTEGER NOT NULL REFERENCES educador(id),
    gerado_em     TEXT NOT NULL,
    liberado_por  INTEGER REFERENCES educador(id),
    liberado_em   TEXT
  );
  CREATE INDEX IF NOT EXISTS ix_parecer_crianca ON parecer(crianca_id, gerado_em);

  CREATE INDEX IF NOT EXISTS ix_presenca_crianca ON presenca(crianca_id);
  CREATE INDEX IF NOT EXISTS ix_encontro_turma   ON encontro(turma_id, data);
  CREATE INDEX IF NOT EXISTS ix_matricula_prog   ON matricula(programa_id, status);
  CREATE INDEX IF NOT EXISTS ix_obs_ciclo        ON observacao(ciclo_id, status);
  CREATE INDEX IF NOT EXISTS ix_atividade_edu    ON atividade(educador_id, data);
  CREATE INDEX IF NOT EXISTS ix_aspiracao_area    ON aspiracao(area);
  CREATE INDEX IF NOT EXISTS ix_ativarea_turma    ON atividade_area(turma_id, area, data);
  CREATE INDEX IF NOT EXISTS ix_folha_encontro    ON folha(encontro_id);
`;

export const ASSINATURA = assinar(ESQUEMA_SQL);

function criarEsquema(d) { d.exec(ESQUEMA_SQL); }

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
