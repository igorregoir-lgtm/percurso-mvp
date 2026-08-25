// Percurso — a cola do painel do Passo: sinais → catálogo → ranking → resposta.
//
// Determinístico de ponta a ponta. NÃO fala com o modelo (o refinamento de
// rótulo é rota separada, assíncrona e opcional) e NÃO escreve em banco nenhum.
// Se qualquer coisa falhar, cai no fallback estático que o produto já tinha.
import * as D from '../domain.js';
import * as R from '../relatorio.js';
import { sinaisDe, ENVELOPE_VAZIO } from './sinais.js';
import { CATALOGO, doPapel, semCobranca } from './catalogo.js';
import { ordenar, compor, explorar, SLOTS } from './ranking.js';
import { validarAcao, chipsDe } from '../assistente.js';
import * as P from './perfil.js';
import { CATALOGO as CAT, IDS_CATALOGO, TIPOS } from './catalogo.js';
import { ROTAS_CONHECIDAS_PASSO } from '../assistente.js';

// O vocabulário fechado do perfil nasce do catálogo: sem esta ligação,
// `registrar()` recusa tudo — é o que garante que só id conhecido vira chave.
P.ligarVocabulario({ ids: IDS_CATALOGO, tipos: TIPOS, rotas: ROTAS_CONHECIDAS_PASSO });

const maiuscula = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

const diaDoAno = (iso) => {
  const d = new Date(iso + 'T12:00:00Z');
  return Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 0))) / 86_400_000);
};

/** Hash curto e estável da lista — o cliente usa para não trocar um painel velho. */
function hashDe(ids) {
  let h = 5381;
  const s = ids.join('|');
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/** O resumo do dia é TEMPLATE, nunca modelo — e nunca empilha dívida em quem sumiu. */
function resumoDe(env, escolhidas, resumoOnly = []) {
  if (env.vazio) return null;
  // Retomada substitui o resumo, nunca soma com ele: empilhar dívida em quem
  // ficou um tempo fora é o oposto do desenho anti-abandono.
  if (env.em_lapso) {
    const r = resumoOnly.find(c => c.apenasResumo);
    return r ? `${r.rotulo}. ${maiuscula(r.texto(env))}` : null;
  }
  const primeira = escolhidas[0];
  if (!primeira) return null;
  if (primeira.classe === 'alivio') return maiuscula(primeira.texto(env));
  const pend = escolhidas.filter(c => c.classe === 'pendencia').length;
  if (pend === 0) return null;
  return maiuscula(primeira.texto(env));
}

/**
 * O painel de uma pessoa numa tela. Nunca lança: qualquer falha vira o
 * fallback estático (`chips` do GUIA), que é o comportamento de hoje.
 *
 * @returns {{tela, papel, origem, badge, hash, resumo, sugestoes: Array}}
 */
export function painelDoPasso(u, tela = '', opcoes = {}) {
  const ref = opcoes.ref ?? D.hoje();
  // O perfil é opcional em todos os sentidos: desligado por padrão, e o painel
  // funciona idêntico sem ele (pesos vazios ⇒ ranking determinístico puro).
  const prefs = opcoes.prefs ?? P.preferenciaDe(u.id);
  const pesos = opcoes.pesos ?? P.pesosDe(u.id, ref);
  const silenciadas = opcoes.silenciadas ?? P.silenciadasDe(u.id, ref);
  return montar(u, tela, { pesos, prefs, silenciadas, ref });
}

function montar(u, tela, { pesos, prefs, silenciadas, ref }) {
  const env = sinaisDe(u, tela, ref);
  const ctx = { diaDoAno: diaDoAno(ref) };

  const candidatos = doPapel(u.papel).filter(c => {
    if (env.vazio) return false;
    if (c.telas !== '*' && !c.telas.includes(tela)) return false;
    if ((c.suprimidoEm ?? []).includes(tela)) return false;
    if (c.acao && !validarAcao(c.acao, u.papel)) return false;   // oferta morta não entra
    try { return !!c.gatilho(env, ctx); } catch { return false; }
  });

  // Nenhum gatilho aceso: o painel volta a ser exatamente o que era antes deste
  // ciclo — os chips do GUIA. Nunca uma gaveta vazia.
  if (!candidatos.length) return fallbackDoGuia(u, tela);

  const ordenados = ordenar(candidatos, pesos, prefs, silenciadas);
  // `apenasResumo` sai da disputa por vaga: ela é a linha de abertura, não um
  // chip. Continua no conjunto para alimentar o resumo.
  const paraChip = ordenados.filter(c => !c.apenasResumo);
  const comp = { slots: SLOTS, prefereTipo: prefs.prefere_tipo ?? null };
  const escolhidas = explorar(compor(paraChip, comp), paraChip, pesos, ctx.diaDoAno, comp);

  const sugestoes = escolhidas.map(c => {
    const acao = c.acao ? validarAcao(c.acao, u.papel) : null;
    // A variante qualitativa ("algumas crianças") pode abrir a frase — maiúscula
    // no primeiro caractere para o texto não sair com cara de fragmento.
    const texto = maiuscula(String(c.texto(env) ?? ''));
    return {
      id: c.id, tipo: c.tipo, classe: c.classe, nucleo: !!c.nucleo,
      rotulo: c.rotulo,
      // Trava final, no caminho quente: um texto que escape do lint não vai à
      // tela — cai no rótulo, que é curto e auditado.
      texto: semCobranca(texto) ? texto : c.rotulo,
      porque: String(c.porque(env) ?? ''),
      silenciavel: !c.nucleo || true,
      // A pergunta da diretoria é respondida ALI, com o retorno verbatim de
      // consultar() — SQL puro, sem passar por modelo nenhum.
      resposta: c.consulta ? respostaDeConsulta(c.consulta) : null,
      acao: acao ? { id: acao.id, rotulo: acao.rotulo, hash: acao.hash } : null,
    };
  });

  // O ponto no FAB acende só por núcleo vivo — e nunca para quem está voltando
  // depois de um tempo fora: receber quem sumiu com um aviso é o oposto do
  // desenho anti-abandono.
  const badge = !env.em_lapso && escolhidas.some(c => c.nucleo);
  const resumo = resumoDe(env, escolhidas, ordenados);

  // Telas em que o estado não tem nada de novo a dizer (o `#/hoje` já pinta
  // tudo) caem nos chips do GUIA em vez de mostrar gaveta vazia.
  if (!sugestoes.length) return { ...fallbackDoGuia(u, tela), resumo, badge };

  return {
    tela, papel: u.papel, origem: 'guia', badge,
    hash: hashDe(sugestoes.map(s => s.id)),
    resumo,
    sugestoes,
  };
}

/** O painel de antes deste ciclo: os chips escritos à mão no GUIA, como perguntas. */
function fallbackDoGuia(u, tela) {
  const { chips } = chipsDe(u, tela);
  const sugestoes = chips.map((texto, i) => ({
    id: `guia:${tela}:${i}`, tipo: 'pergunta', classe: 'saber', nucleo: false,
    rotulo: texto, texto, porque: 'é o que mais se pergunta nesta tela',
    silenciavel: false, resposta: null, acao: null,
  }));
  return {
    tela, papel: u.papel, origem: 'guia', badge: false,
    hash: hashDe(sugestoes.map(s => s.id)), resumo: null, sugestoes,
  };
}

function respostaDeConsulta(pergunta) {
  try {
    const r = R.consultar(pergunta);
    return r.reconhecida ? { texto: r.resposta, fonte: r.fonte } : null;
  } catch { return null; }
}

/** Só para o lint de teste: o catálogo inteiro, sem filtro de papel. */
export { CATALOGO };
