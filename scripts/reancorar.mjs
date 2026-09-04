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
// O HANDOFF fica DE FORA: ele registra numeros de linha do PASSADO ("citava 511;
// a linha era a 509"). Renumerar la' nao corrigiria uma citacao — apagaria o
// registro de uma correcao que aconteceu.
const HISTORICOS = [join(RAIZ, 'docs', 'HANDOFF.md')];

// COLISAO. Mover 510 -> 511 quando ja' existe uma ancora em 511 produz CHAVE
// DUPLICADA no objeto literal do teste — e JS mantem so' a ultima, em silencio.
// A tabela encolheria de 18 para 17 sem nenhum sinal, que e' exatamente a
// especie de falha que estas ancoras existem para impedir. Aconteceu de fato
// no estagio 2 da F1: a ferramenta escreveu a colisao antes desta guarda.
const ocupadas = new Set(entradas.map(e => `${e.arquivo}:${e.linha}`));
const colisoes = [];
for (let i = mover.length - 1; i >= 0; i--) {
  const alvo = `${mover[i].arquivo}:${mover[i].novo}`;
  const origem = `${mover[i].arquivo}:${mover[i].linha}`;
  // Nao e' colisao quando a ancora que ocupa o numero e' justamente uma que sai.
  const saiTambem = mover.some(o => o !== mover[i] && `${o.arquivo}:${o.linha}` === alvo);
  if (ocupadas.has(alvo) && alvo !== origem && !saiTambem) colisoes.push({ ...mover[i], alvo });
}
for (const c of colisoes) mover.splice(mover.findIndex(m => m === c), 1);

console.log(`\n  ${ok.length} âncora(s) no lugar · ${mover.length} para mover · ${ambiguas.length} ambígua(s)${colisoes.length ? ` · ${colisoes.length} em colisão` : ''}\n`);
for (const c of colisoes) console.log(`  COLISÃO   ${c.arquivo}:${c.linha} -> :${c.novo}, mas :${c.novo} já é âncora — decida à mão`);
for (const m of mover) console.log(`  mover     ${m.arquivo}:${m.linha} -> :${m.novo}`);
for (const a of ambiguas) console.log(`  AMBÍGUA   ${a.arquivo}:${a.linha} casa em ${a.casam.join(', ')} — decida à mão`);

if (!ESCREVER) { console.log(mover.length ? '\n  Nada foi escrito. Rode com --escrever.\n' : '\n'); process.exit(ambiguas.length || colisoes.length ? 1 : 0); }

const marca = (i) => `\u0000ANCORA${i}\u0000`;
const trocar = (texto, sufixo) => {
  let x = texto;
  // INTERVALO PRIMEIRO. `app.js:2234-2238` descreve um bloco; mover so' o inicio
  // deixa `2468-2238`, que anda para tras. O fim leva o MESMO deslocamento — e'
  // um bloco contiguo, entao a distancia entre as pontas nao muda.
  if (!sufixo) {
    mover.forEach((m, i) => {
      x = x.replace(new RegExp(`${m.arquivo.replace(/[.\\/]/g, '\\$&')}:${m.linha}-(\\d+)`, 'g'),
        (_, fim) => `${marca(i)}-${Number(fim) + (m.novo - m.linha)}`);
    });
  }
  mover.forEach((m, i) => { x = x.split(`${m.arquivo}:${m.linha}${sufixo}`).join(marca(i) + sufixo); });
  mover.forEach((m, i) => { x = x.split(marca(i)).join(`${m.arquivo}:${m.novo}`); });
  return x;
};

let tocados = 0;
const t = trocar(teste, "':");
if (t !== teste) { writeFileSync(TESTE, t); tocados++; }
for (const d of docs) {
  if (HISTORICOS.includes(d)) continue;
  const antes = readFileSync(d, 'utf8');
  const depois = trocar(antes, '');
  if (depois !== antes) { writeFileSync(d, depois); tocados++; }
}
console.log(`\n  ${tocados} arquivo(s) atualizado(s).${ambiguas.length ? ' As ambíguas continuam pendentes.' : ''}\n`);
process.exit(ambiguas.length || colisoes.length ? 1 : 0);
