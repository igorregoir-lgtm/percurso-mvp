// Percurso — corta a narracao em uma fala por cena.
//
// A locucao e' gerada fora daqui (voz sintetica, a partir de video/narracao.json), em
// CINCO blocos — um por bloco do roteiro —, com uma pausa longa entre as falas. Este
// script acha essas pausas e grava video/narracao/fNNN.mp3, que o montar.mjs encaixa em
// cada cena. Cortar por silencio so' funciona porque a pausa ENTRE falas e' bem mais longa
// que qualquer pausa DENTRO de uma fala: o relatorio mostra as duas, para conferir.
//
// Uso:  node video/cortar-narracao.mjs <pasta com bloco0.mp3 … bloco4.mp3>
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const AQUI = import.meta.dirname;
const ORIGEM = process.argv[2];
const SAIDA = join(AQUI, 'narracao');
// Primeira e ultima cena de cada bloco (a cena 8 nao tem fala).
const BLOCOS = [[0, 7], [9, 15], [16, 22], [23, 31], [32, 39]];
const falas = JSON.parse(readFileSync(join(AQUI, 'narracao.json'), 'utf8'));

if (!ORIGEM) { console.error('uso: node video/cortar-narracao.mjs <pasta dos blocos>'); process.exit(2); }
rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

let ruim = 0;
BLOCOS.forEach(([a, b], k) => {
  const arq = join(ORIGEM, `bloco${k}.mp3`), n = b - a + 1;
  // O silencedetect escreve no stderr, nao no stdout.
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', arq,
    '-af', 'silencedetect=noise=-38dB:d=0.4', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const total = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString());
  const ini = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => Number(m[1]));
  const fim = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => Number(m[1]));
  // So' silencios do MEIO: o do comeco e o do fim nao separam fala nenhuma.
  const sil = ini.map((s, i) => ({ s, e: fim[i] ?? total })).filter(x => x.s > 0.3 && x.e < total - 0.3)
    .map(x => ({ ...x, d: x.e - x.s })).sort((x, y) => y.d - x.d);
  const cortes = sil.slice(0, n - 1).sort((x, y) => x.s - y.s);
  const menorCorte = Math.min(...cortes.map(x => x.d)), maiorResto = sil[n - 1]?.d ?? 0;
  if (cortes.length !== n - 1 || menorCorte < maiorResto * 1.35) ruim++;
  console.log(`bloco ${k}: ${n} falas · pausa entre falas ≥ ${menorCorte.toFixed(2)} s · maior pausa dentro de fala ${maiorResto.toFixed(2)} s`);
  for (let i = 0; i < n; i++) {
    const de = i === 0 ? 0 : cortes[i - 1].e - 0.12;
    const ate = i === n - 1 ? total : cortes[i].s + 0.18;
    const destino = join(SAIDA, `f${String(a + i).padStart(3, '0')}.mp3`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', arq, '-ss', de.toFixed(3), '-to', ate.toFixed(3),
      '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1', destino]);
    console.log(`  f${String(a + i).padStart(3, '0')}  ${(ate - de).toFixed(1).padStart(5)} s  ${falas[a + i].slice(0, 58)}`);
  }
});
if (ruim) { console.error(`\n${ruim} bloco(s) com pausa ambígua: confira antes de montar.`); process.exit(1); }
