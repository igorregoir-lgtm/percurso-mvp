// Percurso — preparação OFFLINE das fontes do corpus RAG (Fase 1 do plano de IA).
//
// Converte os originais baixados (data/rag/fontes/) no TEXTO CANÔNICO versionado
// (data/rag/corpus/). O texto canônico — e não o binário original — é a fonte que
// o ingest indexa; o hash de cada .txt derivado entra no manifest (proveniência).
//
// Pipeline determinístico, zero dependência:
//   HTML (planalto, windows-1252) → decodifica → remove <strike>/<del> (texto
//     revogado não entra no corpus) → strip de tags → entidades → normaliza.
//   BNCC (texto extraído via `pdftotext -layout -enc UTF-8 bncc.pdf bncc.txt`,
//     passo manual documentado no manifest) → fatia por capítulo (linhas fixas
//     da versão de 2018) → normaliza.
//
// Uso:  node src/rag/preparar-fontes.mjs      (grava corpus/ e imprime hashes)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONTES = join(RAIZ, 'data', 'rag', 'fontes');
const CORPUS = join(RAIZ, 'data', 'rag', 'corpus');
mkdirSync(CORPUS, { recursive: true });

// windows-1252: os bytes 0x80–0x9F que o latin1 mapearia para controles.
const MAPA_1252 = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•',
  0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ',
  0x9E: 'ž', 0x9F: 'Ÿ',
};
const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', agrave: 'à', acirc: 'â', atilde: 'ã', auml: 'ä',
  eacute: 'é', egrave: 'è', ecirc: 'ê', iacute: 'í', igrave: 'ì', icirc: 'î',
  oacute: 'ó', ograve: 'ò', ocirc: 'ô', otilde: 'õ', uacute: 'ú', ucirc: 'û', uuml: 'ü',
  ccedil: 'ç', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Eacute: 'É', Ecirc: 'Ê',
  Iacute: 'Í', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Uacute: 'Ú', Ccedil: 'Ç',
  sect: '§', ordm: 'º', ordf: 'ª', deg: '°', middot: '·', hellip: '…',
  ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", ndash: '–', mdash: '—',
};

function deCp1252(bruto) {
  let t = '';
  for (const b of bruto) t += MAPA_1252[b] ?? String.fromCharCode(b);
  return t;
}

function htmlParaTexto(html) {
  return html
    // texto revogado/riscado NÃO entra no corpus — seria norma morta citável
    .replace(/<(strike|del|s)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (_, e) => ENTIDADES[e] ?? ' ');
}

function normalizar(texto) {
  return texto
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

const sha = (t) => createHash('sha256').update(t).digest('hex');

const saidas = [];
function gravar(nome, texto) {
  const limpo = normalizar(texto);
  writeFileSync(join(CORPUS, nome), limpo);
  saidas.push({ arquivo: nome, sha256: sha(limpo), bytes: Buffer.byteLength(limpo) });
}

// ---- Leis do planalto (domínio público — art. 8º, I, Lei 9.610/98) ----------
for (const [entrada, saida] of [
  ['lgpd-l13709.html', 'lei-13709-2018-lgpd.txt'],
  ['eca-l8069.html', 'lei-8069-1990-eca.txt'],
  ['marco-primeira-infancia-l13257.html', 'lei-13257-2016-primeira-infancia.txt'],
]) {
  const html = deCp1252(readFileSync(join(FONTES, entrada)));
  gravar(saida, htmlParaTexto(html));
}

// ---- BNCC (documento público oficial do MEC) --------------------------------
// Fatias por capítulo da versão final de 2018 (linhas do bncc.txt extraído):
//   Educação Infantil: 1785–2776  ·  Ensino Fundamental: 2777–21814
const bncc = readFileSync(join(FONTES, 'bncc.txt'), 'utf8').split('\n');
gravar('bncc-educacao-infantil.txt', bncc.slice(1784, 2776).join('\n'));
gravar('bncc-ensino-fundamental.txt', bncc.slice(2776, 21814).join('\n'));

console.log('Texto canônico gravado em data/rag/corpus/:\n');
for (const s of saidas) console.log(`  ${s.arquivo}\n    sha256: ${s.sha256}  (${s.bytes} bytes)`);
console.log('\nAtualize data/rag/manifest.json se algum hash mudou.');
