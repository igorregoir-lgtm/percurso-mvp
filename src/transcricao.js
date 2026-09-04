// Percurso — transcricao de audio longo e de arquivo (portas A', B e C da jornada v2).
//
// ONDE ISTO RODA, E POR QUE IMPORTA: no COMPUTADOR DO INSTITUTO, nao no celular.
// O whisper.cpp e' um binario de host; o aparelho manda o audio pela rede local
// para virar texto. A tela diz exatamente isso (F0) — prometer "nada sai do
// aparelho" aqui seria repetir a mentira que a F0 acabou de desfazer.
//
// DEPENDENCIA: `whisper-cli` do sistema (brew install whisper-cpp), mesmo padrao
// do llama-server. Nada entra por npm — a decisao tecnica n. 1 continua de pe'.
//
// DESLIGADO POR PADRAO: PERCURSO_AUDIO=1 liga. Sem ele o produto e' identico ao
// de antes, e a tela oferece so' as portas que existem.
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, rmSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erro } from './domain.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

export const AUDIO_ENABLED = process.env.PERCURSO_AUDIO === '1';
export const MODELO = process.env.PERCURSO_AUDIO_MODELO || join(RAIZ, 'models', 'ggml-small.bin');
export const BINARIO = process.env.PERCURSO_WHISPER || 'whisper-cli';
const TIMEOUT_MS = Number(process.env.PERCURSO_AUDIO_TIMEOUT_MS) || 10 * 60 * 1000;
const TETO_BYTES = Number(process.env.PERCURSO_AUDIO_MAX_BYTES) || 120 * 1024 * 1024;

// O diretorio e' UM so', declarado, e fora de public/ — nada de audio servido
// por engano como arquivo estatico.
export const DIR = join(RAIZ, 'data', 'audio-temp');

// --------------------------------------------------------------------------
// Ciclo de vida do arquivo. Isto e' MECANISMO, nao promessa.
//
// A revisao do plano pegou o buraco: "audio apagado ao virar texto" era frase.
// whisper.cpp LE ARQUIVO — logo existe arquivo, logo existe janela em que ele
// sobrevive. Tres defesas, porque uma so' falha em silencio:
//   1. apagar no `finally` — cobre sucesso, erro e timeout;
//   2. varredura de orfaos no boot — cobre queda do processo no meio;
//   3. teto de idade na varredura — cobre concorrencia (nao apagar o arquivo
//      de uma transcricao que ainda esta rodando).
// --------------------------------------------------------------------------
const IDADE_ORFAO_MS = 30 * 60 * 1000;

export function varrerOrfaos({ tudo = false } = {}) {
  if (!existsSync(DIR)) return { apagados: 0 };
  let apagados = 0;
  for (const nome of readdirSync(DIR)) {
    const caminho = join(DIR, nome);
    try {
      if (!tudo && Date.now() - statSync(caminho).mtimeMs < IDADE_ORFAO_MS) continue;
      rmSync(caminho, { force: true });
      apagados++;
    } catch { /* arquivo sumiu entre o readdir e o rm: e' o desfecho desejado */ }
  }
  return { apagados };
}

/** Quantos arquivos existem agora. Existe para o TESTE poder afirmar o zero. */
export function pendentes() {
  if (!existsSync(DIR)) return 0;
  return readdirSync(DIR).length;
}

function rodar(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = execFile(BINARIO, args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 },
      (e, stdout, stderr) => {
        if (e) {
          const causa = e.killed || e.signal === 'SIGTERM' ? 'timeout'
            : e.code === 'ENOENT' ? 'sem_binario' : 'falhou';
          return reject(Object.assign(new Error(String(stderr || e.message).slice(0, 400)), { causa }));
        }
        resolve(String(stdout || ''));
      });
    p.on('error', (e) => reject(Object.assign(e, { causa: e.code === 'ENOENT' ? 'sem_binario' : 'falhou' })));
  });
}

export function estadoDoAudio() {
  return {
    habilitada: AUDIO_ENABLED,
    modelo_presente: existsSync(MODELO),
    pendentes: pendentes(),
  };
}

/**
 * Transcreve um WAV 16 kHz mono. O cliente ja' converte (OfflineAudioContext),
 * para nao precisarmos de ffmpeg — mais um binario numa casa sem equipe de TI
 * seria custo real, nao detalhe.
 */
export async function transcrever(buffer, { idioma = 'pt' } = {}) {
  if (!AUDIO_ENABLED) throw erro(503, 'A transcrição de áudio está desligada. O registro por escrito continua completo.', { causa: 'desligada' });
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw erro(422, 'Áudio vazio.');
  if (buffer.length > TETO_BYTES) throw erro(413, `Áudio grande demais (máx. ${Math.round(TETO_BYTES / 1024 / 1024)} MB).`);
  if (!existsSync(MODELO)) throw erro(503, 'O modelo de áudio não está instalado nesta máquina.', { causa: 'sem_modelo' });

  mkdirSync(DIR, { recursive: true });
  const caminho = join(DIR, `${randomUUID()}.wav`);
  try {
    writeFileSync(caminho, buffer, { mode: 0o600 });
    const saida = await rodar([
      '-m', MODELO, '-f', caminho,
      '-l', idioma,
      '-nt',            // sem marcas de tempo: queremos texto corrido
      '-np',            // sem cabecalho de progresso no stdout
      '-t', String(Math.max(1, Math.min(8, (process.env.PERCURSO_AUDIO_THREADS | 0) || 4))),
    ], TIMEOUT_MS);
    const texto = saida.split('\n').map((l) => l.trim()).filter(Boolean).join(' ').trim();
    if (!texto) throw erro(422, 'Não consegui entender o áudio. Dá para tentar de novo, ou escrever.', { causa: 'vazio' });
    return { texto, bytes: buffer.length };
  } catch (e) {
    if (e.status) throw e;
    const msg = { sem_binario: 'O transcritor não está instalado nesta máquina (whisper-cli).',
      timeout: 'A transcrição passou do tempo limite.' }[e.causa]
      || 'A transcrição falhou nesta máquina.';
    throw erro(503, `${msg} O registro por escrito continua completo.`, { causa: e.causa || 'falhou' });
  } finally {
    // SEMPRE. Sucesso, erro, timeout — o arquivo nao sobrevive a esta funcao.
    rmSync(caminho, { force: true });
  }
}
