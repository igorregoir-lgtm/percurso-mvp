// Percurso — testes da transcricao de audio SEM o modelo (gate de CI da F1).
//
// Mesmo papel do ai-stub-test.mjs: o whisper de verdade sao 465 MB de ggml e um
// binario que a maquina de CI nao tem. O stub (scripts/whisper-stub.mjs) imita a
// interface, e o que se testa aqui e' o que de fato importa e nao depende do
// modelo: O CICLO DE VIDA DO ARQUIVO. "O audio e' apagado assim que vira texto"
// e' a frase que a tela mostra no instante do toque — se ela for so' frase, o
// produto esta' mentindo na porta mais poderosa que tem.
//
// Roda sozinho:  node scripts/audio-stub-test.mjs
import { mkdtempSync, rmSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirTemp = mkdtempSync(join(tmpdir(), 'percurso-audio-'));

// Ambiente ANTES do import: src/transcricao.js le' env no momento do import.
process.env.PERCURSO_DB = join(dirTemp, 'audio-test.db');
process.env.PERCURSO_AUDIO = '1';
process.env.PERCURSO_WHISPER = join(RAIZ, 'scripts', 'whisper-stub.mjs');
process.env.PERCURSO_AUDIO_MODELO = join(RAIZ, 'package.json');   // qualquer arquivo que exista
process.env.PERCURSO_AUDIO_TIMEOUT_MS = '15000';

const TRANSC = await import('../src/transcricao.js');
const { wavDeAmostras, misturarMono, juntarBlocos, TAXA } = await import('../public/audio.js');

let ok = 0, falhas = 0;
const T = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log(`  \x1b[32m✓\x1b[0m ${nome}`); }
  else { falhas++; console.log(`  \x1b[31m✗ ${nome}\x1b[0m ${extra}`); }
};
console.log('\n\x1b[1mPercurso — transcrição de áudio com stub (CI, sem modelo)\x1b[0m\n');

const wav = (segundos) => {
  const n = TAXA * segundos;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = Math.sin(i / 20) * 0.3;
  return Buffer.from(wavDeAmostras(a, TAXA));
};

// 1 · o cabecalho WAV que o cliente monta -------------------------------------
{
  const b = wav(1);
  T('o WAV do cliente é RIFF/WAVE, mono, 16 bits, 16 kHz',
    b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE'
    && b.readUInt16LE(22) === 1 && b.readUInt16LE(34) === 16 && b.readUInt32LE(24) === 16000);
  T('o tamanho fecha com o cabeçalho', b.length === 44 + TAXA * 2 && b.readUInt32LE(40) === TAXA * 2);

  const v = new DataView(wavDeAmostras(Float32Array.from([2, -2]), TAXA));
  T('amostra fora de [-1,1] satura, não estoura',
    v.getInt16(44, true) === 32767 && v.getInt16(46, true) === -32768);

  const dois = { numberOfChannels: 2, length: 3, getChannelData: (c) => Float32Array.from(c === 0 ? [1, 0, -1] : [0, 1, 1]) };
  T('a mistura para mono é média, não soma', Array.from(misturarMono(dois)).join(',') === '0.5,0.5,0');
  T('os blocos se juntam na ordem, sem espaço sobrando', juntarBlocos([' a ', '', null, 'b  c']) === 'a b c');
}

// 2 · a transcricao acontece, e o arquivo NAO sobrevive ------------------------
{
  const antes = TRANSC.pendentes();
  const r = await TRANSC.transcrever(wav(1));
  T('o transcritor devolve texto', typeof r.texto === 'string' && r.texto.length > 0, r.texto);
  T('NENHUM arquivo sobra depois de uma transcrição que deu certo',
    TRANSC.pendentes() === 0, `(antes ${antes}, agora ${TRANSC.pendentes()})`);
}

// 3 · e nao sobrevive quando ela FALHA — que e' o caso que importa -------------
{
  process.env.PERCURSO_WHISPER_STUB_FALHA = '1';
  let houveErro = false;
  try { await TRANSC.transcrever(wav(1)); } catch (e) { houveErro = !!e.status; }
  delete process.env.PERCURSO_WHISPER_STUB_FALHA;
  T('transcrição que falha vira erro com status, não exceção crua', houveErro);
  T('e o áudio TAMBÉM não sobrevive à falha', TRANSC.pendentes() === 0);
}

// 4 · a varredura de orfaos, que cobre a queda do processo no meio -------------
{
  mkdirSync(TRANSC.DIR, { recursive: true });
  const orfao = join(TRANSC.DIR, 'orfao-de-um-processo-morto.wav');
  writeFileSync(orfao, wav(1));
  T('um órfão recente NÃO é varrido (transcrição em curso não pode ser apagada)',
    TRANSC.varrerOrfaos().apagados === 0 && TRANSC.pendentes() === 1);
  T('a varredura de boot leva o órfão embora', TRANSC.varrerOrfaos({ tudo: true }).apagados === 1);
  T('e o diretório volta a zero', TRANSC.pendentes() === 0);
}

// 5 · o teto e o vazio ---------------------------------------------------------
{
  let vazio = 0, grande = 0;
  try { await TRANSC.transcrever(Buffer.alloc(0)); } catch (e) { vazio = e.status; }
  try { await TRANSC.transcrever(Buffer.alloc(200 * 1024 * 1024)); } catch (e) { grande = e.status; }
  T('áudio vazio é recusado com 422', vazio === 422, `(${vazio})`);
  T('áudio acima do teto é recusado com 413, sem tocar o disco',
    grande === 413 && TRANSC.pendentes() === 0, `(${grande})`);
}

// 6 · o estado que a tela le' para decidir quais portas oferecer ---------------
{
  const e = TRANSC.estadoDoAudio();
  T('o estado diz habilitada, modelo presente e quantos pendentes',
    e.habilitada === true && e.modelo_presente === true && e.pendentes === 0);
}

const { all } = await import('../src/db.js');

// 7 · a medicao da velocidade (OPAR 05/09/2026) -------------------------------
// A divida pedia um benchmark de bancada que nunca aconteceu. O produto passa a
// medir a si mesmo em operacao — e o que ele guarda tem de ser SO' maquina.
{
  const antes = TRANSC.velocidadeObservada().medicoes;
  const r = await TRANSC.transcrever(wav(3));
  T('a transcricao devolve a duracao do audio e o fator observado',
    Number.isFinite(r.audio_s) && r.audio_s > 0 && Number.isFinite(r.fator));
  TRANSC.registrarMedicao({ audio_s: r.audio_s, ms: r.ms });
  const v = TRANSC.velocidadeObservada();
  T('a medicao entra e a velocidade passa a ser observada, nao estimada',
    v.medicoes === antes + 1 && v.fator_mediano != null && v.segundos_por_minuto != null);
  // O QUE NAO PODE ESTAR LA'. Metrica de maquina nao e' dado de pessoa: se a
  // linha guardasse texto, encontro ou educador, viraria registro de quem falou
  // quanto — e a promessa de que a transcricao nao persiste seria falsa.
  const colunas = all(`SELECT * FROM transcricao_medida LIMIT 1`)[0] ?? {};
  const proibidas = Object.keys(colunas).filter(k =>
    /texto|transcri[cç]|educador|crianca|encontro|turma|folha/i.test(k) && k !== 'criado_em');
  T('a medicao nao guarda texto, pessoa nem encontro', proibidas.length === 0, proibidas.join(','));
  T('a mediana ignora o outlier de timeout', (() => {
    for (const [a2, m] of [[60, 30000], [60, 42000], [60, 600000]]) TRANSC.registrarMedicao({ audio_s: a2, ms: m });
    return TRANSC.velocidadeObservada().fator_mediano < 2;
  })());
}

rmSync(dirTemp, { recursive: true, force: true });
console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m`);
process.exit(falhas ? 1 : 0);
