// Percurso — cliente do modelo local (Fase 0 do plano de IA).
//
// Fala com o llama-server (llama.cpp) em 127.0.0.1 pela API OpenAI-compatível.
// Nenhuma dependência npm: fetch nativo + AbortController. O modelo NUNCA está
// na rede — só o Node local o alcança; nada de dado sai da máquina.
//
// Papéis (ai/model-manifest.json):
//   reflexivo   → 127.0.0.1:8081 (Qwen3 4B Instruct 2507) — copilot Modo B
//   estruturado → 127.0.0.1:8082 (Qwen3 1.7B, opcional)   — Modo A sob json_schema
// Se a porta do estruturado não responder, o cliente cai para a do reflexivo
// (um único 4B pode atender os dois papéis — decisão registrada no manifest).
//
// A IA é opt-in: AI_ENABLED=1 liga a camada; o padrão é DESLIGADA e o produto
// funciona idêntico ao que era. Ligar em operação real com educadoras é
// condicionado ao go da PoC (docs/POC-COPILOT.md).

export const AI_ENABLED = ['1', 'true'].includes(String(process.env.AI_ENABLED || '').toLowerCase());

const URL_REFLEXIVO = process.env.AI_URL_REFLEXIVO || 'http://127.0.0.1:8081';
const URL_ESTRUTURADO = process.env.AI_URL_ESTRUTURADO || 'http://127.0.0.1:8082';

// Timeouts por papel. Medição na máquina de desenvolvimento (M5 Max): 80 tokens
// em 0,6 s; a resposta de 7 blocos do Modo B (~700-900 tokens) fica na casa de
// poucos segundos. Em máquina modesta do Instituto isso multiplica — o teto alto
// existe para não derrubar resposta legítima; o fallback continua imediato
// quando o servidor nem responde (erro de conexão é instantâneo).
const TIMEOUT_MS = {
  reflexivo: Number(process.env.AI_TIMEOUT_REFLEXIVO_MS) || 90_000,
  estruturado: Number(process.env.AI_TIMEOUT_ESTRUTURADO_MS) || 20_000,
};

const bases = (papel) => papel === 'estruturado'
  ? [URL_ESTRUTURADO, URL_REFLEXIVO]   // fallback de porta declarado no manifest
  : [URL_REFLEXIVO];

async function vivo(base, ms = 1200) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    const r = await fetch(`${base}/health`, { signal: ac.signal });
    clearTimeout(t);
    return r.ok;
  } catch { return false; }
}

/** Estado da camada, por papel — alimenta GET /api/ia/status e a UI. */
export async function statusIA() {
  if (!AI_ENABLED) {
    return { habilitada: false, papeis: {}, aviso: 'AI_ENABLED=false — camada de IA desligada (padrão).' };
  }
  const papeis = {};
  for (const papel of ['reflexivo', 'estruturado']) {
    let pronto = false, base = null;
    for (const b of bases(papel)) {
      if (await vivo(b)) { pronto = true; base = b; break; }
    }
    papeis[papel] = { pronto, url: pronto ? base : null };
  }
  return { habilitada: true, papeis };
}

/**
 * Uma chamada de chat ao modelo local.
 * @param {object} p
 * @param {'reflexivo'|'estruturado'} p.papel
 * @param {Array<{role:string,content:string}>} p.mensagens
 * @param {object} [p.schema]      json_schema — a saída vem OBRIGATORIAMENTE válida
 *                                 contra ele (gramática do llama.cpp), ou falha.
 * @param {number} [p.maxTokens]
 * @param {number} [p.temperatura]
 * @returns {Promise<{texto:string, objeto:object|null}>}
 * @throws {Error} com .causa ('desligada'|'fora_do_ar'|'timeout'|'http'|'saida_invalida')
 *                 — quem chama decide o fallback determinístico.
 */
export async function conversar({ papel = 'reflexivo', mensagens, schema = null, maxTokens = 1024, temperatura = 0.7 }) {
  if (!AI_ENABLED) throw Object.assign(new Error('Camada de IA desligada (AI_ENABLED=false).'), { causa: 'desligada' });

  let base = null;
  for (const b of bases(papel)) if (await vivo(b)) { base = b; break; }
  if (!base) throw Object.assign(new Error(`Nenhum servidor de modelo respondeu para o papel "${papel}".`), { causa: 'fora_do_ar' });

  const corpo = {
    messages: mensagens,
    max_tokens: maxTokens,
    temperature: schema ? 0 : temperatura,
    ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: schema.name || 'saida', schema: schema.schema || schema } } } : {}),
  };

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS[papel] || 60_000);
  // O timeout cobre a resposta INTEIRA (headers + corpo): um servidor que manda
  // headers e trava o corpo também é timeout — senão o slot da fila fica preso
  // para sempre e o copilot morre em 503 até reiniciar.
  let dados;
  try {
    const resp = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: ac.signal,
    });
    if (!resp.ok) throw Object.assign(new Error(`Modelo respondeu HTTP ${resp.status}.`), { causa: 'http' });
    dados = await resp.json();   // abortável pelo mesmo signal
  } catch (e) {
    if (e.causa) throw e;
    if (e.name === 'AbortError')
      throw Object.assign(new Error('O modelo demorou além do limite.'), { causa: 'timeout' });
    if (e instanceof SyntaxError)
      throw Object.assign(new Error('Resposta do servidor do modelo não é JSON.'), { causa: 'saida_invalida' });
    throw Object.assign(new Error('Falha de conexão com o modelo.'), { causa: 'fora_do_ar' });
  } finally {
    clearTimeout(t);
  }
  const texto = dados?.choices?.[0]?.message?.content ?? '';
  let objeto = null;
  if (schema) {
    try { objeto = JSON.parse(texto); }
    catch { throw Object.assign(new Error('Saída do modelo não é JSON válido.'), { causa: 'saida_invalida' }); }
  }
  return { texto, objeto };
}
