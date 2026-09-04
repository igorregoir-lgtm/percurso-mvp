// Percurso — captura de audio longo no cliente (portas A', B e C da jornada v2).
//
// POR QUE ISTO EXISTE NUM ARQUIVO PROPRIO: metade daqui e' regra pura — o
// cabecalho WAV, a mistura para mono, o corte do bloco — e regra tem que ser
// testavel sem navegador (mesmo motivo do `fila.js`, achado A-04 da auditoria).
// A outra metade toca `MediaRecorder` e `AudioContext`, que so' existem no
// navegador; fica isolada nas funcoes marcadas.
//
// POR QUE CONVERTER NO CLIENTE: o whisper le WAV 16 kHz mono. Converter no
// servidor exigiria `ffmpeg` — mais um binario numa casa que nao tem
// profissional de tecnologia. O navegador ja' sabe decodificar audio; usar isso
// e' de graca e nao adiciona instalacao nenhuma.

export const TAXA = 16000;

// O bloco existe por MEMORIA, nao por gosto. Decodificar uma hora de audio de
// uma vez custa mais de 1 GB de Float32 e mata o celular. Gravando em blocos
// fechados, cada um vira texto sozinho e a memoria volta ao chao entre eles.
export const BLOCO_SEGUNDOS = 300;      // 5 min
export const TETO_BLOCOS = 24;          // 2 h de encontro
export const TETO_ARQUIVO_BYTES = 25 * 1024 * 1024;

// --------------------------------------------------------------------- puro
/** Mistura N canais em um, somando e dividindo. Aceita qualquer objeto com a
 *  forma de um AudioBuffer — e' o que torna isto testavel fora do navegador. */
export function misturarMono(buffer) {
  const n = buffer.numberOfChannels;
  if (n === 1) return buffer.getChannelData(0);
  const saida = new Float32Array(buffer.length);
  for (let c = 0; c < n; c++) {
    const canal = buffer.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) saida[i] += canal[i] / n;
  }
  return saida;
}

/** Float32 [-1,1] -> WAV PCM 16 bits mono. Satura em vez de estourar: uma
 *  amostra acima de 1 vira o maximo, nunca um estalo por overflow. */
export function wavDeAmostras(amostras, taxa = TAXA) {
  const bytes = amostras.length * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const v = new DataView(buf);
  const texto = (pos, s) => { for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i)); };
  texto(0, 'RIFF');
  v.setUint32(4, 36 + bytes, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  v.setUint32(16, 16, true);      // tamanho do bloco fmt
  v.setUint16(20, 1, true);       // PCM
  v.setUint16(22, 1, true);       // mono
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true); // bytes por segundo
  v.setUint16(32, 2, true);        // alinhamento do quadro
  v.setUint16(34, 16, true);       // bits por amostra
  texto(36, 'data');
  v.setUint32(40, bytes, true);
  for (let i = 0; i < amostras.length; i++) {
    const a = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, a < 0 ? a * 0x8000 : a * 0x7fff, true);
  }
  return buf;
}

/** Junta os textos dos blocos na ordem em que foram gravados, sem inventar
 *  pontuacao entre eles — o que a pessoa falou e' o que fica. */
export function juntarBlocos(textos) {
  return textos.map(t => String(t ?? '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- navegador
export const podeGravar = () =>
  typeof window !== 'undefined'
  && !!navigator?.mediaDevices?.getUserMedia
  && typeof window.MediaRecorder === 'function';

/** O primeiro tipo que o aparelho aceita. Safari devolve mp4/aac, Chrome webm
 *  /opus — os dois o proprio navegador sabe decodificar depois. */
export function melhorTipo() {
  const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', ''];
  return tipos.find(t => !t || window.MediaRecorder?.isTypeSupported?.(t)) ?? '';
}

/** O primeiro tipo de VIDEO que o aparelho aceita gravar (decisao 41). Safari
 *  devolve mp4, Chrome webm — os dois tocam de volta no proprio navegador. */
export function melhorTipoVideo() {
  const tipos = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm', ''];
  return tipos.find(t => !t || window.MediaRecorder?.isTypeSupported?.(t)) ?? '';
}

/**
 * Grava o VIDEO do responsavel consentindo — a prova do consentimento.
 *
 * Ao contrario de `iniciarGravacao`, aqui NAO ha' blocos: o arquivo e' um so',
 * curto, e vai inteiro para o servidor. O teto de tempo existe para o vídeo
 * caber no limite do servidor sem a pessoa precisar saber o que e' um megabyte.
 */
export async function gravarVideoConsentimento({ aoSegundo, aoParar, tetoSegundos = 90 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: true,
  });
  const tipo = melhorTipoVideo();
  const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo, videoBitsPerSecond: 900_000 } : undefined);
  const pedacos = [];
  let segundos = 0;
  const relogio = setInterval(() => {
    segundos++;
    aoSegundo?.(segundos);
    if (segundos >= tetoSegundos) parar();
  }, 1000);

  const encerrar = () => {
    clearInterval(relogio);
    for (const t of stream.getTracks()) { try { t.stop(); } catch { /* ja' parou */ } }
  };
  function parar() { try { rec.state !== 'inactive' && rec.stop(); } catch { encerrar(); } }

  rec.ondataavailable = (e) => { if (e.data?.size) pedacos.push(e.data); };
  rec.onstop = () => {
    encerrar();
    aoParar?.(new Blob(pedacos, { type: rec.mimeType || tipo || 'video/webm' }));
  };
  rec.start();
  return { parar, cancelar: () => { rec.onstop = encerrar; parar(); }, stream };
}

/**
 * Converte qualquer audio que o navegador saiba ler em WAV 16 kHz mono.
 *
 * Decodifica JA' em 16 kHz quando o navegador aceita a taxa no construtor —
 * isso corta a memoria por tres e dispensa a reamostragem. Quando nao aceita,
 * decodifica no padrao e reamostra com `OfflineAudioContext`.
 */
export async function paraWav16k(blob) {
  const bytes = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Ctx) throw Object.assign(new Error('Este navegador não converte áudio.'), { causa: 'sem_audiocontext' });

  let buffer = null;
  try {
    const ctx = new Ctx({ sampleRate: TAXA });
    // `decodeAudioData` DESANEXA o ArrayBuffer que recebe. A copia existe para
    // o caminho de reserva ainda ter bytes para decodificar.
    buffer = await ctx.decodeAudioData(bytes.slice(0));
    ctx.close?.();
  } catch {
    try {
      const ctx = new Ctx();
      buffer = await ctx.decodeAudioData(bytes.slice(0));
      ctx.close?.();
    } catch {
      throw Object.assign(new Error('Este navegador não conseguiu ler este áudio.'), { causa: 'sem_decodificar' });
    }
  }

  let amostras = misturarMono(buffer);
  if (buffer.sampleRate !== TAXA) {
    if (!Off) throw Object.assign(new Error('Este navegador não converte a taxa deste áudio.'), { causa: 'sem_offline' });
    const alvo = Math.max(1, Math.round(buffer.length * TAXA / buffer.sampleRate));
    const off = new Off(1, alvo, TAXA);
    const fonte = off.createBufferSource();
    const mono = off.createBuffer(1, buffer.length, buffer.sampleRate);
    mono.copyToChannel ? mono.copyToChannel(amostras, 0) : mono.getChannelData(0).set(amostras);
    fonte.buffer = mono;
    fonte.connect(off.destination);
    fonte.start();
    amostras = (await off.startRendering()).getChannelData(0);
  }
  return new Blob([wavDeAmostras(amostras, TAXA)], { type: 'audio/wav' });
}

/**
 * Gravador em blocos fechados. Cada bloco e' um arquivo completo e sozinho
 * decodificavel — por isso o gravador PARA e RECOMECA a cada `BLOCO_SEGUNDOS`
 * em vez de usar `timeslice`, cujos pedacos nao sao arquivos.
 *
 * `aoBloco(blob, n)` e' chamado assim que cada bloco fecha, para o texto ir
 * saindo durante o encontro em vez de tudo no fim.
 */
export async function iniciarGravacao({ aoBloco, aoSegundo, aoErro, blocoSegundos = BLOCO_SEGUNDOS, tetoBlocos = TETO_BLOCOS }) {
  const trilha = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const tipo = melhorTipo();
  let rec = null, pedacos = [], n = 0, segundos = 0, vivo = true, relogio = null, rodizio = null;

  const fecharTrilha = () => trilha.getTracks().forEach(t => { try { t.stop(); } catch {} });

  const novoBloco = () => {
    rec = tipo ? new MediaRecorder(trilha, { mimeType: tipo }) : new MediaRecorder(trilha);
    pedacos = [];
    rec.ondataavailable = (ev) => { if (ev.data?.size) pedacos.push(ev.data); };
    rec.onstop = () => {
      const blob = new Blob(pedacos, { type: tipo || 'audio/webm' });
      pedacos = [];
      if (blob.size) aoBloco?.(blob, ++n);
      if (vivo) { if (n >= tetoBlocos) parar(); else novoBloco(); }
    };
    rec.onerror = (ev) => { aoErro?.(ev?.error || new Error('A gravação falhou.')); parar(); };
    rec.start();
  };

  function parar() {
    if (!vivo) return;
    vivo = false;
    clearInterval(relogio); clearInterval(rodizio);
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch {}
    fecharTrilha();
  }

  novoBloco();
  relogio = setInterval(() => { segundos++; aoSegundo?.(segundos); }, 1000);
  rodizio = setInterval(() => { try { rec?.state === 'recording' && rec.stop(); } catch {} }, blocoSegundos * 1000);

  return {
    parar,
    /** Descarta: para a gravacao e avisa que o que houver nao deve ser usado. */
    cancelar() { aoBloco = null; parar(); },
    get segundos() { return segundos; },
  };
}
