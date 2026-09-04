// Percurso — re-ancora as citacoes `arquivo:linha` quando o codigo se move.
//
// POR QUE EXISTE: uma citacao `arquivo:linha` num documento envelhece em
// SILENCIO a cada linha inserida acima dela. O repositorio corrigiu isso quatro
// vezes em UM dia (ver o comentario em scripts/unit-test.mjs), e o teste das
// ancoras existe para que renumerar quebre em vez de enganar. Mas o teste so'
// ACUSA — corrigir continuava sendo trabalho manual, e trabalho manual repetido
// e' defeito esperando data.
//
// Esta ferramenta le a tabela ANCORAS do proprio teste, procura o CONTEUDO que
// cada citacao promete, e atualiza o numero no teste E em todos os documentos.
// Quando o conteudo casa em mais de um lugar, ela RECUSA-SE A CHUTAR e reporta
// — ambiguidade e' decisao humana, nao heuristica.
//
// Uso:  node scripts/reancorar.mjs           (relatorio, nao escreve)
//       node scripts/reancorar.mjs --escrever
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const TESTE = join(RAIZ, 'scripts', 'unit-test.mjs');
const ESCREVER = process.argv.includes('--escrever');

const teste = readFileSync(TESTE, 'utf8');
const bloco = teste.match(/const ANCORAS = \{([\s\S]*?)\n {2}\};/);
if (!bloco) { console.error('não achei a tabela ANCORAS em scripts/unit-test.mjs'); process.exit(2); }

const entradas = [...bloco[1].matchAll(/'([^':]+):(\d+)':\s*(\/(?:[^/\\]|\\.)*\/[gimsuy]*)/g)]
  .map((m) => ({ arquivo: m[1], linha: Number(m[2]), fonte: m[3] }));

const paraRegExp = (lit) => {
  const fim = lit.lastIndexOf('/');
  return new RegExp(lit.slice(1, fim), lit.slice(fim + 1));
};

const mover = [], ambiguas = [], ok = [];
for (const e of entradas) {
  const linhas = readFileSync(join(RAIZ, e.arquivo), 'utf8').split('\n');
  const rx = paraRegExp(e.fonte);
  if (rx.test(linhas[e.linha - 1] ?? '')) { ok.push(e); continue; }
  const casam = linhas.map((l, i) => (rx.test(l) ? i + 1 : 0)).filter(Boolean);
  if (casam.length === 1) mover.push({ ...e, novo: casam[0] });
  else ambiguas.push({ ...e, casam });
}

// documentos que podem citar
const docs = [];
(function varrer(dir) {
  for (const n of readdirSync(dir)) {
    const c = join(dir, n);
    if (statSync(c).isDirectory()) varrer(c);
    else if (/\.(md|txt)$/.test(n)) docs.push(c);
  }
})(join(RAIZ, 'docs'));
docs.push(join(RAIZ, 'README.md'));

console.log(`\n  ${ok.length} âncora(s) no lugar · ${mover.length} para mover · ${ambiguas.length} ambígua(s)\n`);
for (const m of mover) console.log(`  mover     ${m.arquivo}:${m.linha} -> :${m.novo}`);
for (const a of ambiguas) console.log(`  AMBÍGUA   ${a.arquivo}:${a.linha} casa em ${a.casam.join(', ')} — decida à mão`);

if (!ESCREVER) { console.log(mover.length ? '\n  Nada foi escrito. Rode com --escrever.\n' : '\n'); process.exit(ambiguas.length ? 1 : 0); }

let t = teste, tocados = 0;
for (const m of mover) t = t.replace(`'${m.arquivo}:${m.linha}':`, `'${m.arquivo}:${m.novo}':`);
if (t !== teste) { writeFileSync(TESTE, t); tocados++; }
for (const d of docs) {
  const antes = readFileSync(d, 'utf8');
  let depois = antes;
  for (const m of mover) depois = depois.split(`${m.arquivo}:${m.linha}`).join(`${m.arquivo}:${m.novo}`);
  if (depois !== antes) { writeFileSync(d, depois); tocados++; }
}
console.log(`\n  ${tocados} arquivo(s) atualizado(s).${ambiguas.length ? ' As ambíguas continuam pendentes.' : ''}\n`);
process.exit(ambiguas.length ? 1 : 0);
