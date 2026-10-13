// Percurso — monta o dossie da Semana 10 num arquivo so'.
//
// POR QUE EXISTE: o dossie vai para dois lugares que nao servem arquivo ao lado
// de arquivo — a pasta de entrega no Drive, onde quem avalia baixa UM html, e a
// vitrine na Vercel. Por isso ele sai autocontido: a folha de estilos do dossie
// da Semana 5 (mesmo desenho) e as capturas de docs/capturas/ embutidas.
//
// Uso:  node scripts/montar-dossie-semana-10.mjs
// Le:   docs/dossie-semana-10.modelo.html  (o texto; e' este que se edita)
//       public/dossie.html                 (so' a folha de estilos)
//       docs/capturas/*.png                (rode video/capturas.mjs antes, se as telas mudaram)
// Grava: public/dossie-semana-10.html
//
// Usa o `sips` do macOS para reduzir as capturas a JPEG; sem ele, embute o PNG.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODELO = join(RAIZ, 'docs', 'dossie-semana-10.modelo.html');
const SAIDA = join(RAIZ, 'public', 'dossie-semana-10.html');

let html = readFileSync(MODELO, 'utf8');

const base = readFileSync(join(RAIZ, 'public', 'dossie.html'), 'utf8').match(/<style[^>]*>([\s\S]*?)<\/style>/i);
if (!base) { console.error('não achei a folha de estilos em public/dossie.html'); process.exit(2); }
if (!html.includes('/*CSS_BASE*/')) { console.error('o modelo perdeu o marcador /*CSS_BASE*/'); process.exit(2); }
html = html.replace('/*CSS_BASE*/', () => base[1].trim());

// Celular (01 a 06) e computador (07 a 10) saem em larguras diferentes.
const larguraDe = (nome) => (Number(nome.slice(0, 2)) <= 6 ? 560 : 1100);
const tmp = mkdtempSync(join(tmpdir(), 'percurso-dossie-'));
let total = 0;
const usadas = new Set();
html = html.replace(/src="capturas:([^"]+\.png)"/g, (_m, nome) => {
  const png = join(RAIZ, 'docs', 'capturas', nome);
  let bytes, mime;
  try {
    const jpg = join(tmp, nome.replace(/\.png$/, '.jpg'));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '78',
      '--resampleWidth', String(larguraDe(nome)), png, '--out', jpg], { stdio: 'ignore' });
    bytes = readFileSync(jpg); mime = 'image/jpeg';
  } catch {
    bytes = readFileSync(png); mime = 'image/png';
  }
  total += bytes.length;
  usadas.add(nome);
  return `src="data:${mime};base64,${bytes.toString('base64')}"`;
});
rmSync(tmp, { recursive: true, force: true });

if (/capturas:/.test(html)) { console.error('sobrou captura sem embutir'); process.exit(2); }
writeFileSync(SAIDA, html);
console.log(`${usadas.size} capturas embutidas (${Math.round(total / 1024)} KB) → public/dossie-semana-10.html (${Math.round(html.length / 1024)} KB)`);
