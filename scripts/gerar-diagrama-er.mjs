// Gera docs/MODELO-DE-DADOS-ER.md a partir do esquema REAL do banco.
//
// O diagrama em ASCII de MODELO-DE-DADOS.md e' desenhado a mao e envelhece a
// cada tabela nova (cobria ~20 das 32 em 05/10/2026). Este script nao desenha:
// cria um banco temporario, semeia os dados sinteticos e le o proprio SQLite
// (sqlite_master, table_info, foreign_key_list). O que sai daqui e' o que o
// codigo cria — nao o que alguem lembrou de documentar.
//
// Uso:  node scripts/gerar-diagrama-er.mjs
// Nunca toca data/percurso.db: o banco e' criado num diretorio temporario e
// apagado no fim.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'docs', 'MODELO-DE-DADOS-ER.md');

// DB_PATH e' lido no import de src/db.js — o ambiente tem que vir antes.
const dir = mkdtempSync(join(tmpdir(), 'percurso-er-'));
process.env.PERCURSO_DB = join(dir, 'er.db');
const { getDb, closeDb, ESQUEMA_VERSAO } = await import('../src/db.js');
const { semear } = await import('../src/seed.js');

const db = getDb();
semear();

const tabelas = db.prepare(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all().map((r) => r.name);

const colunas = {};
const fks = {};
const linhas = {};
for (const t of tabelas) {
  colunas[t] = db.prepare(`PRAGMA table_info("${t}")`).all();
  fks[t] = db.prepare(`PRAGMA foreign_key_list("${t}")`).all();
  linhas[t] = db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n;
}
closeDb();
rmSync(dir, { recursive: true, force: true });

// O fluxo principal (chamada → observação → consentimento → folha do dia) cabe
// em ~15 tabelas. O diagrama completo, com 32, e' exato e ilegivel numa pagina;
// o nucleo e' um RECORTE do mesmo esquema, nunca um desenho a parte.
const NUCLEO = ['educador', 'programa', 'turma', 'crianca', 'matricula', 'encontro', 'presenca',
  'ciclo', 'dimensao', 'ancora', 'observacao', 'observacao_item', 'governanca_campo',
  'consentimento', 'folha'];
const fora = NUCLEO.filter((t) => !tabelas.includes(t));
if (fora.length) throw new Error(`NUCLEO cita tabela que nao existe mais: ${fora.join(', ')}`);

// Mermaid aceita um tipo de uma palavra por atributo; coluna sem tipo vira ANY.
const tipo = (c) => (c.type || 'ANY').split(/[\s(]/)[0].toUpperCase();
const ehFk = (t, col) => fks[t].some((f) => f.from === col);

const bloco = (t) => {
  const attrs = colunas[t].map((c) => {
    const chaves = [c.pk ? 'PK' : '', ehFk(t, c.name) ? 'FK' : ''].filter(Boolean).join(',');
    return `    ${tipo(c)} ${c.name}${chaves ? ' ' + chaves : ''}`;
  });
  return `  ${t} {\n${attrs.join('\n')}\n  }`;
};

// Filha }o--|| pai quando a FK e' obrigatoria (NOT NULL); }o--o| quando opcional.
const relacoesDe = (conjunto) => {
  const out = [];
  for (const t of conjunto) {
    for (const f of fks[t]) {
      if (!conjunto.includes(f.table)) continue;
      const col = colunas[t].find((c) => c.name === f.from);
      const lado = col && col.notnull ? '||' : 'o|';
      out.push(`  ${f.table} ${lado}--o{ ${t} : "${f.from}"`);
    }
  }
  return out;
};
const diagrama = (conjunto) =>
  `\`\`\`mermaid\nerDiagram\n${relacoesDe(conjunto).join('\n')}\n${conjunto.map(bloco).join('\n')}\n\`\`\``;

const relacoes = relacoesDe(tabelas);
const totalFks = relacoes.length;
const tabelaContagem = tabelas
  .map((t) => `| \`${t}\` | ${colunas[t].length} | ${fks[t].map((f) => `\`${f.from}\` → \`${f.table}\``).join('<br>') || '—'} | ${linhas[t]} |`)
  .join('\n');

const md = `# Modelo de dados — diagrama entidade-relacionamento

> **Gerado automaticamente** por \`node scripts/gerar-diagrama-er.mjs\` a partir do esquema real
> (\`src/db.js\`, versão legível ${ESQUEMA_VERSAO}). Não edite à mão: rode o script de novo quando o
> esquema mudar. O porquê de cada entidade e as regras que o esquema carrega estão em
> [\`MODELO-DE-DADOS.md\`](MODELO-DE-DADOS.md).

**${tabelas.length} tabelas · ${totalFks} chaves estrangeiras.** Banco: SQLite embutido do Node
(\`node:sqlite\`), um arquivo só em \`data/percurso.db\`, com \`foreign_keys = ON\`.

Leitura dos diagramas: \`pai ||--o{ filha\` = uma linha do pai tem zero ou muitas na filha, e a
FK da filha é obrigatória; \`o|--o{\` = a FK pode ficar vazia. O rótulo da linha é a coluna da FK.

## Núcleo — as ${NUCLEO.length} tabelas do fluxo principal

Chamada da turma (\`encontro\` + \`presenca\`), observação pela rubrica (\`observacao\` +
\`observacao_item\`, com \`dimensao\` e \`ancora\`), bloqueio por consentimento (\`consentimento\` →
\`governanca_campo\`) e a folha do dia (\`folha\`, pendurada no encontro, nunca na criança).
**Criança ≠ matrícula:** uma criança pode estar em dois programas; o indicador conta crianças
únicas.

${diagrama(NUCLEO)}

## Esquema completo — ${tabelas.length} tabelas

${diagrama(tabelas)}

## Tabelas, colunas e volume semeado

A última coluna é quantas linhas a semente sintética cria (\`node scripts/reset.mjs\`). Tabelas
com 0 nascem vazias e se enchem pelo uso.

| Tabela | Colunas | Chaves estrangeiras | Linhas na semente |
|---|---|---|---|
${tabelaContagem}
`;

writeFileSync(SAIDA, md);
console.log(`${tabelas.length} tabelas, ${totalFks} FKs → ${SAIDA}`);
