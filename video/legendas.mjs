// Gera as molduras do video (fundo + legenda) renderizando HTML no proprio Chrome.
// Evita depender do filtro drawtext do ffmpeg e da tipografia de verdade as legendas.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { conectar, esperar } from './cdp.mjs';

const QUADROS = join(import.meta.dirname, 'quadros');
const SAIDA   = join(import.meta.dirname, 'molduras');
const CHROME  = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PERFIL  = '/tmp/percurso-chrome-legendas';

rmSync(SAIDA, { recursive: true, force: true });
rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

const roteiro = JSON.parse(readFileSync(join(QUADROS, 'roteiro.json'), 'utf8'));

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9223', `--user-data-dir=${PERFIL}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--force-color-profile=srgb', 'about:blank',
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

let pronto = false;
for (let i = 0; i < 40 && !pronto; i++) {
  await esperar(500);
  try { await (await fetch('http://127.0.0.1:9223/json/version')).json(); pronto = true; } catch {}
}
if (!pronto) { console.error('Chrome nao abriu a porta 9223.'); process.exit(1); }

const p = await conectar(9223);
await p.enviar('Page.enable');
await p.enviar('Runtime.enable');
await p.viewport({ width: 1920, height: 1080, escala: 1, mobile: false });

const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// A legenda de cada cena vira uma pagina inteira de 1920x1080; o quadro da
// aplicacao e sobreposto depois pelo ffmpeg, no espaco reservado.
function pagina(legenda, modo) {
  const comum = `
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1920px;height:1080px;overflow:hidden}
    body{background:#e9e3d6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#221e33}
    .marca{position:absolute;left:64px;bottom:44px;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#221e33;opacity:.5}
    .marca i{color:#cd4433;font-style:normal}
    .selo{position:absolute;right:64px;bottom:46px;font-size:17px;font-weight:700;letter-spacing:.1em;
          text-transform:uppercase;color:#8a6d3b;background:#efe3c8;padding:8px 16px;border-radius:20px}`;

  const corpo = modo === 'mobile' ? `
    <style>${comum}
      .txt{position:absolute;left:860px;right:70px;top:50%;transform:translateY(-50%);
           font-size:43px;line-height:1.36;font-weight:500;letter-spacing:-.005em}
    </style>
    <div class="txt">${esc(legenda)}</div>` : `
    <style>${comum}
      .txt{position:absolute;left:150px;right:150px;top:892px;text-align:center;
           font-size:38px;line-height:1.34;font-weight:500;letter-spacing:-.005em}
    </style>
    <div class="txt">${esc(legenda)}</div>`;

  return corpo + `<div class="marca">Percurso<i>.</i></div><div class="selo">dados sintéticos</div>`;
}

let feitas = 0;
for (const [i, cena] of roteiro.entries()) {
  const html = pagina(cena.legenda || '', cena.modo);
  await p.avaliar(`document.open(); document.write(${JSON.stringify('<!doctype html><meta charset="utf-8">' + html)}); document.close();`);
  await esperar(160);
  writeFileSync(join(SAIDA, `m${String(i).padStart(3, '0')}.png`), await p.foto());
  feitas++;
}

console.log(`${feitas} molduras geradas em ${SAIDA}`);
p.fechar();
chrome.kill();
process.exit(0);
