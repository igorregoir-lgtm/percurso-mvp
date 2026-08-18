// Percurso — monta o video final.
// Cada cena = moldura (fundo + legenda, renderizada no Chrome) com o quadro da
// aplicacao sobreposto. So usa scale/overlay/concat — nenhum filtro exotico.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, cpSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const AQUI     = import.meta.dirname;
const QUADROS  = join(AQUI, 'quadros');
const MOLDURAS = join(AQUI, 'molduras');
const TMP      = '/tmp/percurso-video';
const FINAL    = join(AQUI, 'percurso-demonstracao.mp4');

rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, 'seg'), { recursive: true });
cpSync(QUADROS, join(TMP, 'quadros'), { recursive: true });
cpSync(MOLDURAS, join(TMP, 'molduras'), { recursive: true });

const roteiro = JSON.parse(readFileSync(join(QUADROS, 'roteiro.json'), 'utf8'));
const ff = (args) => {
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { console.error('\nffmpeg falhou:\n', e.stderr?.toString().slice(0, 1200)); throw e; }
};

// Tempo no ar: leitura da legenda, com piso e teto.
const duracao = (legenda, n) => legenda
  ? Math.min(11.5, Math.max(4.3, 2.7 + legenda.split(/\s+/).length * 0.46))
  : 0.55 * n + 1.8;

// Posicao do quadro da aplicacao dentro da moldura de 1920x1080.
const LAYOUT = {
  mobile:  { altura: 1000, x: 300, y: 40 },
  desktop: { altura: 820,  x: '(W-w)/2', y: 34 },
};

let total = 0;
const segmentos = [];

roteiro.forEach((cena, i) => {
  const idx = String(i).padStart(3, '0');
  const seg = join(TMP, 'seg', `s${idx}.mp4`);
  const dur = duracao(cena.legenda, cena.quadros.length);
  total += dur;

  const k = cena.quadros.length, passo = 0.42;
  const linhas = cena.quadros.map((q, j) => {
    const d = j < k - 1 ? passo : Math.max(0.9, dur - passo * (k - 1));
    return `file '${join(TMP, 'quadros', q)}'\nduration ${d.toFixed(2)}`;
  });
  linhas.push(`file '${join(TMP, 'quadros', cena.quadros.at(-1))}'`);
  const lista = join(TMP, `lista${idx}.txt`);
  writeFileSync(lista, linhas.join('\n') + '\n');

  const L = LAYOUT[cena.modo];
  ff([
    '-f', 'concat', '-safe', '0', '-i', lista,
    '-loop', '1', '-i', join(TMP, 'molduras', `m${idx}.png`),
    '-filter_complex',
      `[0:v]scale=-2:${L.altura}[tela];[1:v][tela]overlay=x=${L.x}:y=${L.y}[out]`,
    '-map', '[out]', '-t', dur.toFixed(2), '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', seg,
  ]);
  segmentos.push(seg);
  process.stdout.write(`\r  cena ${i + 1}/${roteiro.length} · ${total.toFixed(0)}s   `);
});

console.log('\n  concatenando e finalizando…');
const listaFinal = join(TMP, 'final.txt');
writeFileSync(listaFinal, segmentos.map(s => `file '${s}'`).join('\n') + '\n');

ff([
  '-f', 'concat', '-safe', '0', '-i', listaFinal,
  '-vf', `fade=t=in:st=0:d=0.9,fade=t=out:st=${(total - 1.3).toFixed(2)}:d=1.3`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', FINAL,
]);

const mb = (statSync(FINAL).size / 1048576).toFixed(1);
console.log(`\n  Vídeo: ${FINAL}`);
console.log(`  ≈ ${Math.floor(total / 60)}m${String(Math.round(total % 60)).padStart(2, '0')}s · ${roteiro.length} cenas · 1920×1080 · ${mb} MB · sem áudio`);
