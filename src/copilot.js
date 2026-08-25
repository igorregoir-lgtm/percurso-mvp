// Percurso — copilot pedagógico local (Fase 2 do plano de IA).
//
// Orquestra, NESTA ORDEM OBRIGATÓRIA (auditoria do plano, ETICA-DOUTRINA-01/02):
//   1. filtrarPerimetro sobre o texto ORIGINAL com os nomes reais — a 5ª
//      categoria (estado interno de criança nomeada) precisa do nome para
//      disparar; frase barrada é removida com encaminhamento humano;
//   2. recusas determinísticas (diagnóstico, atributo sensível, score);
//   3. pseudonimização dos nomes remanescentes (mapa fica FORA do prompt);
//   4. RAG top-k sobre a consulta já anonimizada;
//   5. modelo local com saída FORÇADA por json_schema nos 7 blocos;
//   6. verificador de citações — id citado tem que existir nos trechos dados.
//
// Doutrina: a IA nunca grava; memória só de sessão (RAM, TTL); fallback
// determinístico em 100% das falhas; a decisão é sempre humana.
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { all } from './db.js';
import { filtrarPerimetro, erro, PARAMS } from './domain.js';
import { conversar, AI_ENABLED } from './ai-client.js';
import { anonimizarTexto, nomeDoToken } from './rag/anonimizar.js';
import { criarSessoes } from './sessoes.js';
import { buscar, corpusDisponivel } from './rag/search.js';
import { validarExtracao, extrairDaFala } from './voz.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOACOES = join(RAIZ, 'data', 'ai-doacoes.jsonl');

const promptDe = (nome) => readFileSync(join(RAIZ, 'ai', 'prompts', nome), 'utf8')
  .split('\n---\n').pop().trim();
let PROMPT_REFLEXIVO = null;
let PROMPT_ESTRUTURADO = null;

// ---------------------------------------------------------------------------
// Contrato de resposta do Modo B — os 7 blocos, garantidos por json_schema.
// ---------------------------------------------------------------------------
// Nota de implementação: SEM maxLength nas strings — o conversor json_schema →
// gramática do llama.cpp transforma limites de comprimento em repetições
// explícitas e o sampling degrada (medido: 143 t/s → 1,5 t/s). A estrutura,
// os enums e os min/maxItems ficam na gramática; o teto de tamanho é aplicado
// DEPOIS, deterministicamente (podarResposta).
export const SCHEMA_REFLEXIVO = {
  name: 'resposta_reflexiva',
  schema: {
    type: 'object',
    required: ['entendi', 'perguntas', 'hipoteses', 'alternativas', 'contraponto', 'fontes', 'proximo_passo', 'escalonamento'],
    additionalProperties: false,
    properties: {
      entendi: { type: 'string' },
      perguntas: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } },
      hipoteses: {
        type: 'array', minItems: 2, maxItems: 3,
        items: {
          type: 'object', required: ['rotulo', 'texto'], additionalProperties: false,
          properties: {
            rotulo: { type: 'string', enum: ['possível', 'a investigar'] },
            texto: { type: 'string' },
          },
        },
      },
      alternativas: {
        type: 'array', minItems: 3, maxItems: 4,
        items: {
          type: 'object', required: ['acao', 'limites'], additionalProperties: false,
          properties: { acao: { type: 'string' }, limites: { type: 'string' } },
        },
      },
      contraponto: { type: 'string' },
      fontes: {
        type: 'array', maxItems: 6,
        items: {
          type: 'object', required: ['id'], additionalProperties: false,
          properties: { id: { type: 'string' }, trecho_usado: { type: 'string' } },
        },
      },
      proximo_passo: { type: 'string' },
      escalonamento: { type: ['string', 'null'] },
    },
  },
};

// Teto de tamanho pós-gramática — determinístico, no lugar do maxLength.
const poda = (s, n) => typeof s === 'string' && s.length > n ? s.slice(0, n - 1) + '…' : s;
function podarResposta(r) {
  return {
    ...r,
    entendi: poda(r.entendi, 700),
    perguntas: (r.perguntas || []).map(p => poda(p, 350)),
    hipoteses: (r.hipoteses || []).map(h => ({ ...h, texto: poda(h.texto, 500) })),
    alternativas: (r.alternativas || []).map(a => ({ acao: poda(a.acao, 400), limites: poda(a.limites, 350) })),
    contraponto: poda(r.contraponto, 600),
    proximo_passo: poda(r.proximo_passo, 500),
    escalonamento: r.escalonamento == null ? null : poda(r.escalonamento, 500),
  };
}

// ---------------------------------------------------------------------------
// Recusas determinísticas — antes de qualquer modelo. Explicáveis linha a linha.
// ---------------------------------------------------------------------------
export const RECUSAS = [
  {
    motivo: 'pedido de diagnóstico',
    re: /\b(diagn[óo]stic\w*|tdah|autis(mo|ta)\w*|dislexia|transtorno\w*|laudo)\b/i,
    resposta: 'Diagnóstico é ato clínico e fica fora daqui — nem eu nem o Percurso diagnosticamos. O caminho é a coordenação e, quando for o caso, a psicóloga do Instituto. Posso ajudar a refletir sobre o que você OBSERVA no encontro e o que testar na prática pedagógica.',
  },
  {
    motivo: 'pedido de score/nota por modelo',
    re: /\b(que|qual|d[êe]|atribu[ai]\w*)\b[^.!?]{0,40}\b(nota|score|pontua[çc][ãa]o|n[íi]vel)\b|\bpontue\b/i,
    resposta: 'O escore nunca nasce de modelo: nasce da rubrica que VOCÊ preenche, ancorada no que observou. Posso ajudar a pensar as âncoras da rubrica — a marcação é sua.',
  },
  {
    motivo: 'inferência de atributo sensível',
    re: /\b(ra[çc]a|cor da pele|etnia|religi[ãa]o|orienta[çc][ãa]o sexual)\b/i,
    resposta: 'Atributo sensível (raça, religião, orientação, condição de saúde ou familiar) não é matéria para inferência — nem minha, nem do sistema. Se a questão é pedagógica, descreva a situação observada que eu ajudo a pensá-la.',
  },
];

// ---------------------------------------------------------------------------
// Memória só de sessão — RAM com TTL; nada persiste por padrão. A política
// vive em src/sessoes.js, compartilhada com o assistente (Passo).
// ---------------------------------------------------------------------------
const MAX_TROCAS = 8;
const memoria = criarSessoes();
const sessaoDe = (u, sessaoId) => memoria.sessaoDe(u, sessaoId);

export function apagarSessao(u, sessaoId) {
  memoria.apagar(u, sessaoId);
  return { ok: true, aviso: 'Sessão apagada. Nada dela foi persistido.' };
}

// ---------------------------------------------------------------------------
// Fila de geração: no máx. 2 no modelo, espera limitada (teto 4) → 503.
// ---------------------------------------------------------------------------
const MAX_CONCORRENTES = 2;
const MAX_ESPERA = 4;
let emVoo = 0;
const fila = [];

// Exportada: TODA chamada ao modelo passa por aqui — inclusive o
// /api/sroi/explicar. O llama-server tem --parallel 2; chamada por fora da
// fila degradaria todo mundo (timeouts em cascata).
export async function comVaga(fn) {
  if (emVoo >= MAX_CONCORRENTES) {
    if (fila.length >= MAX_ESPERA)
      throw erro(503, 'O copilot está ocupado agora. Tente de novo em instantes — o registro manual continua funcionando.');
    await new Promise(res => fila.push(res));
  }
  emVoo++;
  try { return await fn(); }
  finally {
    emVoo--;
    const proximo = fila.shift();
    if (proximo) proximo();
  }
}

/** Nomes que a pseudonimização precisa cobrir. SEMPRE o roster completo de
 *  crianças ativas, para QUALQUER papel: o escopo de papel governa o que a
 *  pessoa PODE VER, não o conjunto de nomes protegidos — a educadora pode
 *  citar uma criança de outra turma (irmão, incidente no pátio) e esse nome
 *  também não pode chegar ao modelo nem à busca (revisão de 25/08,
 *  SEGURANCA-IA-02). */
export function nomesParaAnonimizar(_u) {
  return all(`SELECT DISTINCT nome FROM crianca WHERE ativo = 1`).map(r => r.nome);
}

/** Verificador de citações: só sobrevive fonte cujo id foi de fato fornecido. */
export function verificarCitacoes(resposta, trechos) {
  const validos = new Set(trechos.map(t => String(t.chunk_id)));
  const fontesVerificadas = [];
  let invalidas = 0;
  for (const f of resposta.fontes || []) {
    if (validos.has(String(f.id))) {
      const t = trechos.find(x => String(x.chunk_id) === String(f.id));
      fontesVerificadas.push({ id: String(f.id), source_id: t.source_id, titulo: t.titulo, secao: t.secao });
    } else invalidas++;
  }
  return {
    ...resposta,
    fontes: fontesVerificadas,
    fontes_invalidas_descartadas: invalidas,
    sem_fonte_no_corpus: fontesVerificadas.length === 0,
  };
}

/** Pipeline determinístico que antecede o modelo — exportado para teste direto. */
export function prepararEntrada(mensagem, nomes) {
  const perimetro = filtrarPerimetro(mensagem, nomes);
  // Depois do filtro, sobra conversa de verdade? Fragmento residual (ex.: só o
  // nome da criança, porque a frase sensível foi removida) não sustenta uma
  // reflexão — vira encaminhamento, não chamada de modelo.
  const palavrasRestantes = (perimetro.limpo.match(/\S+/g) || []).length;
  if (!perimetro.limpo || (perimetro.bloqueado && palavrasRestantes < 6) || palavrasRestantes < 3) {
    return { barrado: true, perimetro };
  }
  for (const r of RECUSAS) {
    if (r.re.test(perimetro.limpo)) return { barrado: false, recusa: r, perimetro };
  }
  const anon = anonimizarTexto(perimetro.limpo, nomes);
  return { barrado: false, perimetro, anon };
}

const AVISO_FIXO = 'Sugestão de reflexão gerada por modelo local — hipóteses não são fatos; a decisão pedagógica é sua. Nomes foram substituídos por pseudônimos antes do modelo.';

export async function chat(u, { mode = 'reflexivo', message, session_id }) {
  if (!AI_ENABLED) throw erro(503, 'A camada de IA está desligada (AI_ENABLED=false). O registro manual continua completo.');
  if (mode !== 'reflexivo')
    throw erro(422, 'O Modo A (estruturado) vive no fluxo de voz da folha do dia, não no chat. Aqui é a sala de reflexão (Modo B).');
  const texto = String(message ?? '').trim();
  if (!texto) throw erro(422, 'Escreva a situação que você quer refletir.');
  if (texto.length > 2000) throw erro(422, 'Mensagem longa demais (máx. 2000 caracteres).');
  const sessaoId = String(session_id || randomUUID());
  const sessao = sessaoDe(u, sessaoId);

  const nomes = nomesParaAnonimizar(u);
  const prep = prepararEntrada(texto, nomes);

  // 1. perímetro: tudo barrado → encaminhamento humano, sem modelo.
  if (prep.barrado) {
    return {
      session_id: sessaoId, tipo: 'encaminhamento',
      trechos: prep.perimetro.trechos,
      mensagem: 'Tem algo aí que não entra no sistema — fale com a coordenação; esse caminho é fora daqui. Nada foi gravado nem enviado ao modelo.',
    };
  }
  // 2. recusa determinística — sem modelo.
  if (prep.recusa) {
    return {
      session_id: sessaoId, tipo: 'recusa', motivo: prep.recusa.motivo,
      mensagem: prep.recusa.resposta,
      trechos_excluidos: prep.perimetro.trechos,
    };
  }

  // 3-4. pseudonimizado + RAG (a consulta que sai daqui não tem nome).
  const pergunta = prep.anon.texto;
  const trechos = corpusDisponivel() ? buscar({ q: pergunta, k: 4 }) : [];

  // 5. modelo — dentro da fila; qualquer falha → fallback claro.
  PROMPT_REFLEXIVO ??= promptDe('copilot-reflexivo.md');
  const contexto = trechos.length
    ? 'TRECHOS DO CORPUS APROVADO (cite pelo id):\n' + trechos.map(t =>
        `[fonte:${t.chunk_id}] ${t.titulo} — ${t.secao}\n${t.conteudo.slice(0, 1200)}`).join('\n\n')
    : 'NENHUM trecho do corpus corresponde à consulta — deixe as fontes vazias e marque suas leituras como suas.';
  const historico = sessao.trocas.slice(-MAX_TROCAS).flatMap(t => [
    { role: 'user', content: t.pergunta },
    { role: 'assistant', content: t.resumo },
  ]);

  let bruta;
  try {
    bruta = await comVaga(() => conversar({
      papel: 'reflexivo',
      schema: SCHEMA_REFLEXIVO,
      maxTokens: 2600,
      mensagens: [
        { role: 'system', content: PROMPT_REFLEXIVO },
        ...historico,
        { role: 'user', content: `${contexto}\n\nSITUAÇÃO TRAZIDA PELA EDUCADORA (pseudonimizada):\n${pergunta}` },
      ],
    }));
  } catch (e) {
    if (e.status === 503) throw e; // fila cheia — mensagem própria
    const detalhe = { timeout: '(o modelo demorou além do limite)',
      saida_invalida: '(a resposta do modelo veio malformada e foi descartada)',
      fora_do_ar: '(o servidor do modelo não respondeu)' }[e.causa] || '(falha na chamada ao modelo)';
    throw erro(503, `O copilot está fora do ar — o registro manual continua. ${detalhe}`);
  }

  // 6. verificação determinística das citações + teto de tamanho pós-gramática.
  const verificada = verificarCitacoes(podarResposta(bruta.objeto), trechos);

  const indice = sessao.trocas.push({
    pergunta,
    resumo: `entendi: ${verificada.entendi}\nalternativas: ${verificada.alternativas.map(a => a.acao).join(' | ')}`,
    resposta: verificada,
    quando: new Date().toISOString(),
  }) - 1;

  return {
    session_id: sessaoId,
    // O índice DESTA reflexão na sessão do servidor — o cliente usa ele na
    // doação, em vez de recontar posições (sessão pode expirar; envios podem
    // se cruzar).
    indice,
    tipo: 'reflexao',
    pergunta_anonimizada: pergunta,
    nomes_substituidos: prep.anon.substituicoes,
    trechos_excluidos: prep.perimetro.trechos,
    resposta: verificada,
    aviso: AVISO_FIXO,
    limite_declarado: 'A pseudonimização cobre os nomes do cadastro; não cobre apelidos nem descrições que identifiquem. Descreva a situação, não a criança.',
  };
}

// ---------------------------------------------------------------------------
// Doação explícita de interação (funil lícito do dataset LoRA — Fase 4).
// Nada é persistido por padrão; doar é ato da pessoa, por interação, com
// pré-visualização e revogação.
// ---------------------------------------------------------------------------
export function preverDoacao(u, sessaoId, indice) {
  // Lookup puro: uma prévia não pode criar sessão vazia nem renovar o TTL.
  const s = memoria.obter(u, sessaoId);
  const troca = s?.trocas?.[indice];
  if (!troca) throw erro(404, 'Interação não encontrada na sessão (sessões expiram e nada fica gravado).');
  return { pergunta: troca.pergunta, resposta: troca.resposta, quando: troca.quando };
}

export function doarInteracao(u, sessaoId, indice) {
  const previa = preverDoacao(u, sessaoId, indice);
  // Validação de anonimização ANTES de persistir: nenhum nome de criança ativa
  // pode aparecer no que será gravado (revalida — não confia no caminho feliz).
  const nomes = all(`SELECT nome FROM crianca WHERE ativo = 1`).map(r => r.nome);
  const blob = JSON.stringify(previa);
  const { substituicoes } = anonimizarTexto(blob, nomes);
  if (substituicoes > 0)
    throw erro(422, 'A doação foi bloqueada: o conteúdo ainda contém nome de criança. Nada foi gravado.');
  const registro = {
    id: randomUUID(),
    quando: new Date().toISOString(),
    doador: { id: u.id, papel: u.papel },
    ...previa,
  };
  appendFileSync(DOACOES, JSON.stringify(registro) + '\n');
  return { ok: true, id: registro.id, aviso: 'Interação doada (anonimizada) para o futuro dataset. Você pode revogar com o id.' };
}

export function revogarDoacao(u, id) {
  if (!existsSync(DOACOES)) throw erro(404, 'Não há doações registradas.');
  const linhas = readFileSync(DOACOES, 'utf8').split('\n').filter(Boolean);
  // Revogação é do DOADOR (a coordenação pode revogar qualquer uma — mesma
  // lógica de papel do resto do produto). Doação de outra pessoa não some
  // silenciosamente pela mão de terceiro.
  const podeRevogar = (l) => {
    try {
      const d = JSON.parse(l);
      if (d.id !== id) return false;
      return u.papel === 'coordenacao' || d.doador?.id === u.id;
    } catch { return false; }
  };
  const alvo = linhas.find(podeRevogar);
  const existe = linhas.some(l => { try { return JSON.parse(l).id === id; } catch { return false; } });
  if (!alvo) {
    if (existe) throw erro(403, 'Esta doação é de outra pessoa. Quem doou (ou a coordenação) é quem revoga.');
    throw erro(404, 'Doação não encontrada.');
  }
  const restantes = linhas.filter(l => l !== alvo);
  writeFileSync(DOACOES, restantes.length ? restantes.join('\n') + '\n' : '');
  return { ok: true, aviso: 'Doação removida do arquivo local.' };
}

// ---------------------------------------------------------------------------
// Modo A com modelo (opcional; AI_EXTRATOR=1) — wrapper sobre o slot da
// decisão 13. Pseudonimização reversível ANTES do modelo; de-mapeamento fora
// dele; QUALQUER falha cai para o extrator lexical. Contrato intocado.
// ---------------------------------------------------------------------------
export const AI_EXTRATOR = ['1', 'true'].includes(String(process.env.AI_EXTRATOR || '').toLowerCase());

export async function extrairComModelo(transcricao, nomesDaTurma = [], nomesTodos = null) {
  const fallback = () => ({ ...extrairDaFala(transcricao, nomesDaTurma), origem: 'regras' });
  if (!AI_ENABLED) return fallback();

  // 1. perímetro no texto ORIGINAL (a 5ª categoria precisa dos nomes reais).
  const perimetro = filtrarPerimetro((transcricao || '').trim(), nomesDaTurma);
  if (!perimetro.limpo || perimetro.limpo.split(/\s+/).length < 4) return fallback();

  // 2. pseudonimização reversível — o modelo só vê tokens. A substituição usa
  //    o roster COMPLETO (criança de outra turma citada na fala também é
  //    protegida); só tokens de crianças DESTA turma valem para faltas.
  const roster = nomesTodos ?? nomesDaTurma;
  const anon = anonimizarTexto(perimetro.limpo, roster);
  const daTurma = new Set(nomesDaTurma);
  const tokensValidos = anon.mapa.filter(m => daTurma.has(m.nome)).map(m => m.token);

  PROMPT_ESTRUTURADO ??= promptDe('copilot-estruturado.md');
  const schema = {
    name: 'extracao_folha',
    schema: {
      type: 'object',
      required: ['atividade', 'area_tematica', 'marcadores_turma', 'pediram_ajuda', 'faltas_mencionadas', 'confianca'],
      additionalProperties: false,
      properties: {
        atividade: { type: 'string', enum: ['roda', 'brincadeira', 'leitura', 'desenho', 'musica', 'parque', 'nao_identificada'] },
        area_tematica: { type: 'string', enum: ['educacao', 'saude', 'esporte', 'artes', 'tecnologia', 'outra', 'nenhuma'] },
        marcadores_turma: { type: 'array', maxItems: 4, items: { type: 'string', enum: ['colaborou', 'participou', 'agitado', 'disperso', 'alegre', 'cansado'] } },
        pediram_ajuda: { type: 'integer', minimum: 0, maximum: 30 },
        faltas_mencionadas: { type: 'array', maxItems: 10, items: tokensValidos.length ? { type: 'string', enum: tokensValidos } : { type: 'string', maxLength: 0 } },
        confianca: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  };

  try {
    const { objeto } = await conversar({
      papel: 'estruturado', schema, maxTokens: 300,
      mensagens: [
        { role: 'system', content: PROMPT_ESTRUTURADO },
        { role: 'user', content: anon.texto },
      ],
    });
    // 3. de-mapeamento FORA do modelo; token desconhecido → fallback.
    const faltas = [];
    for (const t of objeto.faltas_mencionadas || []) {
      const nome = nomeDoToken(t, anon.mapa);
      if (!nome) return fallback();
      faltas.push(nome);
    }
    const extracao = {
      atividade: objeto.atividade,
      area_tematica: objeto.area_tematica,
      marcadores_turma: [...new Set(objeto.marcadores_turma || [])].slice(0, 4),
      pediram_ajuda: objeto.pediram_ajuda ?? 0,
      faltas_mencionadas: faltas,
      confianca: Math.round((objeto.confianca ?? 0) * 100) / 100,
      conteudo_excluido: perimetro.bloqueado,
    };
    // 4. o MESMO validador de schema do extrator lexical — contrato intocado.
    const v = validarExtracao(extracao);
    if (!v.valido) return fallback();
    if (extracao.confianca < PARAMS.CONFIANCA_MINIMA) {
      return { extracao: { ...extracao, atividade: 'nao_identificada', area_tematica: 'nenhuma', marcadores_turma: [], pediram_ajuda: 0, faltas_mencionadas: [] }, perimetro, origem: 'modelo' };
    }
    return { extracao, perimetro, origem: 'modelo' };
  } catch {
    return fallback();
  }
}
