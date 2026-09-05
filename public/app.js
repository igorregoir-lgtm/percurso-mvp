// Percurso — aplicacao. Sem framework: DOM + hash routing.
// A ordem das telas segue a jornada da persona: hoje -> chamada -> ciclo -> turma.
import { criarFila } from './fila.js';
import { paraWav16k, iniciarGravacao, gravarVideoConsentimento, abrirCamera, encerrarStream, temDuasCameras, podeGravar, juntarBlocos, TETO_ARQUIVO_BYTES, BLOCO_SEGUNDOS } from './audio.js';
import { desenharQR, svgQR } from './qr.js';

const app     = document.getElementById('app');
const navEl   = document.getElementById('nav');
const quemEl  = document.getElementById('quem');
const toastEl = document.getElementById('toasts');

let sessao = null;   // { id, nome, apelido, papel }
let ctx    = {};     // dados da tela corrente

// ---------------------------------------------------------------- utilitarios
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dataBR = (iso) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
const diaSemana = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
const porExtenso = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

// Movimento: o CSS tem kill-switch de reduced-motion, mas rAF, canvas e View
// Transitions vivem no JS — toda peça animada checa REDUZ.matches NA HORA do
// uso (a preferência pode mudar com o app aberto).
const REDUZ = matchMedia('(prefers-reduced-motion: reduce)');
const espera = (ms) => new Promise(r => setTimeout(r, ms));

// --------------------------------------------------------------------------
// Ditado por voz — componente reutilizável (copilot, consulta; a folha do dia
// tem o fluxo próprio em #/voz). O MESMO contrato de privacidade de sempre:
// o áudio é transcrito pelo navegador e nunca chega ao servidor do Percurso;
// o texto só sai do campo quando a pessoa toca no botão de enviar.
// --------------------------------------------------------------------------
let ditadoAtivo = null;   // { botao, parar }

function pararDitado() {
  const d = ditadoAtivo;
  ditadoAtivo = null;
  try { d?.parar(); } catch {}
}

/** O par botão-de-microfone + linha de estado, para pôr ao lado de um campo.
 *  Sem suporte no navegador, devolve só a dica do teclado (iOS/Android têm
 *  ditado no próprio teclado — o caminho continua existindo). */
function blocoDitado(campoId, estadoId) {
  if (!temReconhecimento()) {
    return {
      botao: '',
      estado: `<p class="sub ditado-estado" id="${estadoId}">Digite — ou use o microfone do teclado do celular.</p>`,
    };
  }
  return {
    botao: `<button type="button" class="mic-ditado" data-acao="ditado"
              data-campo="${campoId}" data-estado="${estadoId}"
              aria-pressed="false" aria-label="Falar em vez de digitar"><i aria-hidden="true"></i></button>`,
    estado: `<p class="sub ditado-estado" id="${estadoId}">Toque no microfone e fale — ou digite.</p>`,
  };
}

function iniciarDitado(botao, campo, estadoEl) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { toast('Este navegador não transcreve voz — use o microfone do teclado.'); return; }
  const rec = new Rec();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = false;
  // idem no ditado de campo: preferir o aparelho sempre que ele souber.
  try { if (typeof Rec.availableOnDevice === 'function') rec.processLocally = true; } catch {}
  let ativo = true;
  let religadas = 0;

  const ui = (gravando) => {
    botao.classList.toggle('gravando', gravando);
    botao.setAttribute('aria-pressed', String(gravando));
    botao.setAttribute('aria-label', gravando ? 'Parar de falar' : 'Falar em vez de digitar');
    if (estadoEl) {
      estadoEl.textContent = gravando
        ? 'Ouvindo… fale à vontade e toque de novo para parar.'
        : 'Toque no microfone e fale — ou digite.';
      estadoEl.classList.toggle('ouvindo', gravando);
    }
  };

  rec.onresult = (ev) => {
    let novo = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) novo += ev.results[i][0].transcript;
    }
    novo = novo.trim();
    if (!novo) return;
    campo.value = (campo.value.trim() + ' ' + novo).trim();
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.scrollTop = campo.scrollHeight;
  };
  rec.onerror = (ev) => {
    if (ev.error === 'not-allowed') {
      toast('Microfone bloqueado pelo navegador. Digite — ou use o microfone do teclado.', 'ruim');
      parar();
    }
    // 'no-speech' e afins: o onend religa; sem toast para não virar ruído.
  };
  // iOS/Safari encerra o reconhecimento sozinho depois de uma pausa — religar
  // enquanto a pessoa não tocou em parar é o que faz o ditado parecer contínuo.
  // Com RESPIRO (250ms) e teto baixo: religar síncrono em loop era um jeito de
  // congelar o Safari; com o app em segundo plano, nem tenta.
  const desligarUI = () => {
    if (ditadoAtivo?.botao === botao) ditadoAtivo = null;
    ui(false);
  };
  rec.onend = () => {
    if (ativo && ditadoAtivo?.botao === botao && !document.hidden && religadas < 12) {
      religadas++;
      setTimeout(() => {
        if (!ativo || ditadoAtivo?.botao !== botao || document.hidden) { desligarUI(); return; }
        try { rec.start(); } catch { desligarUI(); }
      }, 250);
      return;
    }
    const pausouSozinho = ativo && religadas >= 12;
    desligarUI();
    if (pausouSozinho && estadoEl) estadoEl.textContent = 'O microfone pausou — toque para falar de novo.';
  };

  const parar = () => { ativo = false; try { rec.stop(); } catch {} ui(false); };
  ditadoAtivo = { botao, parar };
  try { rec.start(); ui(true); } catch { ditadoAtivo = null; ui(false); }
}

function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.setAttribute('role', tipo === 'ruim' ? 'alert' : 'status');
  el.textContent = msg;
  toastEl.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'ruim' ? 6000 : 3500);
}

// TODA chamada tem timeout (25s por padrão; o copilot pede mais). Sem isto,
// uma conexão que cai no meio — celular no 5G atravessando túnel — deixava a
// tela "pensando…" PARA SEMPRE, e o app parecia travado até recarregar.
// Timeout conta como falha de REDE (e.rede): a fila offline enfileira e o
// registro não se perde. `signal` externo permite o botão Cancelar.
async function api(caminho, opcoes = {}) {
  const { timeoutMs = 25000, signal: sinalExterno, ...resto } = opcoes;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort('timeout'), timeoutMs);
  if (sinalExterno) {
    if (sinalExterno.aborted) ctl.abort('cancelado');
    else sinalExterno.addEventListener('abort', () => ctl.abort('cancelado'), { once: true });
  }
  let r;
  try {
    r = await fetch(caminho, {
      ...resto,
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', ...(resto.headers || {}) },
    });
  } catch {
    const cancelado = !!sinalExterno?.aborted;
    const estourou = ctl.signal.aborted && !cancelado;
    const e = new Error(
      cancelado ? 'Cancelado.'
      : estourou ? 'A conexão demorou demais. Tente de novo — nada foi perdido.'
      : 'Sem conexao com o servidor. Verifique se o Percurso esta rodando.');
    e.rede = !cancelado; e.timeout = estourou; e.cancelado = cancelado;
    throw e;
  } finally { clearTimeout(t); }
  let corpo = {};
  try { corpo = await r.json(); } catch { /* resposta sem corpo */ }
  if (!r.ok) {
    const e = new Error(corpo.erro || `Erro ${r.status}.`);
    e.status = r.status; e.dados = corpo;
    throw e;
  }
  return corpo;
}
// Todo POST bem-sucedido pode ter apagado o motivo do ponto no FAB (salvou a
// chamada, fechou a folha). O cliente SABE quando gravou — sem isto, o ponto
// ficaria aceso até a próxima navegação, justamente no caminho mais comum
// (#/chamada → salvar → #/hoje). Invalidar aqui é uma linha; adivinhar no
// servidor seria um cache com defasagem.
const post = async (c, dados, opts = {}) => {
  const r = await api(c, { ...opts, method: 'POST', body: JSON.stringify(dados || {}) });
  if (!c.startsWith('/api/aurora/')) aurora.badgeRota = null;
  return r;
};

// --------------------------------------------------------------------------
// Fila offline. A regra mora em `fila.js`, com armazenamento e envio injetados,
// para poder ser testada sem navegador. Aqui só a fiação e o aviso na tela.
// --------------------------------------------------------------------------
const fila = criarFila({ armazenamento: localStorage, enviar: post });
const lerFila = () => fila.ler();

async function postComFila(caminho, corpo, rotulo) {
  const r = await fila.enfileirar(caminho, corpo, rotulo);
  if (!r.enviado) { toast('Sem internet. Vai ser enviado quando voltar.', 'ruim'); pintarFila(); }
  return r.enviado;
}

let drenando = false;
async function drenarFila() {
  if (drenando) return;
  drenando = true;
  try {
    const r = await fila.drenar();
    for (const x of r.recusados) toast(`"${x.rotulo}" não pôde ser enviado: ${x.motivo}`, 'ruim');
    if (r.enviados) { toast(`${r.enviados} registro(s) que estavam na fila foram enviados.`, 'bom'); navegar(); }
    pintarFila();
  } finally { drenando = false; }
}

function pintarFila() {
  const n = fila.tamanho();
  const el = document.getElementById('fila');
  if (el) el.textContent = n ? `${n} na fila` : '';
}
window.addEventListener('online', drenarFila);
// Microfone nunca fica aberto com o app em segundo plano.
document.addEventListener('visibilitychange', () => { if (document.hidden) pararDitado(); });

function comErro(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (e) {
      if (e.status === 401) { sessao = null; location.hash = '#/entrar'; return; }
      toast(e.message, 'ruim');
    }
  };
}

const barra = (pct, ok = false) =>
  `<div class="barra ${ok ? 'ok' : ''}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;

// ------------------------------------------------------------------ navegacao
// O MENU DO PROTÓTIPO v3, e ele é curto de propósito: três itens para quem
// registra, quatro para a coordenação, dois para a diretoria. O que saiu daqui
// não sumiu — a Aurora é a porta ("IR PARA: a turma inteira · chamada · pensar
// junto"), e é isso que reconcilia "simplificar" com "não perder função".
const NAV_EDUCADOR = [
  ['#/hoje', '☀', 'Hoje'], ['#/registrar', '✎', 'Registrar'], ['#/crianca', '☺', 'Crianças'],
];
// Psicóloga (decisão 31): a turma dela não entra na rubrica, então não há Ciclo;
// e ela não pediu pauta de atividades — o que ela pediu foi registrar.
const NAV_PROFISSIONAL = NAV_EDUCADOR;
// F2: scores, safras e síntese viraram abas do Painel; impacto e consulta,
// abas do Relatório. O menu deixa de repetir o que a tela já oferece.
const NAV_COORDENACAO = [
  ['#/painel', '▦', 'Painel'], ['#/pessoas', '⚇', 'Pessoas'],
  ['#/consentimentos', '⚿', 'Consent.'], ['#/turma', '▥', 'Turma'],
];
const NAV_DIRETORIA = [
  ['#/relatorio', '▤', 'Relatório'], ['#/relatorio?aba=consulta', '?', 'Perguntar'],
];

function pintarNav(rotaAtual) {
  if (!sessao) { navEl.hidden = true; pintarAuroraFab(false); return; }
  pintarAuroraFab(!rotaAtual.startsWith('#/entrar'));
  const itens = sessao.papel === 'coordenacao' ? NAV_COORDENACAO
              : sessao.papel === 'diretoria' ? NAV_DIRETORIA
              : sessao.papel === 'profissional' ? NAV_PROFISSIONAL : NAV_EDUCADOR;
  navEl.hidden = false;
  // O item ATUAL é o de casamento mais LONGO. Com `#/relatorio` e
  // `#/relatorio?aba=consulta` no mesmo menu, `startsWith` puro marcaria os
  // dois — e a pessoa veria duas abas acesas, sem saber onde está.
  const atual = itens
    .filter(([href]) => rotaAtual.startsWith(href))
    .sort((a2, b2) => b2[0].length - a2[0].length)[0]?.[0];
  navEl.innerHTML = itens.map(([href, ic, rot]) =>
    `<a href="${href}" ${href === atual ? 'aria-current="page"' : ''}>
       <em aria-hidden="true">${ic}</em>${rot}</a>`).join('');
  setTimeout(pintarFila, 0);
  quemEl.innerHTML =
    `<span class="sintetico" id="fila"></span>
     <span class="sintetico">dados sintéticos</span>
     <b>${esc(sessao.apelido)}</b>
     <button class="btn pequeno fantasma" data-acao="trocar-senha">senha</button>
     <button class="btn pequeno fantasma" data-acao="sair">sair</button>`;
}

// ------------------------------------------------------------------ roteador
const rotas = [];
const rota = (re, tela) => rotas.push([re, tela]);

// Dedupe do padrão `location.hash = X; navegar()` + evento hashchange: sem a
// guarda, cada navegação manual renderizaria (e animaria) duas vezes — e, no
// caso do fluxo de voz com perímetro, o segundo render destruiria o modal de
// encaminhamento recém-aberto. Dois detalhes duros de conquistar:
//  1. A guarda só pode ser LIBERADA depois que a task do hashchange drenar
//     (setTimeout 0) — rota síncrona terminava antes do evento chegar.
//  2. A liberação é condicionada ao hash (if hashEmVoo === hash): um redirect
//     interno (tela que faz location.hash=Y; navegar()) muda a marca para Y,
//     e o finally do navegar EXTERNO não pode apagar a marca do interno.
let hashEmVoo = null;

// ======================================================================
// AS ROTAS QUE DEIXARAM DE EXISTIR (F2) — e para onde o conteúdo delas foi.
//
// Isto NÃO é ocultação. A tela sumiu de verdade: o conteúdo passou a viver
// dentro da tela que a absorveu, e não há mais `rota()` para ela. O mapa existe
// porque as citações de rota antiga são muitas — 49 sugestões da Aurora, o
// protótipo, os documentos, links que a coordenação já mandou por WhatsApp — e
// um link velho que dá tela em branco é pior que um link velho que chega no
// lugar certo.
//
// Regra para quem mexer: entrada nova aqui só quando uma rota é FUNDIDA. Rota
// nova nunca nasce com apelido.
const FUNDIDAS = {
  '#/arquivo': '#/pessoas?aba=arquivo',
  '#/importar': '#/pessoas?aba=importar',
  '#/scores': '#/painel?aba=scores',
  '#/safras': '#/painel?aba=safras',
  '#/sintese': '#/painel?aba=sintese',
  '#/impacto': '#/relatorio?aba=impacto',
  '#/consulta': '#/relatorio?aba=consulta',
  '#/alertas': '#/hoje?detalhe=alertas',
  '#/pauta': '#/hoje?detalhe=semana',
  '#/ciclo': '#/hoje?detalhe=ciclo',
  '#/relato': '#/sai-daqui?aba=relato',
  '#/recado': '#/sai-daqui?aba=recado',
  '#/criancas': '#/crianca',
  '#/voz': '#/registrar',
  '#/folha': '#/registrar?passo=mao',
  '#/confirmar': '#/registrar?passo=confirmar',
  '#/copilot': '#/pensar',
};

// As que carregavam ID não cabem num mapa de strings.
const FUNDIDAS_COM_ID = [
  [/^#\/observacao\/(\d+)/, (m) => `#/crianca/${m[1]}?ver=observacao`],
  // O parecer tem id PRÓPRIO (uma criança pode ter vários). A ficha resolve de
  // quem ele é pelo próprio parecer, então o hash não precisa saber.
  [/^#\/parecer\/(\d+)/, (m) => `#/crianca?ver=parecer&pid=${m[1]}`],
];

/** Resolve o apelido antes de casar a rota. Preserva a query que vier junto. */
function resolverFundida(hash) {
  const [caminho, busca] = hash.split('?');
  const comId = FUNDIDAS_COM_ID.find(([re]) => re.test(caminho));
  if (comId) {
    const d = comId[1](caminho.match(comId[0]));
    return busca ? `${d}&${busca}` : d;
  }
  const destino = FUNDIDAS[caminho];
  if (!destino) return hash;
  if (!busca) return destino;
  return destino.includes('?') ? `${destino}&${busca}` : `${destino}?${busca}`;
}

async function navegar() {
  const bruto = location.hash || '#/hoje';
  const resolvido = resolverFundida(bruto);
  // Troca a barra de endereço também: a pessoa tem de ver onde ela está, e o
  // botão Voltar não pode ficar preso no apelido.
  if (resolvido !== bruto) { location.replace(resolvido); return; }
  const hash = resolvido;
  if (!sessao && hash !== '#/entrar') { location.hash = '#/entrar'; return; }
  if (hash === hashEmVoo) return;
  hashEmVoo = hash;
  try {
    // Servidor fora do ar com rede ativa também enfileira, e nesse caso `online`
    // nunca dispara. Tentar a cada navegação custa nada quando a fila está vazia.
    if (sessao && lerFila().length) drenarFila();
    for (const [re, tela] of rotas) {
      const m = hash.match(re);
      if (m) {
        const render = async () => {
          // Loader ADIADO: destruir a tela velha na hora inviabiliza qualquer
          // crossfade — rotas locais resolvem em <240ms e trocam direto; rota
          // lenta mostra "Carregando…" (e ABORTA a view transition, que congela
          // a pintura enquanto vive — sem o skip, a educadora veria a tela
          // velha travada em vez do loader).
          const tLoader = setTimeout(() => {
            vtAtual?.skipTransition?.();
            app.innerHTML = '<div class="carregando">Carregando…</div>';
          }, 240);
          try {
            // Overlay esquecido não atravessa navegação: modal, festa, magia,
            // ditado e a Aurora são fechados (com cleanup) antes da rota nova.
            // REPINTURA da mesma tela (fila drenada no evento `online`,
            // resposta do copilot chegando) NÃO é navegação: a Aurora — que
            // vive fora do #app — fica aberto, falando e ouvindo.
            const mesmaTela = hash === hashRenderizado;
            if (!mesmaTela) {
              if (document.querySelector('.aurora-veu')) fecharAurora({ foco: false });
              cancelarFala();
            }
            // Ditado no painel da Aurora sobrevive à repintura (o campo dele
            // não é re-renderizado); ditado em campo da TELA não — o elemento
            // fica órfão no re-render.
            if (!mesmaTela || !(ditadoAtivo?.botao?.closest('.aurora-veu'))) pararDitado();
            document.querySelectorAll(mesmaTela ? '.veu:not(.aurora-veu)' : '.veu').forEach(v => v.remove());
            pararFesta();
            pararVoz();       // gravação da folha não sobrevive a re-render
            hashRenderizado = hash;
            document.querySelectorAll('.magia').forEach(mg => mg._cancelarPelaRota?.());
            pintarNav(hash);
            await tela(...m.slice(1));
          }
          catch (e) {
            if (e.status === 401) { sessao = null; location.hash = '#/entrar'; return; }
            app.innerHTML = `<div class="cartao"><h2>Não deu para abrir esta tela</h2>
              <p class="sub" style="margin-top:6px">${esc(e.message)}</p>
              <div class="linha" style="margin-top:14px">
                <a class="btn secundario" href="#/hoje">Voltar ao início</a>
                <button class="btn fantasma" data-acao="recarregar">Tentar de novo</button>
              </div></div>`;
          } finally { clearTimeout(tLoader); }
          window.scrollTo(0, 0);
        };
        // Peça "app nativo": View Transitions quando o navegador tem;
        // fallback = animação de entrada curta no #app. Reduced-motion pula
        // tudo; documento oculto (aba em segundo plano) também — a VT aborta
        // com InvalidStateError nesse estado e as promises ready/finished
        // rejeitam sozinhas, então são engolidas explicitamente (os erros do
        // RENDER não: o try interno já pinta o cartão de erro).
        if (document.startViewTransition && !REDUZ.matches && !document.hidden) {
          const vt = document.startViewTransition(render);
          vtAtual = vt;
          vt.ready.catch(() => {});
          vt.finished.catch(() => {});
          try { await vt.updateCallbackDone; }
          catch (e) { console.error('[percurso] render', e); }
          finally { vtAtual = null; }
        } else {
          await render();
          if (!REDUZ.matches) {
            app.classList.remove('tela-entra'); void app.offsetWidth; app.classList.add('tela-entra');
          }
        }
        return;
      }
    }
    app.innerHTML = `<div class="cartao"><h2>Tela não encontrada</h2>
      <p class="sub">A rota <code>${esc(hash)}</code> não existe.</p>
      <div class="linha" style="margin-top:14px"><a class="btn" href="#/hoje">Ir para o início</a></div></div>`;
  } finally {
    // Libera só DEPOIS da task do hashchange e só se a marca ainda é deste
    // hash (redirect interno tem marca própria — ver comentário acima).
    setTimeout(() => { if (hashEmVoo === hash) hashEmVoo = null; }, 0);
  }
}
let vtAtual = null;
let hashRenderizado = null;   // última rota de fato pintada (repintura ≠ navegação)

// ======================================================================
// ENTRAR
// ======================================================================
rota(/^#\/entrar/, async () => {
  const { usuarios } = await api('/api/sessao');
  navEl.hidden = true; quemEl.innerHTML = '';
  // Porta de entrada orquestrada: a mesma cascata `entra`/`sobe` da festa, com
  // um traço-assinatura que se desenha sob o título. Reduced-motion: o
  // kill-switch do CSS mata os delays; o traço nem é animado.
  app.innerHTML = `
    <p class="kicker entra" style="animation-delay:.03s">Instituto Ebenézer · Desafio B</p>
    <h1 class="entra" style="animation-delay:.08s">Percurso</h1>
    <svg class="entrar-traco entra" style="animation-delay:.1s" viewBox="0 0 64 10" aria-hidden="true">
      <path d="M2 6 C 14 2, 26 9, 38 5 S 58 4, 62 5"/>
    </svg>
    <p class="sub entra" style="animation-delay:.13s">Transforma a observação de minutos do educador em evidência de evolução — sem que dado de criança saia da organização.</p>
    <div class="cartao entra" style="margin-top:20px; animation-delay:.2s">
      <h2>Quem está registrando hoje?</h2>
      <p class="sub">Cada pessoa entra com a própria senha. Quem ainda não tem cria a dela na primeira entrada.</p>
      <div class="pilha" style="margin-top:14px" id="lista-perfis">
        ${usuarios.map((u, i) => `
          <button class="item entra" style="animation-delay:${(0.28 + Math.min(i, 6) * 0.07).toFixed(2)}s"
                  data-acao="escolher-perfil" data-id="${u.id}" data-nome="${esc(u.apelido || u.nome)}"
                  data-primeiro="${u.primeiro_acesso ? 1 : 0}">
            <div><div class="nome">${esc(u.nome)}</div>
              <div class="meta">${PAPEL[u.papel] ?? 'Educadora'}${u.primeiro_acesso ? ' · primeiro acesso' : ''}</div></div>
            <span class="seta" aria-hidden="true">›</span>
          </button>`).join('')}
      </div>
      <div id="form-senha"></div>
    </div>
    <p class="rodape entra" style="animation-delay:.55s">Cada pessoa entra com a própria conta. O registro fica no instituto.<br>
      Todos os dados desta aplicação são sintéticos (regra 1 do bloco 6 do dossiê):<br>
      nenhum dado real de criança atendida foi usado, em nenhuma etapa.</p>`;
  const traco = app.querySelector('.entrar-traco path');
  if (traco && !REDUZ.matches) {
    const L = traco.getTotalLength();
    traco.style.strokeDasharray = L;
    traco.style.strokeDashoffset = L;
    traco.style.transition = 'stroke-dashoffset .4s ease-in-out .35s';
    traco.getBoundingClientRect(); // reflow: sem ele os dois writes colapsam
    traco.style.strokeDashoffset = '0';
  }
});

const PAPEL = { coordenacao: 'Coordenação', diretoria: 'Diretoria', educador: 'Professora', profissional: 'Psicóloga' };

// ======================================================================
// HOJE — a tela que a persona abre primeiro
// ======================================================================
// ======================================================================
// HOJE absorve ALERTAS, PARA ESTA SEMANA e OLHARES DO CICLO (F2).
//
// Os três já apareciam como CARTÃO aqui, e ainda tinham tela própria: o cartão
// e a tela coexistiam, e a pendência de ciclo era cobrada em dois lugares. Com
// `?ver=`, o cartão é o resumo e a tela é o detalhe do MESMO lugar — deixa de
// haver dois caminhos para o mesmo assunto.
// ======================================================================
// Toda tela absorvida precisa de VOLTA. Tela em que se entra e não se sai é
// pior que tela a mais — e a fusão cria exatamente esse risco.
const VOLTA_AO_HOJE = '<div class="linha"><button class="btn pequeno fantasma" data-acao="ir" data-href="#/hoje">‹ Voltar ao Hoje</button></div>';

const VER_TELA_INTEIRA = {
  alertas: () => telaAlertas(),
  semana: () => telaParaEstaSemana(),
  ciclo: () => telaOlharesDoCiclo(),
};

rota(/^#\/hoje/, async () => {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const detalhe = VER_TELA_INTEIRA[q.get('detalhe') ?? ''];
  if (detalhe) return detalhe();
  const turmaId = q.get('turma_id');
  const d = await api(`/api/hoje${turmaId ? `?turma_id=${encodeURIComponent(turmaId)}` : ''}`);
  ctx.hoje = d;
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const retomada = d.retomada.em_lapso ? `
    <div class="aviso calmo">
      <h3>Que bom te ver de volta</h3>
      <p>${esc(d.retomada.mensagem)}</p>
      ${d.chamadas_abertas.length ? `<div class="linha">
        <button class="btn pequeno" data-acao="ir" data-href="#/chamada?data=${d.chamadas_abertas[0]}">
          Retomar por ${dataBR(d.chamadas_abertas[0])}</button>
        <span class="sub">${d.chamadas_abertas.length} data(s) em aberto — nenhuma expira.</span>
      </div>` : ''}
    </div>` : '';

  const alertas = d.alertas.length ? `
    <div class="aviso">
      <h3>${d.alertas.length === 1 ? 'Uma criança precisa de atenção' : `${d.alertas.length} crianças precisam de atenção`}</h3>
      ${d.alertas.slice(0, 3).map(a => `<p style="margin-top:6px"><b style="color:var(--ink)">${esc(a.nome)}</b> — ${esc(a.detalhe)}</p>`).join('')}
      <div class="linha">
        <button class="btn pequeno" data-acao="ir" data-href="#/crianca/${d.alertas[0].crianca_id}">Ver trajetória</button>
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/hoje?detalhe=alertas">Todos os alertas</button>
      </div>
    </div>` : '';

  const ch = d.chamada;
  // Sabado numa turma de semana, feriado, recesso: nao ha encontro hoje. Oferecer
  // "chamada de hoje" nesse dia seria convidar a registrar um encontro que nao
  // aconteceu — o cartao passa a apontar a data em aberto mais recente.
  const prox0 = (d.proximos_encontros ?? [])[0];
  const diasAte = prox0 ? Math.round((new Date(prox0 + 'T12:00:00') - new Date(d.hoje + 'T12:00:00')) / 86400000) : null;
  const cartaoChamada = !ch ? '' : !d.dia_letivo && !ch.registrada ? `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">Chamada</h2>
        ${prox0 ? `<span class="selo pend">${diasAte === 1 ? 'amanhã' : `em ${diasAte} dias`}</span>` : `<span class="selo bloq">${esc(diaSemana(d.hoje))}</span>`}</div>
      ${prox0 ? `<p class="sub"><b>${esc(diaSemana(prox0))}, ${dataBR(prox0)}</b> · ${esc(d.turma?.nome || '')}.
          No começo do encontro dá para tocar em gravar e largar o celular na mesa.</p>`
        : `<p class="sub">${esc(d.turma?.nome || '')} não tem encontro ${esc(diaSemana(d.hoje))}.
          ${d.chamadas_abertas.length ? 'Dá para fechar o que ficou em aberto.' : 'Nada pendente.'}</p>`}
      <div class="linha" style="margin-top:12px">
        ${d.chamadas_abertas.length
          ? `<button class="btn largo secundario" data-acao="ir" data-href="#/chamada?data=${d.chamadas_abertas.at(-1)}">
               Chamada de ${dataBR(d.chamadas_abertas.at(-1))}</button>`
          : `<button class="btn largo secundario" data-acao="ir" data-href="#/chamada">Abrir a chamada</button>`}
      </div>
    </div>` : ch.registrada ? `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">Chamada de hoje</h2><span class="selo ok">registrada</span></div>
      <p class="sub">${ch.criancas.filter(c => c.status === 'P').length} presentes de ${ch.criancas.length}.</p>
      <div class="linha" style="margin-top:10px">
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/chamada">Ajustar</button>
      </div>
    </div>` : `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">Chamada de hoje</h2><span class="selo pend">pendente</span></div>
      <p class="sub">${esc(porExtenso(d.hoje))} · ${esc(d.turma?.nome || '')}</p>
      <div class="linha" style="margin-top:12px">
        <button class="btn largo" data-acao="ir" data-href="#/chamada">Fazer chamada · leva 30 segundos</button>
      </div>
    </div>`;

  const ag = d.agenda;
  const cartaoCiclo = !ag ? '' : `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">${esc(ag.ciclo.nome)}</h2>
        <span class="selo ${ag.pendentes === 0 ? 'ok' : 'pend'}">${ag.concluidas}/${ag.observaveis}</span></div>
      <p class="sub">Janela até ${dataBR(ag.ciclo.fim)} · ${ag.dias_restantes} dias · ~3 min por criança</p>
      ${barra(ag.cobertura, ag.pendentes === 0)}
      <div class="linha" style="margin-top:12px">
        ${ag.pendentes > 0
          ? `<button class="btn largo" data-acao="ir" data-href="#/hoje?detalhe=ciclo">Continuar observações · faltam ${ag.pendentes}</button>`
          : `<button class="btn largo secundario" data-acao="ir" data-href="#/turma">Ver o que a turma mostrou</button>
             <button class="btn largo fantasma" data-acao="ir" data-href="#/hoje?detalhe=ciclo">Rever os olhares do ciclo</button>`}
      </div>
    </div>`;

  // "Contar como foi": a porta de entrada da voz. Fica acima de tudo o que
  // e' tarefa — o sistema pede a fala, nao o preenchimento.
  const folhaFeita = !!d.folha;
  // A folha e' do ENCONTRO: existe enquanto houver um encontro registrado,
  // mesmo que ele tenha sido no ultimo dia letivo e nao hoje.
  const cartaoFolha = !d.data_folha ? '' : `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">${d.na_rubrica === false ? 'Registro da vivência' : 'Folha'} ${d.data_folha === d.hoje ? 'do dia' : `de ${dataBR(d.data_folha)}`}</h2>
        <span class="selo ${folhaFeita ? 'ok' : 'pend'}">${folhaFeita ? (d.folha.origem === 'voz' ? 'por voz' : 'manual') : 'pendente'}</span></div>
      <p class="sub">Fale o quanto quiser, quando der — não há relógio correndo. O Percurso monta a folha, o relato do conselho e o recado.${
        folhaFeita && d.folha_registrada_depois ? `<br>Registrada em ${dataBR(d.folha_registrada_depois)}, depois do encontro — vale igual.` : ''}</p>
      <div class="linha" style="margin-top:12px">
        <button class="btn largo" data-acao="ir" data-href="#/registrar">Falar agora</button>
        <button class="btn largo secundario" data-acao="ir" data-href="#/registrar?porta=C">Importar áudio</button>
        <button class="btn largo secundario" data-acao="ir" data-href="#/registrar?passo=mao">Escrever</button>
        ${folhaFeita && d.na_rubrica === false ? `<button class="btn largo ${d.folha.relato_liberado ? 'fantasma' : 'secundario'}" data-acao="ir" data-href="#/sai-daqui?aba=relato">${d.folha.relato_liberado ? 'Relato liberado' : 'Revisar e liberar o relato'}</button>` : ''}
        ${(d.recados ?? []).map(r => `<button class="btn largo fantasma" data-acao="ir" data-href="#/sai-daqui?aba=recado&turma_id=${r.turma_id}&data=${r.data}">Recado para os responsáveis${d.recados.length > 1 ? ` · ${esc(r.turma)}` : ''}</button>`).join('')}
      </div>
    </div>`;

  // "Para esta semana" — o bloco que substituiu "Falta completar neste ciclo".
  // O sistema deixa de cobrar e passa a devolver.
  const pt = d.pauta;
  const linhasSemana = [];
  if (pt?.risco?.n) linhasSemana.push([
    `${pt.risco.n} ${pt.risco.n === 1 ? 'criança em risco de sair' : 'crianças em risco de sair'}`,
    'Duas ou mais faltas seguidas', '#/hoje?detalhe=semana', true]);
  if (pt?.exposicao?.area) linhasSemana.push([
    `${esc(pt.exposicao.area)} sem atividade`,
    `${pt.exposicao.criancas} interessada(s), nada no período`, '#/hoje?detalhe=semana', true]);
  if (d.agenda?.pendentes) linhasSemana.push([
    `${d.agenda.pendentes} olhar(es) em aberto no ciclo`,
    'Opcional — a folha já registrou a turma', '#/hoje?detalhe=ciclo', false]);
  const paraEstaSemana = `
    <div class="cartao compacto">
      <div class="lbl">Para esta semana</div>
      ${linhasSemana.length ? linhasSemana.map(([t, sub, href, atencao]) => `
        <button class="link" data-acao="ir" data-href="${href}">
          <span><span>${t}</span><span class="d ${atencao ? 'atencao' : ''}">${sub}</span></span>
          <span class="chev" aria-hidden="true">›</span>
        </button>`).join('')
        : `<p class="sub">${esc(pt?.mensagem_tranquila || 'Ninguém sumiu do radar esta semana.')}</p>`}
    </div>`;

  // E6: devolver algo por encontro — as contagens de hoje contra as últimas folhas.
  const dv = d.devolucao;
  const cartaoDevolucao = !dv || !dv.linhas.length ? '' : `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">O que o grupo mostrou em ${dataBR(dv.encontro.data)}</h2>
        <span class="selo ${dv.comparavel ? 'ok' : 'pend'}">${dv.comparavel ? `vs. últimos ${dv.anteriores}` : 'sem base ainda'}</span></div>
      <div class="pilha" style="margin-top:8px">
        ${dv.linhas.map(l => `<div class="dado"><span class="k">${esc(l.rotulo)}</span>
          <b>${l.hoje}${l.presentes ? `<span class="sub"> de ${l.presentes}</span>` : ''}${l.comparacao ? ` <span class="selo ${l.comparacao === 'acima' ? 'ok' : l.comparacao === 'abaixo' ? 'pend' : ''}">${l.comparacao === 'acima' ? '▲' : l.comparacao === 'abaixo' ? '▼' : '='} ${String(l.media_anteriores).replace('.', ',')}</span>` : ''}</b></div>`).join('')}
      </div>
      <p class="sub" style="margin-top:8px">${esc(dv.leitura)}</p>
      <button class="btn largo secundario" data-acao="ir" data-href="#/turma" style="margin-top:10px">Ver a turma inteira</button>
    </div>`;

  const abertas = d.chamadas_abertas.length && !d.retomada.em_lapso ? `
    <div class="cartao compacto">
      <h2>Datas ainda sem chamada</h2>
      <p class="sub">Nada expira. Registre quando der.</p>
      <div class="pilha" style="margin-top:10px">
        ${d.chamadas_abertas.slice(-4).map(dt => `
          <button class="item" data-acao="ir" data-href="#/chamada?data=${dt}">
            <div><div class="nome">${dataBR(dt)}</div><div class="meta">${esc(diaSemana(dt))}</div></div>
            <span class="seta" aria-hidden="true">›</span>
          </button>`).join('')}
      </div>
    </div>` : '';

  // ------------------------------------------------------------------------
  // TETO DE TRÊS (F2). A tela empilhava OITO cartões e até dez botões largos,
  // com data em aberto cobrada em três lugares — e o comentário do cartão de
  // voz já dizia que ele "fica acima de tudo o que é tarefa" enquanto ele era
  // o terceiro. Aqui a ordem é explícita e o excesso não some: vira uma linha
  // de "também para você", que abre o mesmo conteúdo em `#/hoje?ver=`.
  //
  // A CAPTURA VEM PRIMEIRO, sempre que houver encontro para registrar. É a
  // única coisa que o campo pediu para ser mais fácil.
  const TETO_CARTOES = 3;
  const candidatos = [
    ['registrar', cartaoFolha, 'Contar como foi'],
    ['chamada', cartaoChamada, 'Chamada'],
    ['devolucao', cartaoDevolucao, 'O que o grupo mostrou'],
    ['alertas', alertas, `Quem precisa de atenção${d.alertas.length ? ` (${d.alertas.length})` : ''}`],
    ['semana', paraEstaSemana, 'Para esta semana'],
    ['ciclo', cartaoCiclo, 'Olhares do ciclo'],
    ['abertas', abertas, 'Datas ainda sem chamada'],
  ].filter(([, html]) => html);

  const ver = q.get('ver');
  const focado = ver && candidatos.find(([k]) => k === ver);
  const mostrados = focado ? [focado] : candidatos.slice(0, TETO_CARTOES);
  const resto = candidatos.filter(c => !mostrados.includes(c));

  // O seletor de turma. Sem ele a psicóloga não alcança a turma da TARDE —
  // achado de campo do dono do produto: a turma existe, com porta de entrada,
  // nome e chamada; quem não a acompanhava era o produto.
  // O AVISO ANTES DO ENCONTRO (F4). O campo pediu que o lembrete chegasse
  // enquanto ainda dá para apertar "gravar", não depois. É IN-APP: notificação
  // agendada não existe no padrão web (Notification Triggers nunca vingou;
  // Safari só faz push com servidor), e prometer o que o navegador não faz
  // seria pior que não avisar. O limite está declarado na decisão 37.
  const prox = (d.proximos_encontros ?? [])[0];
  const avisoProximo = !prox ? '' : `
    <p class="sub" style="margin-top:6px">Próximo encontro: <b>${esc(diaSemana(prox))}, ${dataBR(prox)}</b>${
      d.turma ? ` · ${esc(d.turma.nome)}` : ''} — vai pedir registro.</p>`;

  const seletor = (d.turmas ?? []).length < 2 ? '' : `
    <div class="linha" style="margin-top:10px;flex-wrap:wrap;gap:8px">
      ${d.turmas.map(t => `<button class="btn pequeno ${t.id === d.turma?.id ? '' : 'fantasma'}"
        data-acao="ir" data-href="#/hoje?turma_id=${t.id}"
        ${t.id === d.turma?.id ? 'aria-current="page"' : ''}>${esc(t.nome)}</button>`).join('')}
    </div>`;

  app.innerHTML = `
    <p class="kicker">${esc(d.turma?.programa || 'Instituto Ebenézer')}</p>
    <h1>${saudacao}, ${esc(sessao.apelido.split(' ')[0])}</h1>
    <p class="sub">${esc(d.turma ? d.turma.nome : 'Sem turma atribuída')} · ${esc(porExtenso(d.hoje))}</p>
    ${avisoProximo}
    ${seletor}
    ${focado ? `<div class="linha" style="margin-top:12px"><button class="btn pequeno fantasma"
      data-acao="ir" data-href="#/hoje${d.turma ? `?turma_id=${d.turma.id}` : ''}">‹ Voltar ao Hoje</button></div>` : ''}
    ${retomada}
    <div class="pilha">${mostrados.map(([, html]) => html).join('')}</div>
    ${resto.length ? `<div class="cartao compacto" style="margin-top:10px">
      <div class="lbl">Também para você</div>
      ${resto.map(([k, , rot]) => `<button class="link" data-acao="ir"
        data-href="#/hoje?${VER_TELA_INTEIRA[k] ? 'detalhe' : 'ver'}=${k}${d.turma ? `&turma_id=${d.turma.id}` : ''}">
        <span><span>${esc(rot)}</span></span><span class="chev" aria-hidden="true">›</span></button>`).join('')}
    </div>` : ''}
    <p class="rodape">Chamada em um toque, o encontro contado em voz — e o resto o Percurso organiza para você.</p>`;
});

// ======================================================================
// CHAMADA (F2)
// ======================================================================
rota(/^#\/chamada/, async () => {
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const hojeD = (await api('/api/hoje'));
  const turma = hojeD.turma;
  if (!turma) { app.innerHTML = `<div class="cartao"><h2>Sem turma atribuída</h2><p class="sub">Este perfil não tem turma para chamada.</p></div>`; return; }
  const data = params.get('data') || hojeD.hoje;
  const ch = await api(`/api/chamada?turma_id=${turma.id}&data=${data}`);
  const { datas } = await api(`/api/chamadas-abertas?turma_id=${turma.id}`);
  // F6 — as faltas que ela DISSE, pré-marcadas. Só elas: quem a fala não citou
  // fica sem marcar, para ela conferir. O produto não inventa presença.
  const preFaltas = new Set((params.get('faltas') || '').split(',').filter(Boolean).map(Number));
  ctx.chamada = {
    turma, data,
    marcas: Object.fromEntries(ch.criancas.map(c => [c.id, preFaltas.has(c.id) ? 'F' : c.status])),
    nomes: Object.fromEntries(ch.criancas.map(c => [c.id, c.nome])),
    inicio: performance.now(),           // cronometro: comeca ao abrir a tela
  };
  clearInterval(ctx.cronometro);
  ctx.cronometro = setInterval(() => {
    const el = document.getElementById('cronometro');
    if (!el) { clearInterval(ctx.cronometro); return; }
    const seg = Math.floor((performance.now() - ctx.chamada.inicio) / 1000);
    el.textContent = `${Math.floor(seg / 60)}m ${String(seg % 60).padStart(2, '0')}s`;
    el.parentElement.classList.toggle('estourou', seg > 120);
  }, 1000);

  const opcoes = [...new Set([hojeD.hoje, data, ...datas])].sort().reverse();
  app.innerHTML = `
    <p class="kicker">Presença · um toque por criança</p>
    <div class="linha">
      <div class="cresce"><h1>Chamada</h1><p class="sub">${esc(turma.nome)} · o encontro e o registro terminam juntos</p></div>
      <div class="cronometro" title="Meta do piloto: registrar em menos de 2 minutos">
        <span class="rotulo">tempo de registro</span>
        <b id="cronometro">0m 00s</b>
        <span class="meta">meta &lt; 2 min</span>
      </div>
    </div>
    <div class="cartao" style="margin-top:16px">
      <label for="dt" style="font-size:13px;font-weight:600">Data do encontro</label>
      <select id="dt" data-acao="trocar-data" style="margin-top:6px">
        ${opcoes.map(o => `<option value="${o}" ${o === data ? 'selected' : ''}>
          ${dataBR(o)} · ${esc(diaSemana(o))}${o === hojeD.hoje ? ' (hoje)' : ''}${datas.includes(o) ? ' · em aberto' : ''}
        </option>`).join('')}
      </select>
      ${ch.registrada ? `<p class="sub" style="margin-top:10px">Já registrada. Alterar aqui substitui o registro anterior.</p>` : ''}
      <div class="linha" style="margin-top:14px">
        <button class="btn pequeno secundario" data-acao="todos" data-v="P">Todos presentes</button>
        <span class="sub" id="contador"></span>
      </div>
      <div id="quem-falta" style="margin-top:8px"></div>
      <div class="chamada-lista" id="lista">
        ${ch.criancas.map(c => `
          <div class="chamada-item" id="linha-${c.id}">
            <div class="cresce"><span class="nome">${esc(c.nome)}</span><span class="cod">${esc(c.codigo)}</span></div>
            <div class="pf" role="group" aria-label="Presença de ${esc(c.nome)}">
              <button data-acao="marcar" data-id="${c.id}" data-v="P" aria-pressed="${ctx.chamada.marcas[c.id] === 'P'}" aria-label="Presente">P</button>
              <button data-acao="marcar" data-id="${c.id}" data-v="F" aria-pressed="${ctx.chamada.marcas[c.id] === 'F'}" aria-label="Faltou">F</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="linha" style="margin-top:18px">
        <button class="btn largo" data-acao="salvar-chamada">Salvar chamada</button>
      </div>
    </div>`;
  atualizarContador();
});

function atualizarContador() {
  const c = ctx.chamada; if (!c) return;
  const total = Object.keys(c.marcas).length;
  const feitos = Object.values(c.marcas).filter(Boolean).length;
  const el = document.getElementById('contador');
  if (el) el.textContent = `${feitos}/${total} marcadas`;
  const btn = document.querySelector('[data-acao="salvar-chamada"]');
  if (btn) btn.disabled = feitos !== total;

  // QUEM FALTA (F3). O servidor recusa chamada incompleta com 422, e 4xx fica
  // FORA da fila offline por decisão 17 — numa turma de vinte, procurar a que
  // ficou sem marcar rolando a lista é o custo que faz a educadora desistir.
  // Aqui ela vê o nome e pula até ele. É front puro: nenhuma regra muda.
  const faltando = document.getElementById('quem-falta');
  if (!faltando) return;
  const nomes = (c.nomes ?? {});
  const pendentes = Object.keys(c.marcas).filter(id => !c.marcas[id]);
  faltando.innerHTML = !pendentes.length ? '' : `
    <div class="lbl">Falta marcar ${pendentes.length === 1 ? 'uma criança' : `${pendentes.length} crianças`}</div>
    ${pendentes.slice(0, 8).map(id => `<button type="button" class="p off"
      data-acao="ir-para-crianca" data-id="${id}">${esc(nomes[id] ?? '—')}</button>`).join('')}
    ${pendentes.length > 8 ? `<span class="sub"> e mais ${pendentes.length - 8}</span>` : ''}`;
}

// ======================================================================
// CICLO — agenda de observacao (F4)
// ======================================================================
const SELO = {
  concluida: ['ok', 'feita'], rascunho: ['pend', 'começada'],
  pendente: ['pend', 'a fazer'], bloqueada: ['bloq', 'bloqueada'],
};

async function telaOlharesDoCiclo() {
  const d = await api('/api/hoje');
  if (!d.turma || !d.agenda) {
    app.innerHTML = `${VOLTA_AO_HOJE}<div class="cartao"><h2>Sem ciclo aberto</h2>
      <p class="sub">Não há ciclo de observação em andamento para esta turma.</p></div>`;
    return;
  }
  const ag = d.agenda;
  const ordem = { rascunho: 0, pendente: 1, bloqueada: 2, concluida: 3 };
  const itens = [...ag.itens].sort((a, b) => ordem[a.estado] - ordem[b.estado] || a.nome.localeCompare(b.nome));

  app.innerHTML = `${VOLTA_AO_HOJE}
    <p class="kicker" style="margin-top:10px">${esc(ag.ciclo.nome)} · observação por criança</p>
    <h1>Ciclo de observação</h1>
    <p class="sub">Janela de ${dataBR(ag.ciclo.inicio)} a ${dataBR(ag.ciclo.fim)} · ~3 min por criança · uma vez por ciclo</p>
    <div class="cartao" style="margin-top:16px">
      <div class="linha"><h2 class="cresce">${ag.concluidas} de ${ag.observaveis}</h2>
        <span class="sub">${ag.cobertura}%</span></div>
      ${barra(ag.cobertura, ag.pendentes === 0)}
      <p class="sub" style="margin-top:8px">
        ${ag.pendentes === 0
          ? 'Turma completa neste ciclo.'
          : `Faltam ${ag.pendentes}. ${ag.bloqueadas ? `${ag.bloqueadas} criança(s) estão bloqueadas — o motivo aparece na lista.` : ''}`}
      </p>
    </div>
    <div class="pilha">
      ${itens.map(i => {
        const [cls, rot] = SELO[i.estado];
        const clicavel = i.estado !== 'bloqueada';
        return `<button class="item" ${clicavel ? `data-acao="ir" data-href="#/crianca/${i.crianca_id}?ver=observacao"` : 'disabled style="opacity:.72"'}>
          <div class="cresce">
            <div class="nome">${esc(i.nome)}</div>
            <div class="meta">${i.estado === 'bloqueada' ? esc(i.texto) : esc(i.codigo)}</div>
          </div>
          <span class="selo ${cls}">${rot}</span>
          ${clicavel ? '<span class="seta" aria-hidden="true">›</span>' : ''}
        </button>`;
      }).join('')}
    </div>
    <p class="rodape">Campo sem consentimento nasce bloqueado — não é erro do sistema, é a regra dele.</p>`;
}

// ======================================================================
// OBSERVACAO — a rubrica (F3)
// ======================================================================
async function telaOlharDaCrianca(id) {
  const d = await api(`/api/observacao?crianca_id=${id}`);
  ctx.obs = {
    criancaId: Number(id),
    marcas: Object.fromEntries((d.observacao?.itens || []).map(i => [i.dimensao_id, i.nivel])),
    nota: d.observacao?.nota_livre || '',
    total: d.dimensoes.length,
  };

  if (!d.elegibilidade.pode) {
    app.innerHTML = `
      <p class="kicker">${esc(d.ciclo.nome)}</p>
      <h1>${esc(d.crianca.nome)}</h1>
      <div class="aviso protecao" style="margin-top:16px">
        <h3>${d.elegibilidade.motivo === 'consentimento' ? 'Registro bloqueado' : 'Ainda não é hora de observar'}</h3>
        <p>${esc(d.elegibilidade.texto)}</p>
        <p style="margin-top:8px">${d.elegibilidade.motivo === 'consentimento'
          ? 'Sem o consentimento específico do responsável, o campo nem existe. A coordenação registra o consentimento na tela de Consentimentos.'
          : 'O protocolo pede convívio antes de opinar sobre a criança — isso protege a qualidade do que você vai registrar.'}</p>
        <div class="linha"><button class="btn pequeno secundario" data-acao="ir" data-href="#/hoje?detalhe=ciclo">Voltar ao ciclo</button></div>
      </div>`;
    return;
  }

  const anterior = d.trajetoria;
  app.innerHTML = `
    <p class="kicker">${esc(d.ciclo.nome)} · observação</p>
    <h1>${esc(d.crianca.nome)}</h1>
    <p class="sub">Opcional. A folha do dia já registrou a turma.<br>
      ${esc(d.crianca.codigo)} · ${d.observacao?.status === 'rascunho'
      ? 'Você tinha começado — continue de onde parou.'
      : `${d.elegibilidade.convivio} encontros de convívio registrados`}</p>

    <div class="aviso calmo" style="margin-top:16px">
      <p>Marque <b style="color:var(--ink)">o que você observou neste ciclo</b> — não o que acha que a criança é.
         Cada âncora descreve um comportamento observável.</p>
    </div>

    <!-- M6: treinamento breve embutido no proprio produto — calibracao do olhar
         no lugar onde a rubrica e' aplicada. Conteudo espelha o protocolo
         (data/rag/corpus/interno-rubrica-ancoras.md); validar com a psicologa. -->
    <details class="cartao compacto" style="margin-top:10px">
      <summary style="cursor:pointer;font-weight:600">Como calibrar o olhar (1 minuto)</summary>
      <ul class="sub" style="margin:10px 0 0;padding-left:18px">
        <li>Marque pelo comportamento <b>predominante</b> do encontro, não pelo episódio isolado.</li>
        <li>Na dúvida entre dois níveis, escolha o <b>menor</b> — subir de nível é conquista observada, não benefício da dúvida.</li>
        <li>Encontro atípico (festa, passeio, visita) não é base para observação — pule o ciclo desta criança se foi o caso.</li>
        <li>Compare a criança <b>com ela mesma</b> entre ciclos; nunca com os colegas.</li>
        <li>O que você viu que não cabe na âncora tem caminho humano: fale com a coordenação — texto sobre a criança não entra aqui.</li>
      </ul>
    </details>

    <div class="cartao" style="margin-top:14px">
      ${d.dimensoes.map(dim => `
        <div class="dim">
          <h3>${esc(dim.nome)}</h3>
          <p class="desc">${esc(dim.descricao)}</p>
          <div class="ancoras" role="group" aria-label="${esc(dim.nome)}">
            ${dim.ancoras.map(a => `
              <button class="ancora" data-acao="ancora" data-dim="${dim.id}" data-nivel="${a.nivel}"
                      aria-pressed="${ctx.obs.marcas[dim.id] === a.nivel}">
                <span class="n" aria-hidden="true">${a.nivel}</span>
                <span>${esc(a.texto)}</span>
              </button>`).join('')}
          </div>
        </div>`).join('')}

    </div>

    <div class="aviso protecao" style="margin-top:14px">
      <h3>Não há campo de opinião sobre a criança</h3>
      <p>Texto narrativo sobre criança nomeada é registro clínico, e registro clínico não entra no Percurso —
         a titular desse dado é a psicóloga. Se apareceu algo que precisa de encaminhamento,
         fale com a coordenação: esse caminho é fora daqui.</p>
    </div>

    ${anterior.ciclos.length ? `
    <div class="cartao compacto" style="margin-top:14px">
      <h2>Ciclos anteriores</h2>
      <p class="sub">Registro categórico interno. Nunca sai daqui em nível individual.</p>
      ${tabelaTrajetoria(anterior)}
    </div>` : ''}

    <div class="linha" style="margin-top:16px">
      <button class="btn secundario cresce" data-acao="salvar-obs" data-concluir="0">Salvar rascunho</button>
      <button class="btn cresce" data-acao="salvar-obs" data-concluir="1" id="btn-concluir">Concluir observação</button>
    </div>
    <p class="rodape" id="faltam"></p>`;
  atualizarObs();
}

function atualizarObs() {
  const o = ctx.obs; if (!o) return;
  const feitos = Object.keys(o.marcas).length;
  const el = document.getElementById('faltam');
  if (el) el.textContent = feitos === o.total
    ? 'Tudo marcado. Pode concluir.'
    : `${feitos} de ${o.total} dimensões marcadas — o rascunho guarda o que você já fez.`;
  // O servidor já protege (422 recuperável) — o custo era a IDA E VOLTA: tocar
  // em "Concluir", esperar a rede e receber a recusa. O botão sabe disso aqui,
  // sem pedir nada ao servidor. A regra continua no servidor; isto é só o
  // aviso chegando antes.
  const btn = document.getElementById('btn-concluir');
  if (btn) {
    btn.disabled = feitos !== o.total;
    btn.title = feitos === o.total ? '' : `Faltam ${o.total - feitos} dimensão(ões)`;
  }
}

const MUDANCA = { avancou: ['↑', 'var(--ok)'], estavel: ['→', 'var(--muted)'], recuou: ['↓', 'var(--red)'], sem_par: ['·', 'var(--muted)'] };

// A EVOLUÇÃO NA LÍNGUA DELA (F5). "piorou / manteve / evoluiu" é o método que a
// psicóloga já usou em outra organização e no qual confia. O produto calculava
// isso desde sempre (`evolucao012`) e ela nunca via — o delta só chegava ao
// parecer. A leitura do produto (níveis 1–4) fica ao lado, e não por
// completude: o mapeamento 2 e 3 → 1 é LOSSY e declarado provisório (decisão
// 34), e é vendo ONDE as duas divergem que ela pode avalizá-lo ou recusá-lo.
const EVOLUCAO_COR = { piorou: 'var(--red)', manteve: 'var(--muted)', evoluiu: 'var(--ok)' };

function tabelaTrajetoria(t) {
  if (!t.ciclos.length) return '<p class="vazio">Sem observação concluída ainda.</p>';
  const divergentes = t.dimensoes.filter(d => d.divergente).length;
  return `<div class="rolagem"><table>
    <thead><tr><th>Indicador</th>${t.ciclos.map(c => `<th>${esc(c.nome)}</th>`).join('')}
      <th>Do 1º para o último</th><th>Níveis</th></tr></thead>
    <tbody>${t.dimensoes.map(d => {
      const [seta, cor] = MUDANCA[d.mudanca];
      return `<tr><td>${esc(d.dimensao)}</td>
        ${d.niveis.map(n => `<td><b>${n ?? '—'}</b><span style="color:var(--muted)">${n ? '/4' : ''}</span></td>`).join('')}
        <td style="color:${EVOLUCAO_COR[d.evolucao_rotulo] ?? 'var(--muted)'};font-weight:700">
          ${d.evolucao_rotulo ?? '—'}${d.divergente ? ' *' : ''}</td>
        <td style="color:${cor}">${seta} ${d.mudanca === 'sem_par' ? '' : d.mudanca}</td></tr>`;
    }).join('')}</tbody></table>
    <p class="sub" style="margin-top:8px"><b>Piorou · manteve · evoluiu</b> é a leitura da planilha do
      Instituto (escala 0–2). <b>Níveis</b> é a rubrica do Percurso (1 a 4), que é mais fina.
      ${divergentes ? `<br>* Em ${divergentes} indicador(es) o nível mudou e a planilha não viu —
        o mapeamento que faz isso (2 e 3 viram 1) está <b>declarado provisório</b> até o seu aval.` : ''}</p>
  </div>`;
}

// ======================================================================
// PAINEL DA TURMA (F5 agregado)
// ======================================================================
/**
 * O CALENDÁRIO DA CASA (F4, decisão 37).
 *
 * O turno da turma dá a regra base — a Vivência é de sábado, o Reforço é de dia
 * útil. Mas a casa tem feriado, recesso e encontro extra, e até aqui o produto
 * deduzia o calendário do dia da semana e pronto: feriado virava "chamada em
 * aberto" cobrada para sempre, e encontro extra simplesmente não existia.
 *
 * Guarda só a EXCEÇÃO. Uma tela com uma linha por sábado do ano seria um
 * calendário para alguém manter à mão, e a casa cabe em duas pessoas.
 */
function cartaoCalendario(cal) {
  if (!cal) return '';
  return `
    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Próximos encontros</h2>
        <span class="sub">${esc(cal.turma.turno === 'sabado' ? 'sábados' : 'dias de semana')}</span></div>
      <p class="sub">O Percurso deduz do turno da turma. Marque aqui o que fugir do padrão — feriado, recesso, encontro extra.</p>
      <div class="pilha" style="margin-top:10px">
        ${cal.proximos.map(dt => `
          <div class="item" style="cursor:default">
            <div class="cresce"><div class="nome">${dataBR(dt)}</div><div class="meta">${esc(diaSemana(dt))}</div></div>
            <button class="btn pequeno fantasma" data-acao="cal-marcar" data-data="${dt}" data-tipo="sem_encontro">Não vai ter</button>
          </div>`).join('')}
      </div>
      ${cal.excecoes.length ? `
        <div class="lbl" style="margin-top:14px">Marcado pela casa</div>
        <div class="pilha">
          ${cal.excecoes.map(e => `
            <div class="item" style="cursor:default">
              <div class="cresce"><div class="nome">${dataBR(e.data)}</div>
                <div class="meta">${e.tipo === 'extra' ? 'encontro extra' : 'sem encontro'}${e.motivo ? ` · ${esc(e.motivo)}` : ''}</div></div>
              <button class="btn pequeno fantasma" data-acao="cal-desmarcar" data-data="${e.data}">Desfazer</button>
            </div>`).join('')}
        </div>` : ''}
      <div class="linha" style="margin-top:12px">
        <input type="date" id="cal-data" aria-label="Data do encontro extra" style="flex:1">
        <button class="btn pequeno secundario" data-acao="cal-marcar" data-tipo="extra">Encontro extra</button>
      </div>
    </div>`;
}

rota(/^#\/turma/, async () => {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const d = await api(`/api/hoje${q.get('turma_id') ? `?turma_id=${q.get('turma_id')}` : ''}`);
  if (!d.turma) { app.innerHTML = `<div class="cartao"><h2>Sem turma atribuída</h2></div>`; return; }
  const [p, est, risco, regua, cal] = await Promise.all([
    api(`/api/turma/painel?turma_id=${d.turma.id}`),
    api(`/api/turma/estado?turma_id=${d.turma.id}`),
    api(`/api/turma/risco?turma_id=${d.turma.id}`),
    api(`/api/turma/presenca?turma_id=${d.turma.id}`).catch(() => null),
    api(`/api/calendario?turma_id=${d.turma.id}`).catch(() => null),
  ]);
  ctx.calendario = { turmaId: d.turma.id };
  const emRisco = new Set(risco.linhas.map(l => l.crianca_id));
  app.innerHTML = `
    <p class="kicker">Agregado · sem dado individual</p>
    <h1>Painel da turma</h1>
    <p class="sub">${esc(p.turma.nome)} · médias por dimensão, escala de 1 a 4</p>
    ${cartaoCalendario(cal)}
    <div class="cartao" style="margin-top:16px">
      <div class="lbl">${est.criancas.length} crianças matriculadas</div>
      <div class="pilha" style="margin-top:0">
        ${est.criancas.map(c => `
          <button class="link" data-acao="ir" data-href="#/crianca/${c.id}">
            <span><span>${esc(c.nome)}</span>
              <span class="d ${c.estado === 'atrasado' ? 'atencao' : ''}">${esc(c.rotulo)}${emRisco.has(c.id) ? ' · em risco de sair' : ''}</span></span>
            <span class="chev" aria-hidden="true">›</span>
          </button>`).join('')}
      </div>
      <p class="sub" style="margin-top:10px">O rótulo descreve o registro, nunca a criança.</p>
    </div>

    <div class="cartao" style="margin-top:14px">
      <h2>Médias por dimensão</h2>
      <p class="sub" style="margin-bottom:12px">Escala de 1 a 4, agregado da turma.</p>
      ${barrasDimensoes(p.agregado)}
    </div>
    <div class="grade d2" style="margin-top:14px">
      <div class="cartao compacto">
        <h2>Forças</h2>
        <p class="sub">${p.leitura.forcas.map(esc).join(' · ') || '—'}</p>
      </div>
      <div class="cartao compacto">
        <h2>Atenção</h2>
        <p class="sub">${p.leitura.atencao.map(esc).join(' · ') || '—'}</p>
      </div>
    </div>
    ${p.agenda ? `<div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Cobertura do ciclo</h2><span class="sub">${p.agenda.concluidas}/${p.agenda.observaveis}</span></div>
      ${barra(p.agenda.cobertura, p.agenda.pendentes === 0)}
    </div>` : ''}

    ${cartaoRegua(regua)}

    ${cartaoPlano(p.plano)}

    ${p.tempo?.registros ? `<div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Custo de tempo do registro</h2>
        <span class="selo ${p.tempo.media_segundos <= p.tempo.meta_segundos ? 'ok' : 'pend'}">média ${fmtSeg(p.tempo.media_segundos)}</span></div>
      <p class="sub">${p.tempo.pct_dentro_da_meta}% das ${p.tempo.registros} chamadas ficaram abaixo da meta de 2 minutos — o critério de sucesso do piloto.</p>
    </div>` : ''}
    <p class="rodape">Média de turma é indicador de programa, não avaliação de criança.<br>
      Para fora da organização, só o agregado sai — nunca o registro individual.<br>
      Agregado com menos de ${p.agregado.minimo_celula ?? 5} crianças não é exibido (supressão de célula pequena).</p>`;
});

const fmtSeg = (s) => s == null ? '—' : `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`;

// Decisão 33 — a régua de presença do Instituto (75%). Linguagem de protocolo:
// "abaixo da régua" não é cor de erro, é a conversa com a família que a casa já faz.
const FAIXA = { ok: ['na régua', 'ok'], atencao: ['atenção', 'pend'], abaixo: ['abaixo da régua', 'alerta'], sem_base: ['sem base ainda', ''] };
function cartaoRegua(r) {
  if (!r) return '';
  const res = r.resumo;
  return `
    <div class="cartao" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Régua de presença do Instituto · ${r.minima_pct}%</h2>
        <span class="sub">desde ${dataBR(r.desde)}</span></div>
      <p class="sub">${esc(r.doutrina)}</p>
      <div class="linha" style="margin-top:10px;gap:6px">
        <span class="selo ok">${res.ok} na régua</span>
        <span class="selo pend">${res.atencao} em atenção (${r.minima_pct}–${r.atencao_pct - 1}%)</span>
        <span class="selo alerta">${res.abaixo} abaixo</span>
        ${res.sem_base ? `<span class="selo">${res.sem_base} sem base (menos de ${r.minimo_encontros} encontros)</span>` : ''}
      </div>
      <div class="pilha" style="margin-top:10px">
        ${r.criancas.filter(c => c.faixa !== 'ok').map(c => `
          <button class="link" data-acao="ir" data-href="#/crianca/${c.id}">
            <span><span>${esc(c.nome)}</span><span class="d">${c.pct == null ? '—' : c.pct + '%'} · ${c.presentes} de ${c.encontros} encontros</span></span>
            <span class="selo ${FAIXA[c.faixa][1]}">${FAIXA[c.faixa][0]}</span>
          </button>`).join('') || '<p class="sub">Toda a turma está na régua neste período.</p>'}
      </div>
      <p class="sub" style="margin-top:8px">A régua é para dentro. O recado da turma leva só a presença em número, nunca quem.</p>
    </div>`;
}

// Plano da próxima semana — a devolução: registro vira pauta pronta.
function cartaoPlano(plano) {
  if (!plano) return '';
  const radar = plano.radar.length ? `
    <div class="plano-bloco">
      <h3><span class="plano-tag alerta-tag">radar</span> Sumiram do radar</h3>
      ${plano.radar.map(r => `
        <div class="item" style="cursor:default;margin-top:8px">
          <div class="cresce"><div class="nome">${esc(r.nome)}</div><div class="meta">${esc(r.detalhe)}</div></div>
          ${r.status === 'aberto'
            ? `<button class="btn pequeno" data-acao="tratar-alerta" data-id="${r.alerta_id}" data-status="em_acompanhamento">Marcar para acolher</button>`
            : `<span class="selo pend">em acompanhamento</span>`}
        </div>`).join('')}
      <p class="sub" style="margin-top:8px">Ação sugerida: contato com a família e dinâmica de acolhimento antes que vire evasão.</p>
    </div>` : '';
  const foco = plano.foco ? `
    <div class="plano-bloco">
      <h3><span class="plano-tag foco-tag">foco</span> ${esc(plano.foco.dimensao)}</h3>
      <p class="sub">${esc(plano.foco.justificativa)}</p>
      ${plano.foco.atividade ? `
        <div class="atividade">
          <b>${esc(plano.foco.atividade.titulo)}</b>
          <p>${esc(plano.foco.atividade.descricao)}</p>
          <span class="sub">${esc(plano.foco.atividade.duracao)} · do banco de atividades por dimensão</span>
        </div>` : ''}
    </div>` : '';
  const ganchos = plano.ganchos.length ? `
    <div class="plano-bloco">
      <h3><span class="plano-tag sonho-tag">sonhos</span> Ganchos de aspiração</h3>
      <p class="sub">Aspirações declaradas no Laboratório de Sonhos — repertório para conectar a atividade ao que a criança quer ser.</p>
      <div class="linha" style="margin-top:8px;gap:6px">
        ${plano.ganchos.map(g => `<span class="selo pend" title="${esc(g.criancas)}">${esc(g.area)} · ${g.n}</span>`).join('')}
      </div>
    </div>` : '';
  if (!radar && !foco && !ganchos) return '';
  return `
    <div class="cartao" style="margin-top:14px">
      <h2>Plano da próxima semana</h2>
      <p class="sub">O registro volta como pauta pronta — você só ajusta. ${esc(plano.doutrina)}</p>
      ${radar}${foco}${ganchos}
    </div>`;
}

function barrasDimensoes(agg) {
  if (!agg.series.length) return '<p class="vazio">Ainda não há observação concluída suficiente.</p>';
  const cores = ['var(--muted)', 'var(--red)'];
  return `
    ${agg.series.map(s => `
      <div style="margin-bottom:16px">
        <div class="linha" style="gap:6px"><h3 class="cresce">${esc(s.dimensao)}</h3>
          <span class="sub">${s.valores.map(v => v == null ? '—' : String(v).replace('.', ',')).join(' → ')}</span></div>
        ${s.valores.map((v, i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
            <span style="font-size:11px;color:var(--muted);width:62px;flex:none">${esc(agg.ciclos[i]?.nome.split('·')[0].trim() || '')}</span>
            <div style="flex:1;height:14px;background:var(--card-2);border-radius:20px;overflow:hidden">
              <i style="display:block;height:100%;width:${v == null ? 0 : (v / 4) * 100}%;background:${cores[i % 2]};border-radius:20px;transition:width .6s cubic-bezier(.2,.8,.2,1)"></i>
            </div>
            ${v == null && (s.n?.[i] ?? 0) > 0 ? '<span style="font-size:10px;color:var(--bloq)">suprimido (n&lt;' + (agg.minimo_celula ?? 5) + ')</span>' : ''}
          </div>`).join('')}
      </div>`).join('')}
    <div class="legenda">${agg.ciclos.map((c, i) =>
      `<span><i style="background:${cores[i % 2]}"></i>${esc(c.nome)}</span>`).join('')}</div>`;
}

// ======================================================================
// CRIANCAS + FICHA VIVA (F1)
// ======================================================================
// ======================================================================
// A CRIANÇA (F2) — a busca, a ficha, o olhar do ciclo e o parecer eram QUATRO
// telas. São o mesmo assunto, e a pessoa já está na ficha quando precisa das
// outras três: o olhar e o parecer acontecem ONDE ela está, não noutro lugar.
// ======================================================================
rota(/^#\/crianca/, async () => {
  const [caminho, busca] = location.hash.split('?');
  const q = new URLSearchParams(busca || '');
  const id = (caminho.match(/^#\/crianca\/(\d+)/) || [])[1];
  const ver = q.get('ver');
  if (ver === 'parecer') return telaParecer(q.get('pid'));
  if (id && ver === 'observacao') return telaOlharDaCrianca(id);
  return id ? telaFichaDaCrianca(id) : telaBuscarCrianca();
});

async function telaBuscarCrianca() {
  const r = await api('/api/criancas');
  app.innerHTML = `
    <p class="kicker">Ficha viva · criança é entidade, matrícula é relação</p>
    <h1>Crianças</h1>
    <div class="cartao" style="margin-top:16px">
      <input type="text" id="busca" data-acao="buscar" placeholder="Buscar por nome ou código…" autocomplete="off">
      <div class="pilha" id="resultado" style="margin-top:12px">${listaCriancas(r)}</div>
    </div>
    ${sessao.papel === 'coordenacao' ? `<div class="linha" style="margin-top:12px">
      <button class="btn pequeno secundario" data-acao="ir" data-href="#/pessoas">Cadastrar criança</button>
    </div>` : ''}`;
}

// A-13: o corte da lista deixa de ser silencioso — quando ha' mais criancas do
// que a tela mostra, a propria lista declara o corte e aponta a busca.
const listaCriancas = (r) => {
  const cs = r.criancas ?? r;
  const total = r.total ?? cs.length;
  if (!cs.length) return '<p class="vazio">Nenhuma criança encontrada.</p>';
  const aviso = total > cs.length
    ? `<p class="sub" style="margin:0 0 8px">Mostrando ${cs.length} de ${total} crianças — use a busca para encontrar as demais.</p>` : '';
  return aviso + cs.map(c => `
  <button class="item" data-acao="ir" data-href="#/crianca/${c.id}">
    <div class="cresce"><div class="nome">${esc(c.nome)}</div>
      <div class="meta">${esc(c.codigo)} · ${esc(c.programas || '')}</div></div>
    <span class="seta" aria-hidden="true">›</span>
  </button>`).join('');
};

// ======================================================================
// A PORTA DO OLHAR, NA FICHA (pedido do campo, 04/09/2026).
//
// A pergunta foi: "onde esses pontos são registrados? não é a professora /
// psicóloga que tem que registrar? como se faz isso?". Registrar sempre foi
// dela — mas a única porta ficava em Hoje → Ciclo de observação, e a tabela
// que mostra os pontos, na ficha, não levava a lugar nenhum. Quem olhava para
// os números não tinha como mexer neles: parecia dado que vem de fora.
//
// O cartão passa a dizer o estado e a abrir o registro. Quando NÃO dá para
// registrar, diz o motivo — bloqueio de consentimento não é erro do sistema, é
// a regra dele, e esconder o botão faria o motivo sumir junto.
// ======================================================================
function blocoRegistrarOlhar(olhar, crianca) {
  if (!olhar || olhar._erro) {
    return `<p class="sub" style="margin-top:8px">Sem registro possível agora: ${esc(olhar?._erro ?? 'não há ciclo de observação aberto')}.</p>`;
  }
  if (olhar.na_rubrica === false) {
    return `<p class="sub" style="margin-top:8px">Na Vivência terapêutica o registro é de turma — presença,
      procedimento e check-in de grupo —, nunca observação individual (decisão 31). O que aparece abaixo
      vem dos outros programas em que esta criança está.</p>`;
  }
  const feito = olhar.observacao?.status === 'concluida';
  const comecado = olhar.observacao?.status === 'rascunho';
  if (!olhar.elegibilidade?.pode && !feito) {
    return `<div class="aviso" style="margin-top:10px">
      <h3>Ainda não dá para registrar</h3>
      <p>${esc(olhar.elegibilidade?.texto ?? 'Esta criança não está elegível neste ciclo.')}</p></div>`;
  }
  return `<div class="linha" style="margin-top:10px;gap:8px;flex-wrap:wrap">
      <span class="selo ${feito ? 'ok' : comecado ? 'pend' : 'pend'}">${
        feito ? 'feito neste ciclo' : comecado ? 'começado' : 'a fazer neste ciclo'}</span>
      <span class="sub cresce">${esc(olhar.ciclo.nome)}</span>
      <button class="btn pequeno ${feito ? 'fantasma' : ''}" data-acao="ir"
        data-href="#/crianca/${crianca.id}?ver=observacao">${
        feito ? 'Rever o que você registrou' : comecado ? 'Terminar o registro' : 'Registrar o olhar'}</button>
    </div>
    <p class="sub" style="margin-top:6px">Quem registra é quem atende — professora ou psicóloga. Uma vez por ciclo, ~3 min.</p>`;
}

// ======================================================================
// O BOLETIM DA CRIANÇA (decisão 42) — o recado, mas para UMA família.
//
// O recado da turma leva só agregado porque vai para o grupo de responsáveis.
// Este vai para UM responsável: o da criança. Aí a regra se inverte — o que
// protegia lá viraria, aqui, negar ao titular o acesso ao próprio dado
// (LGPD Art. 18, II). O que continua fora está escrito no cartão, não
// escondido: relato livre e alerta são conversa, não mensagem.
// ======================================================================
function cartaoBoletim(bol, crianca) {
  if (!bol) return '';
  const prim = esc(crianca.nome.split(' ')[0]);
  return `<div class="cartao compacto" style="margin-top:14px">
    <h2>Para o responsável de ${prim}</h2>
    <p class="sub">Matrícula, presença e evolução socioemocional num texto só, pronto para enviar a
      ${esc(bol.responsavel)}. Não fica guardado: é montado agora, do que já está registrado.</p>
    <div class="cartao" style="margin-top:10px;background:var(--fundo)">
      <pre id="boletim-texto" style="white-space:pre-wrap;font:inherit;line-height:1.55;margin:0">${esc(bol.texto)}</pre>
    </div>
    <details style="margin-top:10px">
      <summary style="cursor:pointer;font-size:13px;color:var(--tinta-fraca)">O que este texto não leva</summary>
      <ul class="sub" style="margin:8px 0 0;padding-left:18px">
        ${bol.fora.map(x => `<li>${esc(x)}</li>`).join('')}
      </ul>
      <p class="sub" style="margin-top:6px">Não é esquecimento: é decisão. Isso se fala pessoalmente.</p>
    </details>
    <div class="pilha" style="margin-top:12px">
      <button class="btn largo secundario" data-acao="copiar-boletim">Copiar o boletim</button>
      ${bol.whatsapp_url
        ? `<a class="btn largo" href="${bol.whatsapp_url}" target="_blank" rel="noopener">Enviar no WhatsApp para ${esc(bol.responsavel.split(' ')[0])}</a>`
        : `<p class="sub" style="margin:0">Sem telefone cadastrado, o WhatsApp não abre. ${
            sessao.papel === 'coordenacao' ? 'Preencha ali em cima, em "Quem responde por ' + prim + '".' : 'A coordenação cadastra o telefone na ficha.'}</p>`}
    </div>
  </div>`;
}

async function telaFichaDaCrianca(id) {
  const [f, par, ac, rel, olhar, bol] = await Promise.all([
    api(`/api/crianca?id=${id}`),
    api(`/api/parecer?crianca_id=${id}`).catch(() => null),
    api(`/api/acessos?crianca_id=${id}`).catch(() => null),
    api(`/api/relato-crianca?crianca_id=${id}`).catch(() => null),
    // O estado do olhar DESTA criança neste ciclo. Sem ciclo aberto, sem turma
    // na rubrica ou sem consentimento a rota falha — e o cartão diz o motivo em
    // vez de esconder o botão, que era o defeito de antes.
    api(`/api/observacao?crianca_id=${id}`).catch((e) => ({ _erro: e.message })),
    api(`/api/boletim?crianca_id=${id}`).catch(() => null),
  ]);
  ctx.parecer = { criancaId: Number(id) };
  // Decisão 32: o parecer para profissional parceiro — o único dado individual
  // que sai, por código, sob consentimento e liberado. A ficha é a porta.
  // QUEM LEU ESTA FICHA (decisão 38). Era dívida declarada desde a v1
  // ("exigível sob LGPD") e é pré-requisito escrito do campo livre de relato:
  // sem rastro, qualquer pessoa que abrisse a página leria a ficha de qualquer
  // criança e ninguém saberia. Fica NA FICHA, e não numa tela de administração,
  // porque é aqui que a pergunta nasce.
  const cartaoAcessos = !ac?.acessos?.length ? '' : `
    <details class="cartao compacto" style="margin-top:14px">
      <summary style="cursor:pointer;font-weight:600">Quem abriu esta ficha · ${ac.acessos.length}</summary>
      <p class="sub" style="margin-top:8px">O registro guarda quem, o quê e quando — nunca o que foi lido.
        Ler este rastro também fica registrado.</p>
      <div class="pilha" style="margin-top:8px">
        ${ac.acessos.slice(0, 12).map(a2 => `<div class="dado">
          <span class="k">${esc(a2.quem)} · ${esc(a2.papel)}</span>
          <b style="font-weight:500">${esc(a2.recurso)} · ${dataBR(a2.em)}</b></div>`).join('')}
      </div>
    </details>`;

  // CAMPO LIVRE SOBRE A CRIANÇA (decisão 40). Tem lugar próprio, e não dentro
  // da rubrica: base legal, retenção e leitores são outros. Exige o
  // consentimento específico do responsável — o mesmo campo de governança que a
  // v1 já declarava e que ficou de pé mesmo depois de a decisão 15 tirar o
  // campo da tela.
  const cartaoRelato = !rel ? '' : (rel.consentimento !== 'ativo' ? `
    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Relato sobre ${esc(f.crianca.nome.split(' ')[0])}</h2>
        <span class="selo bloq">${esc(rel.consentimento)}</span></div>
      <p class="sub">Depende do consentimento específico do responsável, que está ${esc(rel.consentimento)}.
        A coordenação registra em Consentimentos.</p>
    </div>` : `
    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">O específico desta criança</h2>
        <span class="selo ok">consentido</span></div>
      <p class="sub">O que os campos fechados não pegam. Fica só aqui: não vai para relatório, síntese,
        planilha, recado nem para nenhum modelo. <b>Nome de criança sai por código</b> — o dela e o de
        qualquer outra que você citar. Fica enquanto a matrícula estiver ativa, mais dois anos.
        Conteúdo de atendimento continua sendo conversa com a coordenação.</p>
      <textarea id="relato-crianca" rows="3" style="margin-top:8px"
        placeholder="Ex.: pediu para sentar perto da porta e explicou por quê."></textarea>
      <p class="sub" id="relato-crianca-erro" role="alert" style="min-height:18px"></p>
      <button class="btn pequeno secundario" data-acao="salvar-relato-crianca" data-id="${f.crianca.id}">Guardar</button>
      ${rel.relatos.length ? `<div class="pilha" style="margin-top:12px">
        ${rel.relatos.map(r => `<div class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:6px">
          <p style="margin:0">${esc(r.texto)}</p>
          <div class="linha"><span class="meta cresce">${esc(r.quem)} · ${dataBR(r.criado_em)}</span>
            <button class="btn pequeno fantasma" data-acao="apagar-relato-crianca" data-id="${r.id}">Apagar</button></div>
        </div>`).join('')}
      </div>` : ''}
    </div>`);

  const cartaoParecer = !par ? '' : `
    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Parecer a profissional parceiro</h2>
        <span class="selo ${par.consentimento === 'ativo' ? 'ok' : 'bloq'}">consentimento ${esc(par.consentimento)}</span></div>
      <p class="sub">Quando a assistente social do projeto parceiro perguntar "como está", a resposta sai daqui: por <b>código</b>, com presença, régua e evolução por indicador do programa — nunca nome, nunca conteúdo clínico. Só com consentimento específico do responsável, e só vale depois de liberado.</p>
      ${par.consentimento !== 'ativo' ? `
        <div class="aviso" style="margin-top:10px"><h3>Sem consentimento específico, não sai</h3>
          <p>${sessao.papel === 'coordenacao' ? 'Registre abaixo o consentimento do responsável para compartilhar com profissional parceiro.' : 'A coordenação registra o consentimento do responsável na tela de Consentimentos.'}</p>
          ${sessao.papel === 'coordenacao' ? `<label class="rot-campo" for="par-resp">Responsável que consentiu</label>
            <input type="text" id="par-resp" placeholder="Nome do responsável" autocomplete="off">
            <button class="btn pequeno" data-acao="consentir-parecer" style="margin-top:10px">Registrar consentimento</button>` : ''}
        </div>` : `
        <label class="rot-campo" for="par-dest">Para quem (profissional e serviço)</label>
        <input type="text" id="par-dest" placeholder="Ex.: assistente social — projeto parceiro" autocomplete="off">
        <button class="btn pequeno" data-acao="gerar-parecer" style="margin-top:10px">Gerar o parecer (rascunho)</button>`}
      ${par.pareceres.length ? `<div class="pilha" style="margin-top:12px">
        ${par.pareceres.map(p => `<button class="link" data-acao="ir" data-href="#/crianca?ver=parecer&pid=${p.id}">
          <span><span>${esc(p.destinatario)}</span><span class="d">${dataBR(p.gerado_em)} · ${p.status === 'liberado' ? `liberado por ${esc(p.liberado_por_nome ?? '—')}` : 'rascunho'}</span></span>
          <span class="selo ${p.status === 'liberado' ? 'ok' : 'pend'}">${p.status}</span></button>`).join('')}
      </div>` : ''}
    </div>`;
  const pres = f.presencas.map(p =>
    `<span title="${dataBR(p.data)}" style="display:inline-block;width:14px;height:22px;border-radius:4px;margin-right:4px;background:${p.status === 'P' ? 'var(--ok)' : 'var(--red)'};opacity:${p.status === 'P' ? .85 : 1}"></span>`).join('');

  app.innerHTML = `
    <p class="kicker">Ficha viva</p>
    <h1>${esc(f.crianca.nome)}</h1>
    <p class="sub">${esc(f.crianca.codigo)} · ${f.crianca.idade} anos
      ${f.crianca.aspiracao ? ` · <span class="selo pend" title="Aspiração declarada no Laboratório de Sonhos">sonho: ${esc(f.crianca.aspiracao)}</span>` : ''}</p>

    ${f.alerta ? `<div class="aviso" style="margin-top:14px">
      <h3>Alerta de ausência</h3><p>${esc(f.alerta.detalhe)}</p>
      <div class="linha">
        <button class="btn pequeno" data-acao="tratar-alerta" data-id="${f.alerta.id}" data-status="em_acompanhamento">Avisar coordenação</button>
        <button class="btn pequeno secundario" data-acao="tratar-alerta" data-id="${f.alerta.id}" data-status="resolvido">Já resolvi</button>
      </div></div>` : ''}

    <div class="cartao compacto" style="margin-top:14px">
      <h2>Quem responde por ${esc(f.crianca.nome.split(' ')[0])}</h2>
      <p class="sub">É para esta pessoa — e só para ela — que o boletim desta criança vai.</p>
      <div class="dado" style="margin-top:8px"><span class="k">Responsável</span>
        <b style="font-weight:500">${esc(f.crianca.responsavel)}</b></div>
      <div class="dado"><span class="k">Telefone</span>
        <b style="font-weight:500">${f.crianca.responsavel_contato
          ? esc(bol?.contato_legivel ?? f.crianca.responsavel_contato)
          : '<span class="sub">sem telefone — o boletim não tem para onde ir</span>'}</b></div>
      ${sessao.papel === 'coordenacao' ? `
        <details style="margin-top:10px">
          <summary style="cursor:pointer;font-size:13px;color:var(--tinta-fraca)">Corrigir responsável ou telefone</summary>
          <label class="rot-campo" for="resp-nome">Responsável</label>
          <input type="text" id="resp-nome" value="${esc(f.crianca.responsavel)}" autocomplete="off">
          <label class="rot-campo" for="resp-tel">Telefone com DDD</label>
          <input type="tel" id="resp-tel" inputmode="tel" placeholder="(11) 98888-7777"
            value="${esc(bol?.contato_legivel ?? '')}" autocomplete="off">
          <button class="btn pequeno secundario" data-acao="salvar-responsavel" data-id="${f.crianca.id}"
            style="margin-top:10px">Guardar</button>
        </details>` : ''}
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>Matrículas</h2>
      <p class="sub">A criança é única; cada matrícula é uma relação com um programa.</p>
      <div class="pilha" style="margin-top:10px">
        ${f.matriculas.map(m => `<div class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:8px">
          <div class="linha">
            <div class="cresce"><div class="nome">${esc(m.programa)}</div>
              <div class="meta">${esc(m.turma || 'sem turma')} · desde ${dataBR(m.entrada)}${m.saida ? ` · saiu em ${dataBR(m.saida)}` : ''}</div></div>
            <span class="selo ${m.status === 'ativa' ? 'ok' : 'bloq'}">${m.status}</span>
          </div>
          ${sessao.papel === 'coordenacao' && m.status === 'ativa' && f.turmas ? `
            <div class="linha" style="gap:8px">
              <select id="mt-${m.id}" style="flex:1;min-width:170px">
                <option value="">Sem turma neste programa</option>
                ${f.turmas.filter(t => t.programa_id === m.programa_id).map(t =>
                  `<option value="${t.id}" ${t.id === m.turma_id ? 'selected' : ''}>${esc(t.nome)}${
                    t.educador ? ` — ${esc(t.educador)}` : ' — sem professora'}</option>`).join('')}
              </select>
              <button class="btn pequeno fantasma" data-acao="mudar-turma" data-id="${m.id}">Mudar de turma</button>
            </div>` : ''}
        </div>`).join('')}
      </div>
      ${sessao.papel === 'coordenacao' && f.programas ? `
        <details style="margin-top:12px">
          <summary style="cursor:pointer;font-size:13px;color:var(--tinta-fraca)">Matricular em outro programa</summary>
          <p class="sub" style="margin-top:8px">A criança é única; cada matrícula é uma relação com um programa.
            Mudar de <b>horário</b> é trocar a turma, aqui em cima; isto aqui é entrar num programa a mais.</p>
          <label class="rot-campo" for="nm-prog">Programa</label>
          <select id="nm-prog">${f.programas
            .filter(p => !f.matriculas.some(m => m.status === 'ativa' && m.programa_id === p.id))
            .map(p => `<option value="${p.id}">${esc(p.nome)}${p.no_escopo === 0 ? ' (fora da medição)' : ''}</option>`).join('')
            || '<option value="">Já está em todos os programas</option>'}</select>
          <label class="rot-campo" for="nm-turma">Turma</label>
          <select id="nm-turma"></select>
          <label class="rot-campo" for="nm-entrada">Entrada</label>
          <input type="date" id="nm-entrada" value="${hojeIso()}" max="${hojeIso()}">
          <button class="btn pequeno secundario" data-acao="matricular" data-id="${f.crianca.id}"
            style="margin-top:10px">Matricular</button>
        </details>` : ''}
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Presença</h2><span class="sub">${f.presenca_pct ?? '—'}% no histórico</span></div>
      <p class="sub">Últimos ${f.presencas.length} encontros</p>
      <div style="margin-top:10px">${pres || '<span class="sub">sem registro</span>'}</div>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>O olhar deste ciclo</h2>
      <p class="sub">Uso interno da equipe. Para fora, só agregado.</p>
      ${blocoRegistrarOlhar(olhar, f.crianca)}
      <div style="margin-top:10px">${tabelaTrajetoria(f.trajetoria)}</div>
    </div>

    ${cartaoRelato}
    ${cartaoParecer}
    ${cartaoBoletim(bol, f.crianca)}
    ${cartaoAcessos}


    ${sessao.papel === 'coordenacao' && f.crianca.ativo ? `<div class="cartao compacto" style="margin-top:14px">
      <h2>Saiu do programa</h2>
      <p class="sub">Arquivar encerra as matrículas ativas com data e tira ${esc(f.crianca.nome.split(' ')[0])} das
        listas vivas. <b>Nada é apagado</b>: a presença e a trajetória continuam — é o que a curva de
        permanência e a leitura de evasão precisam ler. Ela volta pelo arquivo, com matrícula nova.</p>
      <label class="rot-campo" for="saida-crianca">Data da saída</label>
      <input type="date" id="saida-crianca" value="${hojeIso()}" max="${hojeIso()}">
      <button class="btn secundario" data-acao="arquivar-crianca" data-id="${f.crianca.id}"
        style="margin-top:14px">Mandar para o arquivo</button>
    </div>` : ''}`;

  // Mesma regra do cadastro: turma segue programa. O domínio recusa turma de
  // outro programa, e um select que oferece o inválido é uma armadilha.
  const prog = document.getElementById('nm-prog');
  const turmaSel = document.getElementById('nm-turma');
  if (prog && turmaSel && f.turmas) {
    const sincronizar = () => {
      turmaSel.innerHTML = '<option value="">Sem turma por enquanto</option>' +
        f.turmas.filter(t => String(t.programa_id) === prog.value)
          .map(t => `<option value="${t.id}">${esc(t.nome)}${t.educador ? ` — ${esc(t.educador)}` : ''}</option>`).join('');
    };
    prog.addEventListener('change', sincronizar);
    sincronizar();
  }
}

// ======================================================================
// PARECER (decisão 32) — o texto, a liberação e o registro de que saiu.
// ======================================================================
async function telaParecer(id) {
  const p = await api(`/api/parecer/ver?id=${id}`);
  ctx.parecer = { id: Number(id), criancaId: p.crianca_id };
  app.innerHTML = `
    <p class="kicker">Parecer · código ${esc(p.numeros.codigo)}</p>
    <h1>${p.status === 'liberado' ? 'Parecer liberado' : 'Parecer em rascunho'}</h1>
    <p class="sub">Para ${esc(p.destinatario)} · gerado por ${esc(p.gerado_por_nome)} em ${dataBR(p.gerado_em)}${p.liberado_em ? ` · liberado por ${esc(p.liberado_por_nome)} em ${dataBR(p.liberado_em)}` : ''}</p>
    <div class="cartao" style="margin-top:14px">
      <pre id="parecer-texto" style="white-space:pre-wrap;font:inherit;line-height:1.55;margin:0">${esc(p.texto)}</pre>
    </div>
    <div class="aviso calmo" style="margin-top:12px">
      <h3>O que sai e o que não sai</h3>
      <p>Sai: código, presença e régua, evolução por indicador do programa (piorou/manteve/evoluiu), o fato de haver ou não acompanhamento. Não sai: nome, alerta em detalhe, qualquer conteúdo clínico. Revisor de sobre-alegação: ${esc(p.revisor_status)}.</p>
    </div>
    <div class="pilha">
      ${p.status === 'liberado' ? '' : `<button class="btn largo" data-acao="liberar-parecer">Revisei — liberar para enviar</button>`}
      <button class="btn largo secundario" data-acao="copiar-parecer">Copiar o texto</button>
      <button class="btn largo fantasma" data-acao="ir" data-href="#/crianca/${p.crianca_id}">Voltar à ficha</button>
    </div>
    <p class="rodape">O envio é feito por você, no canal que já usa com o serviço parceiro. O registro de que este parecer saiu — para quem, quando, liberado por quem — fica aqui, permanente.</p>`;
}

// ======================================================================
// ALERTAS (F6)
// ======================================================================
async function telaAlertas() {
  const { alertas, faltas_para_lista } = await api('/api/alertas');
  app.innerHTML = `
    ${VOLTA_AO_HOJE}
    <h1 style="margin-top:10px">Quem precisa de atenção</h1>
    <p class="sub">Disparam com ${faltas_para_lista} faltas consecutivas — antes de virar evasão.</p>
    <div class="pilha">
      ${alertas.length ? alertas.map(a => `
        <div class="cartao compacto">
          <div class="linha"><h2 class="cresce">${esc(a.nome)}</h2>
            <span class="selo ${a.status === 'aberto' ? 'alerta' : 'pend'}">${a.status.replace('_', ' ')}</span></div>
          <p class="sub" style="margin-top:4px">${esc(a.detalhe)}</p>
          <p class="sub">${esc(a.programas || '')}</p>
          ${a.tratativa ? `<p class="sub" style="margin-top:6px">Tratativa: ${esc(a.tratativa)}</p>` : ''}
          <div class="linha" style="margin-top:10px">
            <button class="btn pequeno secundario" data-acao="ir" data-href="#/crianca/${a.crianca_id}">Ver ficha</button>
            ${a.status !== 'em_acompanhamento' ? `<button class="btn pequeno" data-acao="tratar-alerta" data-id="${a.id}" data-status="em_acompanhamento">Em contato com a família</button>` : ''}
            <button class="btn pequeno fantasma" data-acao="tratar-alerta" data-id="${a.id}" data-status="resolvido">Resolvido</button>
          </div>
        </div>`).join('') : '<p class="vazio">Nenhum alerta aberto.</p>'}
    </div>`;
}

// ======================================================================
// PAINEL DA COORDENACAO (F1 + F5 + F6)
// ======================================================================
// ======================================================================
// PAINEL DA COORDENAÇÃO (F2) — o painel, os três scores, as safras e a síntese
// do ciclo eram QUATRO telas, e a única porta para três delas era uma linha de
// botões `pequeno fantasma` dentro do próprio painel. Isso não é navegação: é
// um menu escondido dentro de uma tela. Viraram abas do mesmo lugar.
// ======================================================================
const ABAS_PAINEL = [
  ['visao', 'Visão geral'],
  ['scores', 'Três scores'],
  ['safras', 'Safras'],
  ['sintese', 'Síntese do ciclo'],
];

const cabecalhoPainel = (ativa) => `
    <p class="kicker">Coordenação · o que o registro devolve</p>
    <h1>Painel</h1>
    <div class="linha" style="margin-top:12px;flex-wrap:wrap;gap:8px">
      ${ABAS_PAINEL.map(([k, rot]) => `<button class="btn pequeno ${k === ativa ? '' : 'fantasma'}"
        data-acao="ir" data-href="#/painel${k === 'visao' ? '' : `?aba=${k}`}" ${k === ativa ? 'aria-current="page"' : ''}>${rot}</button>`).join('')}
    </div>`;

rota(/^#\/painel/, async () => {
  const aba = (location.hash.match(/[?&]aba=([a-z]+)/) || [])[1] || 'visao';
  if (aba === 'scores') return telaScores();
  if (aba === 'safras') return telaSafras();
  if (aba === 'sintese') return telaSintese();
  return telaVisaoGeral();
});

async function telaVisaoGeral() {
  // A planilha socioemocional (decisão 34) é leitura à parte: se não houver dois
  // ciclos com observação, o cartão diz isso em vez de derrubar o painel.
  const [d, pl, rg] = await Promise.all([api('/api/painel'), api('/api/planilha/resumo').catch(() => null), api('/api/regua').catch(() => null)]);
  const inv = d.inventario;
  const fmt2 = (v) => v == null ? '—' : String(v).replace('.', ',');
  const cartaoPlanilha = !pl ? '' : `
    <div class="cartao" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Planilha socioemocional · ${esc(pl.ciclo_inicial.nome)} → ${esc(pl.ciclo_final.nome)}</h2>
        <span class="selo ok">${pl.criancas_avaliadas} crianças</span></div>
      <p class="sub">A leitura no formato que o Instituto já usa: nota inicial × final por indicador (0–2), quantas melhoraram e a leitura da própria planilha (≥70% resultado forte · ≥50% evolução moderada). Linhas com menos de ${pl.minimo_celula} crianças saem sem número.</p>
      <div class="rolagem" style="margin-top:12px"><table>
        <thead><tr><th>Indicador</th><th>Inicial</th><th>Final</th><th>Melhoraram</th><th>Leitura</th></tr></thead>
        <tbody>${[...pl.indicadores, pl.geral].map(i => `<tr${i.indicador === 'Geral' ? ' style="font-weight:600"' : ''}>
          <td>${esc(i.indicador)}</td>
          <td>${fmt2(i.media_inicial)}</td><td>${fmt2(i.media_final)}</td>
          <td>${i.suprimida ? `<span class="sub">n &lt; ${pl.minimo_celula}</span>` : `${i.melhoraram} de ${i.comparadas} (${Math.round((i.pct_melhoraram ?? 0) * 100)}%)`}</td>
          <td>${esc(i.leitura ?? '—')}</td></tr>`).join('')}</tbody></table></div>
      <p class="sub" style="margin-top:10px">${esc(pl.legenda)} ${esc(pl.ressalva)}</p>
      <div class="linha" style="margin-top:12px">
        <a class="btn pequeno secundario" href="/api/exportar/planilha?inicial=${pl.ciclo_inicial.id}&final=${pl.ciclo_final.id}" download>Exportar a planilha (CSV, por código)</a>
        <span class="sub">Sem nome: o cadastro que liga código a criança fica com a coordenação.</span>
      </div>
    </div>`;
  app.innerHTML = cabecalhoPainel('visao') + `
    <p class="sub" style="margin-top:12px">${esc(d.ciclo.nome)} · o que o Instituto tem hoje, medido — não estimado.</p>

    <button class="btn largo secundario" data-acao="ir" data-href="#/divulgar" style="margin-top:14px">
      Divulgar · grupos e Instagram</button>

    <div class="kpis" style="margin-top:16px">
      <div class="kpi"><b>${inv.criancasUnicas}</b><span>Crianças únicas ativas</span>
        <small>${inv.matriculas} matrículas — ${inv.multi} em 2 programas</small></div>
      <div class="kpi"><b>${d.numeros.cobertura_pct}%</b><span>Cobertura do ciclo</span>
        <small>${d.numeros.observadas} de ${d.numeros.ativas} observadas</small></div>
      <div class="kpi"><b>${d.presenca.pct ?? '—'}%</b><span>Presença média · mês</span>
        <small>${d.presenca.presentes} de ${d.presenca.total} registros</small></div>
      <div class="kpi"><b>${d.alertas.length}</b><span>Alertas de ausência</span>
        <small>${d.alertas.filter(a => a.status === 'em_acompanhamento').length} em acompanhamento</small></div>
    </div>

    ${d.tempo?.registros ? `<div class="cartao compacto" style="margin-top:16px">
      <div class="linha"><h2 class="cresce">A promessa de tempo, medida</h2>
        <span class="selo ${d.tempo.media_segundos <= d.tempo.meta_segundos ? 'ok' : 'pend'}">média ${fmtSeg(d.tempo.media_segundos)}</span></div>
      <p class="sub">${d.tempo.pct_dentro_da_meta}% das ${d.tempo.registros} chamadas abaixo de 2 minutos — o critério de sucesso do experimento de validação. O encontro e a burocracia terminam juntos.</p>
    </div>` : ''}

    <div class="cartao" style="margin-top:16px">
      <h2>A pergunta 1 do dossiê, respondida</h2>
      <p class="sub">"120" era matrícula, não criança. O Percurso separa as duas coisas — nenhuma afirmação de impacto é verificável antes disso.</p>
      <div class="rolagem" style="margin-top:12px"><table>
        <thead><tr><th>Programa</th><th>Faixa</th><th>Cadência</th><th>Matrículas</th><th>Crianças</th><th>Cobertura</th></tr></thead>
        <tbody>${d.programas.map(p => `<tr>
          <td><b>${esc(p.nome)}</b></td><td>${esc(p.faixa)}</td><td>${esc(p.cadencia)}</td>
          <td>${p.matriculas}</td><td>${p.ativas}</td>
          <td>${p.cobertura}%</td></tr>`).join('')}
        <tr><td colspan="3"><b>Total</b></td><td><b>${inv.matriculas}</b></td><td><b>${inv.criancasUnicas}</b></td><td>—</td></tr>
        </tbody></table></div>
      ${d.foraDeEscopo.map(p => `<p class="sub" style="margin-top:12px"><b style="color:var(--ink)">${esc(p.nome)}</b> — ${esc(p.nota)}</p>`).join('')}
    </div>

    ${d.reconciliacao ? `<div class="cartao" style="margin-top:14px">
      <h2>Reconciliação dos números divergentes</h2>
      <p class="sub">${esc(d.reconciliacao.decisao)}</p>
      <div class="rolagem" style="margin-top:12px"><table>
        <thead><tr><th>Fonte</th><th>Valor registrado</th><th>O que media</th><th>Leitura adotada</th></tr></thead>
        <tbody>${d.reconciliacao.fontes.map(f => `<tr>
          <td><b>${esc(f.fonte)}</b></td><td>${esc(f.valor)}</td><td>${esc(f.media)}</td><td>${esc(f.leitura)}</td>
        </tr>`).join('')}</tbody></table></div>
    </div>` : ''}

    <div class="cartao" style="margin-top:14px">
      <h2>Médias por dimensão · Instituto</h2>
      <p class="sub">Agregado de todos os programas em escopo. Nenhum dado individual.</p>
      <div style="margin-top:14px">${barrasDimensoes(d.agregado)}</div>
    </div>

    ${cartaoPlanilha}

    ${!rg ? '' : `<div class="cartao" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Régua de presença do Instituto · ${rg.minima_pct}%</h2><span class="sub">desde ${dataBR(rg.desde)}</span></div>
      <p class="sub">A política que a casa já usa (75% para permanecer e para o grupo de benefícios; abaixo de ${rg.atencao_pct}%, atenção), lida do registro de presença. Aqui só contagens; a criança aparece na tela de cada turma.</p>
      <div class="rolagem" style="margin-top:12px"><table>
        <thead><tr><th>Turma</th><th>Crianças</th><th>Na régua</th><th>Atenção</th><th>Abaixo</th><th>Sem base</th></tr></thead>
        <tbody>${rg.turmas.map(t => `<tr><td><b>${esc(t.turma.nome)}</b></td><td>${t.criancas}</td><td>${t.resumo.ok}</td>
          <td style="color:${t.resumo.atencao ? 'var(--atencao)' : 'inherit'}">${t.resumo.atencao}</td>
          <td style="color:${t.resumo.abaixo ? 'var(--red)' : 'inherit'}">${t.resumo.abaixo}</td><td>${t.resumo.sem_base}</td></tr>`).join('')}
        <tr style="font-weight:600"><td>Total</td><td>${rg.turmas.reduce((a, t) => a + t.criancas, 0)}</td><td>${rg.total.ok}</td><td>${rg.total.atencao}</td><td>${rg.total.abaixo}</td><td>${rg.total.sem_base}</td></tr>
        </tbody></table></div>
    </div>`}

    ${d.calibracao && d.calibracao.linhas.length ? `<div class="cartao" style="margin-top:14px">
      <h2>Calibração do olhar entre educadoras</h2>
      <p class="sub">${esc(d.calibracao.leitura)} Só entram células com ${d.calibracao.minimo_celula}+ observações;
        divergência marcada a partir de ${String(d.calibracao.limiar).replace('.', ',')} nível.</p>
      <div class="rolagem" style="margin-top:12px"><table>
        <thead><tr><th>Dimensão</th><th>Educadora</th><th>Média dela</th><th>Média geral</th><th>Desvio</th></tr></thead>
        <tbody>${d.calibracao.linhas.map(l => `<tr${l.divergente ? ' style="font-weight:600"' : ''}>
          <td>${esc(l.dimensao)}</td><td>${esc(l.educadora)}</td>
          <td>${String(l.media).replace('.', ',')}</td><td>${String(l.media_geral ?? '—').replace('.', ',')}</td>
          <td>${l.desvio > 0 ? '+' : ''}${String(l.desvio ?? '—').replace('.', ',')}${l.divergente ? ' ◆' : ''}</td>
        </tr>`).join('')}</tbody></table></div>
      ${d.calibracao.divergencias.length
        ? `<p class="sub" style="margin-top:10px">◆ ${d.calibracao.divergencias.length} célula(s) para calibrar juntas com as âncoras — pauta de reunião, nunca avaliação de educadora.</p>`
        : '<p class="sub" style="margin-top:10px">Nenhuma divergência acima do limiar neste ciclo.</p>'}
    </div>` : ''}

    <div class="cartao" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Cobertura do registro</h2>
        <span class="selo ${d.cobertura.alerta ? 'pend' : 'ok'}">${d.cobertura.valor}%</span></div>
      <p class="sub">${esc(d.cobertura.doutrina)}</p>
      <div class="dado" style="margin-top:10px"><span class="k">Folhas completas</span><b>${d.cobertura.completas} de ${d.cobertura.total}</b></div>
      <div class="dado"><span class="k">Turmas sem registro</span>
        <b style="color:${d.cobertura.turmas_sem_registro ? 'var(--atencao)' : 'var(--ink)'}">${d.cobertura.turmas_sem_registro}</b></div>
      <div class="dado"><span class="k">Olhares registrados</span><b>${d.olhares_registrados}</b></div>
      <div class="dado"><span class="k">Crianças em risco de sair</span><b>${d.evasao.em_risco}</b></div>
      <div class="dado"><span class="k">Áreas de interesse sem atividade</span>
        <b style="color:${d.exposicao.lacunas.length ? 'var(--atencao)' : 'var(--ink)'}">${d.exposicao.lacunas.map(l => esc(l.rotulo)).join(', ') || 'nenhuma'}</b></div>
      ${barra(d.cobertura.valor, !d.cobertura.alerta)}
      <div class="linha" style="margin-top:14px">
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/relatorio?aba=consulta">Perguntar à base</button>
        <button class="btn pequeno fantasma" data-acao="ir" data-href="#/crianca">Buscar criança</button>
        <button class="btn pequeno fantasma" data-acao="ir" data-href="#/pessoas">Pessoas</button>
      </div>
    </div>

    ${d.alertas.length ? `<div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Alertas abertos</h2>
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/hoje?detalhe=alertas">Tratar</button></div>
      <div class="pilha" style="margin-top:10px">
        ${d.alertas.slice(0, 5).map(a => `<div class="item" style="cursor:default">
          <div class="cresce"><div class="nome">${esc(a.nome)}</div><div class="meta">${esc(a.detalhe)}</div></div>
          <span class="selo ${a.status === 'aberto' ? 'alerta' : 'pend'}">${a.status.replace('_', ' ')}</span>
        </div>`).join('')}
      </div></div>` : ''}

    <p class="rodape">Dados de cobertura desde ${dataBR(inv.cobertura.desde)} · ${inv.cobertura.encontros} encontros · ${inv.cobertura.presencas} registros de presença.</p>`;
}

// ======================================================================
// SAFRAS E PERMANENCIA (F6)
// ======================================================================
async function telaSafras() {
  const s = await api('/api/safras');
  app.innerHTML = cabecalhoPainel('safras') + `
    <p class="sub" style="margin-top:12px">% de matrículas que permanecem, por safra de entrada. Permanência é <b>proxy de vínculo</b> — declarado como proxy, não como impacto.</p>
    <div class="cartao" style="margin-top:16px">${graficoSafras(s)}</div>
    <div class="cartao" style="margin-top:14px">
      <h2>Evasão e tempo médio, por programa</h2>
      <div class="rolagem" style="margin-top:10px"><table>
        <thead><tr><th>Programa</th><th>Matrículas</th><th>Encerradas</th><th>Evasão</th><th>Permanência média</th></tr></thead>
        <tbody>${s.porPrograma.map(p => `<tr>
          <td><b>${esc(p.programa)}</b></td><td>${p.total}</td><td>${p.sairam}</td>
          <td>${p.evasao_pct}%</td><td>${String(p.meses_medios).replace('.', ',')} meses</td></tr>`).join('')}
        </tbody></table></div>
    </div>
    <p class="rodape">Responde à pergunta 3 do bloco 7 sem coleta nova: a curva sai da planilha de presença que o Instituto já mantém.</p>`;
}

function graficoSafras(s) {
  const comDados = s.curvas.filter(c => c.pontos.some(p => p.pct != null));
  if (!comDados.length) return '<p class="vazio">Sem base suficiente para curvas de permanência.</p>';
  const W = 320, H = 180, ml = 34, mb = 26, mt = 10, mr = 8;
  const x = (i) => ml + (i / (s.marcos.length - 1)) * (W - ml - mr);
  const y = (p) => mt + (1 - p / 100) * (H - mt - mb);
  // Tokens, nunca hex literal: hex fixo não acompanha o modo escuro e não está
  // na paleta do board (achado FE-02).
  const cores = ['var(--red)', 'var(--ok)', 'var(--atencao)'];
  return `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curvas de permanência por safra de entrada">
      ${[0, 25, 50, 75, 100].map(v => `
        <line x1="${ml}" y1="${y(v)}" x2="${W - mr}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>
        <text x="${ml - 6}" y="${y(v) + 3.5}" font-size="8" fill="var(--muted)" text-anchor="end">${v}%</text>`).join('')}
      ${s.marcos.map((m, i) => `<text x="${x(i)}" y="${H - 8}" font-size="8" fill="var(--muted)" text-anchor="middle">${m}m</text>`).join('')}
      ${comDados.map((c, ci) => {
        const pts = c.pontos.map((p, i) => p.pct == null ? null : `${x(i)},${y(p.pct)}`).filter(Boolean);
        return `<polyline points="${pts.join(' ')}" fill="none" stroke="${cores[ci % 3]}" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          ${c.pontos.map((p, i) => p.pct == null ? '' :
            `<circle cx="${x(i)}" cy="${y(p.pct)}" r="3" fill="${cores[ci % 3]}"/>`).join('')}`;
      }).join('')}
    </svg>
    <div class="legenda">${comDados.map((c, i) =>
      `<span><i style="background:${cores[i % 3]}"></i>Safra ${c.safra} · ${c.n} matrículas</span>`).join('')}</div>`;
}

// ======================================================================
// SINTESE DO CICLO (F7)
// ======================================================================
async function telaSintese() {
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const prog = params.get('programa_id') || '';
  const d = await api(`/api/sintese${prog ? `?programa_id=${prog}` : ''}`);
  const s = d.sintese;

  app.innerHTML = cabecalhoPainel('sintese') + `
    <p class="kicker" style="margin-top:12px">${esc(d.ciclo.nome)} · fecho do ciclo</p>
    <h1>Síntese do ciclo</h1>
    <p class="sub">Redigida em template contido. Os números vêm da consulta ao banco, nunca de geração livre de texto.</p>

    <div class="cartao" style="margin-top:16px">
      <label for="prog" style="font-size:13px;font-weight:600">Recorte</label>
      <select id="prog" data-acao="trocar-programa" style="margin-top:6px">
        <option value="">Todos os programas</option>
        ${d.programas.map(p => `<option value="${p.id}" ${String(p.id) === prog ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
      </select>
      <div class="kpis" style="margin-top:14px">
        <div class="kpi"><b>${d.previa.observadas}</b><span>Crianças observadas</span><small>de ${d.previa.ativas} ativas</small></div>
        <div class="kpi"><b>${d.previa.cobertura_pct}%</b><span>Cobertura</span><small>janela até ${dataBR(d.previa.ciclo_fim)}</small></div>
        <div class="kpi"><b>${d.previa.dimensoes_subiram}/${d.previa.dimensoes_comparadas}</b><span>Dimensões que subiram</span><small>vs. ${esc(d.previa.ciclo_anterior || '—')}</small></div>
        <div class="kpi"><b>${d.previa.presenca_pct ?? '—'}%</b><span>Presença do mês</span><small>${esc(d.previa.presenca_mes)}</small></div>
      </div>
    </div>

    ${s ? `
    <div class="cartao area-impressao" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Texto gerado</h2>
        <span class="selo ${s.status === 'aprovada' ? 'ok' : 'pend'}">${s.status}</span></div>
      ${s.numeros?._origem === 'modelo' ? `<div class="selo alerta" style="margin-top:10px">redigido por modelo local · confira antes de aprovar</div>` : ''}
      <p style="font-size:15.5px;line-height:1.65;margin-top:12px">${esc(s.texto)}</p>
      ${s.numeros?._origem === 'modelo' ? `
        <details class="comparar">
          <summary>ver a versão automática</summary>
          <p>${esc(s.numeros._texto_automatico || '')}</p>
          <p class="sub">Os números são os mesmos — a conferência garante. O que pode ter mudado é a
             QUEM o número está ligado numa frase. Leia as duas antes de aprovar.</p>
        </details>` : ''}
      <div class="linha" style="margin-top:14px">
        <span class="selo ${s.revisor_status === 'aprovado' ? 'ok' : 'alerta'}">revisor de sobre-alegação: ${esc(s.revisor_status)}</span>
        <span class="selo ${s.status === 'aprovada' ? 'ok' : 'pend'}">aprovação humana: ${s.status === 'aprovada' ? 'feita' : 'pendente'}</span>
      </div>
      ${s.revisor_notas ? `<p class="sub" style="margin-top:8px">${esc(s.revisor_notas)}</p>` : ''}
      <div class="linha" style="margin-top:16px">
        <button class="btn secundario" data-acao="gerar-sintese" data-prog="${prog}">Gerar de novo</button>
        ${s.status !== 'aprovada'
          ? `<button class="btn" data-acao="aprovar-sintese" data-prog="${prog}" ${s.revisor_status !== 'aprovado' ? 'disabled' : ''}>Aprovar e liberar</button>`
          : `<button class="btn fantasma" data-acao="imprimir">Imprimir para o relatório</button>
             <span class="sub">Liberada em ${dataBR(s.aprovado_em)}.</span>`}
      </div>
    </div>

    ${d.ciclo.status === 'aberto' ? `
    <div class="cartao compacto" style="margin-top:14px">
      <h2>Fechar o ciclo</h2>
      <p class="sub">Fechar executa a retenção declarada na governança: o ciclo para de aceitar observação nova e
        qualquer anotação de texto legada é apagada do banco. Abre o próximo ciclo em seguida.</p>
      <div class="linha" style="margin-top:12px">
        <button class="btn secundario" data-acao="fechar-ciclo" data-id="${d.ciclo.id}">Fechar ${esc(d.ciclo.nome)} e abrir o próximo</button>
      </div>
    </div>` : ''}

    <p class="rodape">Verbo causal é bloqueado pelo revisor, inclusive a atribuição atenuada
      ("contribuiu para", "graças a"). O que o texto afirma é associação, não efeito medido.<br>
      A linguagem também é artefato metodológico.</p>
    ` : `
    <div class="cartao" style="margin-top:14px">
      <h2>Nenhuma síntese gerada ainda</h2>
      <p class="sub">O texto é montado a partir dos números acima, em template fechado, e passa por um revisor automático antes da sua aprovação.</p>
      <div class="linha" style="margin-top:14px">
        <button class="btn" data-acao="gerar-sintese" data-prog="${prog}">Gerar síntese do ciclo</button>
      </div>
    </div>`}`;
}

// ======================================================================
// CONSENTIMENTOS (F1 · governanca)
// ======================================================================
rota(/^#\/consentimentos/, async () => {
  const [d, ac] = await Promise.all([api('/api/consentimentos'), api('/api/acessos/resumo').catch(() => null)]);
  // O RESUMO DE ACESSO (decisão 38). Volume por recurso e por papel, SEM nome
  // de criança: a coordenação vê o PADRÃO, não o caso a caso. O caso a caso
  // mora na ficha, que é onde a pergunta nasce e onde há motivo para abrir.
  const cartaoAcessos = !ac ? '' : `
    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Quem lê dado individual</h2>
        <span class="selo ${ac.total ? 'ok' : 'pend'}">${ac.total} leitura(s)</span></div>
      <p class="sub">Desde ${dataBR(ac.desde)}. Toda leitura de ficha, olhar ou parecer deixa rastro —
        exigência da LGPD e pré-requisito do campo livre de relato. O log guarda quem, o quê e quando; nunca o conteúdo.</p>
      ${ac.total ? `<div class="pilha" style="margin-top:10px">
        ${ac.por_recurso.map(r => `<div class="dado"><span class="k">${esc(r.recurso)}</span>
          <b>${r.n}<span class="sub"> em ${r.criancas} criança(s)</span></b></div>`).join('')}
        ${ac.por_papel.map(r => `<div class="dado"><span class="k">por ${esc(r.papel)}</span>
          <b>${r.n}<span class="sub"> · ${r.pessoas} pessoa(s)</span></b></div>`).join('')}
      </div>` : '<p class="sub" style="margin-top:8px">Nenhuma leitura individual neste período.</p>'}
    </div>`;
  app.innerHTML = `
    <p class="kicker">LGPD Art. 14 · consentimento específico do responsável</p>
    <h1>Consentimentos</h1>
    <p class="sub">Campo sem consentimento nasce bloqueado — a proteção é regra do sistema, não lembrete de processo.</p>
    ${cartaoAcessos}

    <div class="kpis" style="margin-top:16px;grid-template-columns:1fr 1fr 1fr">
      <div class="kpi"><b>${d.ativos}</b><span>Ativos</span></div>
      <div class="kpi"><b>${d.pendentes}</b><span>Pendentes</span><small>campos bloqueados por padrão</small></div>
      <div class="kpi"><b>${d.com_prova ?? 0}</b><span>Com vídeo</span><small>prova do consentimento</small></div>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>Onde a ficha da criança é aberta</h2>
      <p class="sub">A ficha nasce no cadastro: <b>Pessoas → Quem entra → Nova criança</b>, e quem faz isso
        é a coordenação. Nesse instante a criança já entra pela presença (legítimo interesse) e a rubrica
        socioemocional nasce <b>bloqueada</b> — ela aparece aqui, nesta lista, esperando o responsável.
        É aqui que o bloqueio cai, e é aqui que fica a prova de que ele caiu com autorização.</p>
      <button class="btn pequeno fantasma" data-acao="ir" data-href="#/pessoas?aba=equipe"
        style="margin-top:10px">Abrir a ficha de uma criança nova</button>
    </div>

    <div class="cartao" style="margin-top:14px">
      <h2>Rubrica socioemocional · por criança</h2>
      <div class="pilha" style="margin-top:12px">
        ${d.linhas.filter(l => l.status !== 'ativo').map(l => `
          <div class="item" style="cursor:default">
            <div class="cresce"><div class="nome">${esc(l.nome)}</div>
              <div class="meta">${esc(l.codigo)} · registro socioemocional bloqueado</div></div>
            <button class="btn pequeno" data-acao="consentir" data-id="${l.id}" data-nome="${esc(l.nome)}">Registrar</button>
          </div>`).join('') || '<p class="vazio">Nenhum consentimento pendente.</p>'}
      </div>
      <p class="sub" style="margin-top:14px">${d.ativos} criança(s) com consentimento ativo não aparecem nesta lista.</p>
      ${d.ativos ? `<details style="margin-top:10px">
        <summary style="cursor:pointer;font-size:13px;color:var(--tinta-fraca)">Quem tem a prova em vídeo · ${d.com_prova ?? 0} de ${d.ativos}</summary>
        <p class="sub" style="margin-top:8px">Consentimento sem vídeo continua valendo — só não tem como
          ser mostrado a ninguém depois. Para gravar de quem ainda não tem, registre de novo o consentimento.</p>
        <div class="pilha" style="margin-top:8px">
          ${d.linhas.filter(l => l.status === 'ativo').map(l => `<div class="item" style="cursor:default">
            <div class="cresce"><div class="nome">${esc(l.nome)}</div>
              <div class="meta">${esc(l.responsavel || 'responsável não anotado')}${l.data_registro ? ` · ${dataBR(l.data_registro)}` : ''}</div></div>
            ${l.tem_prova
              ? '<span class="selo ok">vídeo</span>'
              : `<button class="btn pequeno fantasma" data-acao="consentir" data-id="${l.id}" data-nome="${esc(l.nome)}">Gravar</button>`}
          </div>`).join('')}
        </div>
      </details>` : ''}
    </div>
`;
});

// ======================================================================
// O MOMENTO — quando a turma fecha o ciclo
// ======================================================================
async function celebrar(agenda) {
  const d = await api('/api/hoje');
  const p = await api(`/api/turma/painel?turma_id=${d.turma.id}`);
  const agg = p.agregado;
  const subiram = agg.series.filter(s => s.valores.length > 1 && s.valores.at(-1) > s.valores.at(-2));
  const menor = agg.series.filter(s => s.valores.at(-1) != null)
    .sort((a, b) => a.valores.at(-1) - b.valores.at(-1))[0];
  const minutos = agenda.observaveis * 3;

  const el = document.createElement('div');
  el.className = 'festa';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Ciclo concluído na sua turma');
  el.innerHTML = `
    <div class="festa-caixa">
      <span class="selo-topo entra" style="animation-delay:.05s">${esc(agenda.ciclo.nome)} · turma completa</span>
      <div class="contagem entra" style="animation-delay:.15s"><b id="festa-n" style="font-weight:inherit">${REDUZ.matches ? agenda.concluidas : 0}</b> de ${agenda.observaveis}</div>
      <h1 class="entra" style="animation-delay:.25s">Você acabou de fechar o ciclo da sua turma</h1>
      <p class="sub entra" style="animation-delay:.3s">Aquilo que você via toda semana e não conseguia mostrar agora tem forma, número e comparação.</p>

      <div class="conta entra" style="animation-delay:.4s">
        <div><b>~${minutos} min</b><span>foi o que isso te custou no ciclo inteiro</span></div>
        <div><b>${agg.series.length} dimensões</b><span>comparáveis entre ciclos, por turma</span></div>
      </div>

      <div class="cartao entra" style="animation-delay:.5s;text-align:left">
        ${barrasDimensoes(agg)}
      </div>

      <div class="frase entra" style="animation-delay:.62s">
        “${subiram.length
            ? `Entre o primeiro e o segundo ciclo de observação, as médias da turma subiram em ${subiram.length} de ${agg.series.length} dimensões socioemocionais.`
            : `A turma tem agora duas medidas comparáveis de evolução socioemocional.`}
        ${menor ? `“${esc(menor.dimensao)}” segue como a menor média e orienta o plano do próximo período.` : ''}
        As médias acima descrevem o que a equipe observou no período, não efeito medido do programa.
        A leitura é de associação: fatores externos não foram isolados.”
        <div class="sub" style="font-style:normal;margin-top:12px;font-family:var(--sans);font-size:12.5px">
          É esta frase — e não o número de presenças — que o Instituto não conseguia dizer a quem financia.
        </div>
      </div>

      <div class="linha entra" style="animation-delay:.72s;justify-content:center">
        <button class="btn" data-acao="fechar-festa" data-href="#/turma">Ver o painel da turma</button>
        <button class="btn secundario" data-acao="fechar-festa" data-href="#/hoje">Voltar ao início</button>
      </div>
      <p class="rodape">Nenhum dado individual sai daqui. Para fora da organização, só o agregado.</p>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('button')?.focus();
  efeitosFesta(el, agenda.concluidas);
}

// As tres camadas cinematograficas da festa: confete de papel nas cores do
// sistema, contagem que sobe de 0 a N e o traço do proprio "percurso" se
// desenhando atras do conteudo. Reduced-motion: nada disto e' injetado — a
// tela e' a estatica de sempre.
function efeitosFesta(el, concluidas) {
  if (REDUZ.matches) return;
  const cancelamentos = [];
  el._parar = cancelamentos;

  // --- traço do percurso (fundo, opacidade de marca-d'agua) ---------------
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'festa-traco');
  svg.setAttribute('viewBox', '0 0 400 800');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<path d="M -20 780 C 120 700, 40 560, 180 470 S 260 300, 200 210 S 380 90, 430 40"/>
                   <circle cx="398" cy="64" r="4"/>`;
  el.prepend(svg);
  const caminho = svg.querySelector('path');
  const L = caminho.getTotalLength();
  caminho.style.strokeDasharray = L;
  caminho.style.strokeDashoffset = L;
  caminho.getBoundingClientRect(); // reflow obrigatorio antes do segundo write
  const tTraco = setTimeout(() => { caminho.style.strokeDashoffset = '0'; }, 200);
  const tPonto = setTimeout(() => { svg.querySelector('circle').style.opacity = '.9'; }, 1600);
  cancelamentos.push(() => { clearTimeout(tTraco); clearTimeout(tPonto); });

  // --- contagem 0 -> N ----------------------------------------------------
  const alvo = el.querySelector('#festa-n');
  if (alvo && concluidas > 0) {
    let rafContagem = null;
    const t0 = performance.now() + 150;
    const aurora = (agora) => {
      if (!alvo.isConnected) return;
      const p = Math.min(1, Math.max(0, (agora - t0) / 900));
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      alvo.textContent = Math.round(e * concluidas);
      if (p < 1) rafContagem = requestAnimationFrame(aurora);
      else alvo.textContent = concluidas;
    };
    rafContagem = requestAnimationFrame(aurora);
    cancelamentos.push(() => cancelAnimationFrame(rafContagem));
  }

  // --- confete de papel (frente, pointer-events none, vida de 2.2s) -------
  const tConfete = setTimeout(() => {
    try { navigator.vibrate?.([18, 60, 24]); } catch {}
    if (!el.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'festa-confete';
    el.appendChild(canvas);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    const g = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const cor = (v) => css.getPropertyValue(v).trim();
    // tiras de papel nas tintas do sistema — o modo escuro sai certo de graça
    const paleta = [cor('--red'), cor('--red'), cor('--red'), cor('--ok'), cor('--ok'),
                    cor('--atencao-linha'), cor('--atencao-linha'), cor('--line'), cor('--line'), cor('--card-2')];
    const N = Math.min(90, Math.max(55, Math.round(innerWidth / 6)));
    const p = new Array(N);
    for (let i = 0; i < N; i++) {
      p[i] = {
        x: Math.random() * innerWidth, y: -20 - Math.random() * 120,
        vx: (Math.random() - .5) * 60, vy: 90 + Math.random() * 70,
        w: 5 + Math.random() * 4, h: 8 + Math.random() * 6,
        a: Math.random() * Math.PI * 2, va: (Math.random() - .5) * 6,
        tf: 2 + Math.random() * 3, fase: Math.random() * Math.PI * 2,
        cor: paleta[i % paleta.length],
      };
    }
    let raf = null, antes = null;
    const inicio = performance.now();
    const desenhar = (agora) => {
      const vida = (agora - inicio) / 1000;
      if (vida > 2.2 || !canvas.isConnected) { canvas.remove(); return; }
      const dt = Math.min(32, agora - (antes ?? agora)) / 1000;
      antes = agora;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, innerWidth, innerHeight);
      g.globalAlpha = vida < 1.5 ? 1 : Math.max(0, 1 - (vida - 1.5) / .6);
      for (const q of p) {
        q.vy = Math.min(220, q.vy + 260 * dt);
        q.x += (q.vx + Math.sin(vida * q.tf + q.fase) * 22) * dt;
        q.y += q.vy * dt;
        q.a += q.va * dt;
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.a);
        g.scale(Math.sin(vida * q.tf + q.fase), 1); // tombo 3D do papel
        g.fillStyle = q.cor;
        g.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
        g.restore();
      }
      raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);
    cancelamentos.push(() => { cancelAnimationFrame(raf); canvas.remove(); });
  }, 350);
  cancelamentos.push(() => clearTimeout(tConfete));
}

// Fecho centralizado: cancela rAF/timeouts pendentes antes de remover — sem
// isto, fechar a festa cedo deixaria animacao orfa rodando em elemento morto.
function pararFesta() {
  const f = document.querySelector('.festa');
  if (!f) return false;
  (f._parar || []).forEach(fn => { try { fn(); } catch {} });
  f.remove();
  return true;
}

// ======================================================================
// FOLHA DO DIA (F2) — o registro E' DA TURMA.
// ======================================================================
function pills(lista, selecionados, grupo, unico) {
  return lista.map(x => `
    <button class="p ${selecionados.includes(x.codigo) ? 'on' : 'off'}" type="button"
            data-acao="pill" data-grupo="${grupo}" data-codigo="${x.codigo}" data-unico="${unico ? 1 : 0}"
            aria-pressed="${selecionados.includes(x.codigo)}">${esc(x.rotulo)}</button>`).join('');
}

// ----------------------------------------------------------------------
// CHECK-IN: ENTRADA DIRETA (F3) — era um stepper, e "seis" custava SETE toques.
// Os cinco check-ins somavam 20 a 35 toques por encontro, no celular, em pé,
// dentro da sala.
//
// O "primeiro + dá 0" NÃO era bug: era deliberado, e sustentava três estados —
// `—` (não observei), `0` (observei e foi zero) e `N`. A entrada direta PRESERVA
// os três; o que ela tira é o custo de chegar até o número.
//
// Acima de 10 o passo a passo volta, porque um encontro com mais de dez
// conflitos é raro o bastante para não valer trinta botões na tela.
// ----------------------------------------------------------------------
const CHECKIN_ATALHOS = 10;

const stepper = (campo, valor, rotulo) => `
      <div style="margin-top:12px">
        <div class="linha"><span class="k cresce">${esc(rotulo)}</span>
          <b id="ck-${campo}" style="font-size:15px">${valor == null ? '—' : valor}</b></div>
        <div role="group" aria-label="${esc(rotulo)}" style="margin-top:6px">
          <button type="button" class="p ${valor == null ? 'on' : 'off'}" data-acao="checkin-valor"
            data-campo="${campo}" data-v="" aria-pressed="${valor == null}"
            aria-label="Não observei">—</button>
          ${Array.from({ length: CHECKIN_ATALHOS + 1 }, (_, n) => `
          <button type="button" class="p ${valor === n ? 'on' : 'off'}" data-acao="checkin-valor"
            data-campo="${campo}" data-v="${n}" aria-pressed="${valor === n}">${n}</button>`).join('')}
          <button type="button" class="p ${valor != null && valor > CHECKIN_ATALHOS ? 'on' : 'off'}"
            data-acao="checkin" data-campo="${campo}" data-d="1"
            aria-label="Mais um">${valor != null && valor > CHECKIN_ATALHOS ? valor : '+'}</button>
        </div>
      </div>`;

/** Repinta SÓ os blocos da folha. Existe porque `navegar()` recarrega a folha
 *  do servidor — e o que a pessoa ainda não guardou (o preenchimento de "Igual
 *  ao encontro de <data>", por exemplo) morreria no caminho. */
function repintarBlocosDaFolha() {
  const el = document.getElementById('blocos-folha');
  if (el) el.innerHTML = blocosDaFolha();
  const btn = document.getElementById('igual-anterior');
  if (btn && !ctx.folha?.anterior) btn.remove();
}

/**
 * O SELO POR CAMPO (protótipo v3). Na conferência, cada campo diz se veio DA
 * SUA FALA ou ficou EM BRANCO — era um parágrafo-resumo no alto da tela, e o
 * desenho põe a marca onde a pessoa olha: no campo.
 *
 * Só aparece na conferência: na folha à mão não há fala, e um selo "em branco"
 * em tudo seria ruído. Compara com o valor neutro, sem campo novo no servidor.
 */
const NEUTRO_DO_CAMPO = { atividade: 'nao_identificada', area_tematica: 'nenhuma', procedimento: 'nao_identificado', objetivo: 'nenhum' };

function seloDaFala(campo) {
  const f = ctx.folha;
  if (!f?.sugestao) return '';                       // só na conferência
  const v = f.campos[campo];
  const veio = campo === 'marcadores_turma' ? (v ?? []).length > 0
             : campo === 'checkin' ? Object.values(f.campos.checkin ?? {}).some(x => x != null)
             : v != null && v !== NEUTRO_DO_CAMPO[campo];
  return `<span class="selo ${veio ? 'ok' : 'pend'}" style="margin-left:8px">${veio ? 'da sua fala' : 'em branco'}</span>`;
}

function blocosDaFolha() {
  const f = ctx.folha, c = f.catalogos;
  // Decisão 31: na Vivência a folha é o registro do procedimento — o que a
  // profissional fez e com que objetivo, em lista fechada. É o que vai para o
  // relato no padrão do conselho.
  const blocoVivencia = !f.vivencia ? '' : `
    <div class="cartao">
      <div class="lbl" id="lbl-procedimento">Procedimento realizado${seloDaFala('procedimento')}</div>
      <div role="group" aria-labelledby="lbl-procedimento">${pills(c.procedimentos, [f.campos.procedimento], 'procedimento', true)}</div>
      <p class="sub" style="margin-top:4px">O que você fez com o grupo — é o que entra no relato.</p>
    </div>
    <div class="cartao">
      <div class="lbl" id="lbl-objetivo">Objetivo${seloDaFala('objetivo')}</div>
      <div role="group" aria-labelledby="lbl-objetivo">${pills(c.objetivos.filter(o => o.codigo !== 'nenhum'), [f.campos.objetivo], 'objetivo', true)}</div>
    </div>`;
  // O check-in de grupo que a psicóloga validou ao vivo (campo, 29/08/2026):
  // contagens da turma, nunca quem. "—" é não informado, que é diferente de zero.
  const ck = f.campos.checkin;
  const blocoCheckin = `
    <div class="cartao">
      <div class="lbl">Quantas, no grupo${seloDaFala('checkin')}</div>
      <p class="sub" style="margin-bottom:4px">Toque no número. "—" é não observei — diferente de zero.</p>
      ${c.checkin.map(k => stepper(k.campo, ck[k.campo], k.rotulo)).join('')}
      <p class="sub" style="margin-top:6px">Contagens da turma, nunca de uma criança.${f.vivencia ? ' Na vivência, é o que devolve algo a cada encontro.' : ''}</p>
    </div>`;
  return blocoVivencia + `
    <div class="cartao">
      <div class="lbl" id="lbl-atividade">O que a turma fez${seloDaFala('atividade')}</div>
      <div role="group" aria-labelledby="lbl-atividade">${pills(c.atividades, [f.campos.atividade], 'atividade', true)}</div>
    </div>
    <div class="cartao">
      <div class="lbl" id="lbl-area">Área do encontro${seloDaFala('area_tematica')}</div>
      <div role="group" aria-labelledby="lbl-area">${pills(c.areas, [f.campos.area_tematica], 'area_tematica', true)}</div>
    </div>
    <div class="cartao">
      <div class="lbl" id="lbl-marcadores">Como o grupo esteve${seloDaFala('marcadores_turma')}</div>
      <div role="group" aria-labelledby="lbl-marcadores">${pills(c.marcadores, f.campos.marcadores_turma, 'marcadores_turma', false)}</div>
      <p class="sub" style="margin-top:4px">Até ${c.max_marcadores} marcadores. Descrevem o grupo, nunca uma criança.</p>
    </div>
    <div class="cartao">
      <div class="dado">
        <span class="k">Pediram ajuda</span>
        <b id="ajuda" style="font-size:15px">${f.campos.pediram_ajuda}</b>
      </div>
      <div role="group" aria-label="Quantas pediram ajuda" style="margin:-4px 0 4px">
        ${Array.from({ length: CHECKIN_ATALHOS + 1 }, (_, n) => `
        <button type="button" class="p ${f.campos.pediram_ajuda === n ? 'on' : 'off'}"
          data-acao="ajuda-valor" data-v="${n}" aria-pressed="${f.campos.pediram_ajuda === n}">${n}</button>`).join('')}
        <button type="button" class="p ${f.campos.pediram_ajuda > CHECKIN_ATALHOS ? 'on' : 'off'}"
          data-acao="ajuda" data-d="1" aria-label="Mais um">${f.campos.pediram_ajuda > CHECKIN_ATALHOS ? f.campos.pediram_ajuda : '+'}</button>
      </div>
      <div class="dado">
        <span class="k">Faltaram</span>
        <span>${f.faltas.length
          ? f.faltas.map(n => `<span class="p redsoft" style="margin:0 4px 0 0">${esc(n)}</span>`).join('')
          : '<span class="sub">ninguém</span>'}</span>
      </div>
    </div>` + blocoCheckin;
}

async function carregarFolha(turmaId, data) {
  const d = await api(`/api/folha?turma_id=${turmaId}&data=${data || ''}`);
  ctx.folha = {
    turma: d.turma, data: d.data, catalogos: d.catalogos,
    encontro: d.encontro, existente: d.folha,
    faltas: d.chamada.criancas.filter(c => c.status === 'F').map(c => c.nome),
    roster: d.chamada.criancas.map(c => c.nome),
    // Editar a mao uma folha que veio da voz e' edicao MANUAL: manter 'voz' aqui
    // sujaria a taxa de correcao do agente com correcao que nao foi dele.
    origem: 'manual',
    sugestao: null, excluido: !!d.folha?.conteudo_excluido, trechos: [], baixaConfianca: false,
    vivencia: !!d.vivencia, devolucao: d.devolucao ?? null, anterior: d.anterior ?? null,
    relatoGrupo: d.folha?.relato_grupo ?? '',
    campos: {
      atividade: d.folha?.atividade ?? 'nao_identificada',
      area_tematica: d.folha?.area_tematica ?? 'nenhuma',
      marcadores_turma: d.folha?.marcadores ?? [],
      pediram_ajuda: d.folha?.pediram_ajuda ?? 0,
      conteudo_excluido: !!d.folha?.conteudo_excluido,
      procedimento: d.folha?.procedimento ?? (d.vivencia ? 'nao_identificado' : null),
      objetivo: d.folha?.objetivo ?? (d.vivencia ? 'nenhum' : null),
      checkin: Object.fromEntries(d.catalogos.checkin.map(k => [k.campo, d.folha?.checkin?.[k.campo] ?? null])),
    },
  };
  return d;
}

// ----------------------------------------------------------------------
// "IGUAL AO ENCONTRO DE <data>" (F3) — a maior redução de toques disponível,
// e promessa literal da visita (Grav. 84): *"ele já sabe o que você faz… é
// igual a sala do passado"*.
//
// Hoje toda folha nasce NEUTRA — procedimento `nao_identificado`, objetivo
// `nenhum`, marcadores vazios — mesmo com doze encontros iguais da mesma turma
// atrás. Isto preenche o DESENHO da atividade com um toque; as contagens do dia
// não vêm junto, porque repeti-las seria inventar observação.
//
// Não usa modelo e não grava nada: o gate de confirmação humana é o mesmo.
// ----------------------------------------------------------------------
function botaoIgualAoAnterior() {
  const f = ctx.folha;
  if (!f?.anterior || f.existente) return '';
  return `
    <div id="igual-anterior">
      <button class="btn largo secundario" data-acao="igual-ao-anterior">
        Igual ao encontro de ${dataBR(f.anterior.data)}
      </button>
      <p class="sub" style="margin:6px 0 0">Preenche a atividade e o objetivo daquele dia. As contagens de hoje continuam com você.</p>
    </div>`;
}

// ======================================================================
// REGISTRAR (F2) — contar por voz, preencher à mão e confirmar eram TRÊS
// telas. São três estados de UMA tarefa: `#/confirmar` já renderizava
// `blocosDaFolha()` idêntico ao da folha, e a voz empilhava cinco blocos antes
// do botão "Terminei". Agora é um lugar só, e o passo mora na URL.
//
// O PADRÃO é a voz — foi o que o campo pediu que fosse mais fácil. Escrever
// continua a um toque, e nunca deixa de estar visível.
// ======================================================================
rota(/^#\/registrar/, async () => {
  const passo = (location.hash.match(/[?&]passo=([a-z]+)/) || [])[1] || 'voz';
  if (passo === 'mao') return telaFolhaAMao();
  if (passo === 'confirmar') return telaConfirmar();
  return telaContarComoFoi();
});

/**
 * CAMPO LIVRE SOBRE O GRUPO (decisão 40). O pedido literal da visita
 * (Grav. 84, 12:00): *"existem coisas muito específicas que acontecem dentro do
 * grupo que aqui eu não conseguiria relatar e lá eu conseguiria."*
 *
 * Duas travas, ditas ANTES de escrever, não depois de recusar: nome de criança
 * não entra (é registro de turma, e fica cinco anos), e conteúdo de atendimento
 * continua indo para a coordenação.
 */
function blocoRelatoGrupo() {
  const f = ctx.folha;
  if (!f?.existente) return '';   // sem folha ainda não há onde guardar
  return `
    <div class="cartao">
      <div class="lbl">O que mais aconteceu no grupo</div>
      <p class="sub">Opcional, e livre. Aqui cabe o que os campos fechados não pegam.
        <b>Sem nome de criança</b> — use as iniciais, ou a ficha dela. Conteúdo de
        atendimento continua sendo conversa com a coordenação.</p>
      <textarea id="relato-grupo" rows="4" style="margin-top:8px"
        placeholder="Ex.: a roda travou no começo e destravou quando mudei a ordem da fala.">${esc(f.relatoGrupo ?? '')}</textarea>
      <p class="sub" id="relato-grupo-erro" role="alert" style="min-height:18px"></p>
      <button class="btn pequeno secundario" data-acao="salvar-relato-grupo">Guardar este relato</button>
    </div>`;
}

async function telaFolhaAMao() {
  const h = await api('/api/hoje');
  if (!h.turma) { app.innerHTML = `<div class="cartao"><h2>Sem turma atribuída</h2></div>`; return; }
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const d = await carregarFolha(h.turma.id, params.get('data') || h.data_folha);
  if (!d.encontro) {
    app.innerHTML = `
      <p class="kicker">Folha do dia</p><h1>Antes, a chamada</h1>
      <p class="sub">A folha é do encontro. Registre a chamada de ${dataBR(d.data)} e a folha abre em seguida.</p>
      <div class="linha" style="margin-top:16px"><button class="btn" data-acao="ir" data-href="#/chamada?data=${d.data}">Fazer a chamada</button></div>`;
    return;
  }
  const fechada = d.folha?.status === 'fechada';
  app.innerHTML = `
    <p class="kicker">${esc(d.turma.programa)}</p>
    <h1>${d.vivencia ? 'Registro da vivência' : 'Folha do dia'}</h1>
    <p class="sub">${esc(d.turma.nome)} · ${esc(porExtenso(d.data))}</p>
    <div class="pilha">
      ${botaoIgualAoAnterior()}
      <div id="blocos-folha">${blocosDaFolha()}</div>
      ${blocoRelatoGrupo()}
      <div class="aviso neutro">O que cada criança fez não entra aqui. ${d.vivencia ? 'Este é o registro do procedimento — não individualizado, sem nome, como o conselho pede.' : 'Esta folha é da turma.'}</div>
      ${d.folha ? `<button class="btn largo secundario" data-acao="ir" data-href="#/sai-daqui?aba=relato&data=${d.data}">${d.vivencia ? 'Ver o relato do procedimento' : 'Ver o registro do encontro'}</button>` : ''}
      ${fechada ? `
        <div class="aviso"><h3>Folha fechada</h3>
          <p>Esta folha foi fechada em ${dataBR(d.folha.confirmado_em)} e não aceita mais alteração.
             Se ficou errada, a coordenação reabre.</p>
          ${sessao.papel === 'coordenacao'
            ? `<div class="linha"><button class="btn pequeno" data-acao="reabrir-folha">Reabrir a folha</button></div>` : ''}
        </div>`
        : `
        <button class="btn largo" data-acao="ir" data-href="#/registrar">Contar como foi</button>
        <button class="btn largo secundario" data-acao="salvar-folha" data-fechar="1">Fechar a folha</button>`}
      <button class="btn largo fantasma" data-acao="imprimir">Imprimir a folha</button>
    </div>
    <p class="rodape">Registro da turma. Base legal: legítimo interesse — execução do programa.</p>`;
  if (fechada) document.querySelectorAll('[data-acao="pill"],[data-acao="ajuda"]')
    .forEach(b => { b.disabled = true; b.style.opacity = '.55'; });
}

// ======================================================================
// REGISTRAR POR VOZ (F3) — 40 s, áudio descartado na transcrição.
// ======================================================================
// ONDE A TRANSCRICAO ACONTECE — e por que isto precisa de uma funcao.
//
// A tela prometia "o audio nao sai deste aparelho". Isso e' verdade so' quando o
// navegador tem reconhecimento NO APARELHO. Com `processLocally` no padrao
// (false), a especificacao permite que o agente processe REMOTAMENTE — e o
// Chrome faz exatamente isso: manda o audio para o servico do fornecedor. A
// promessa era falsa no caminho mais comum, e o cartao de campo ja' sabia disso
// ("em parte dos navegadores a transcricao nao e' local") sem que a arquitetura
// tivesse sido corrigida.
//
// Devolve: 'aparelho' | 'servico' | 'nenhum'. A tela diz o que for verdade.
async function ondeTranscreve() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return 'nenhum';
  try {
    if (typeof Rec.availableOnDevice === 'function') {
      const r = await Rec.availableOnDevice({ langs: ['pt-BR'] });
      const v = Array.isArray(r) ? r[0] : r;
      if (v === 'available' || v === true) return 'aparelho';
    }
  } catch { /* navegador sem a API de disponibilidade: cai no caminho honesto */ }
  return 'servico';
}

const temReconhecimento = () =>
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

async function telaContarComoFoi() {
  const h = await api('/api/hoje');
  if (!h.turma) { app.innerHTML = `<div class="cartao"><h2>Sem turma atribuída</h2></div>`; return; }
  const d = await carregarFolha(h.turma.id, h.data_folha);
  if (!d.encontro) { location.hash = '#/registrar?passo=mao'; navegar(); return; }

  const nativo = !!temReconhecimento();
  const onde = await ondeTranscreve();
  // As portas longas dependem de o transcritor existir NESTA maquina. A rota
  // devolve isso; se ela falhar, a tela segue com o que sempre teve.
  const estadoAudio = await api('/api/audio/status').catch(() => null);
  ctx.voz = { transcricao: '', gravando: false, decorridos: 0, rec: null, timer: null, onde, longa: null, estadoAudio };
  // `?porta=A|B|C` abre a porta longa direto — é o que o cartão do Hoje usa
  // para "Importar áudio" levar ao lugar em vez de largar a pessoa na tela.
  const portaPedida = (location.hash.match(/[?&]porta=([ABC])/) || [])[1];

  app.innerHTML = `
    <p class="kicker">Folha do dia · turma</p>
    <h1>Contar como foi</h1>
    <p class="sub">${esc(d.turma.nome)} · ${esc(porExtenso(d.data))}</p>

    <div class="cartao voz" style="margin-top:16px">
      <div class="lbl" id="voz-estado" role="status" aria-live="polite" style="margin:0">${nativo ? 'Pronto' : 'Ditado do teclado'}</div>
      <button class="mic" id="mic" data-acao="voz-toggle" aria-pressed="false"
              aria-label="Começar a gravar" ${nativo ? '' : 'disabled'}><i aria-hidden="true"></i></button>
      <div class="onda" id="onda" aria-hidden="true">${Array.from({ length: 15 }, () => '<i style="height:5px"></i>').join('')}</div>
      <div class="contagem-voz" id="contagem" role="status" aria-live="polite">0:00</div>
    </div>

    <div class="cartao compacto" style="margin-top:10px">
      <p class="sub">Fale enquanto arruma a sala, sem pressa — cerca de ${d.catalogos.voz_sugestao_segundos} segundos costumam bastar, e não há limite. Diga como foi a turma, o que fizeram${d.vivencia ? ', o procedimento e as contagens do grupo (quantas ajudaram sem pedir, quantas participaram do começo ao fim, conflitos)' : ' e quem faltou'}.</p>
    </div>
    <div class="aviso ${onde === 'aparelho' ? 'calmo' : ''}" style="margin-top:10px">
      <h3>O que este botão grava — e o que não grava</h3>
      <p><b>Sua voz sobre a turma.</b> Nenhuma criança é gravada.
        ${onde === 'aparelho'
          ? 'A transcrição acontece <b>neste aparelho</b>: o áudio não sai daqui e é descartado assim que vira texto.'
          : 'A transcrição é feita pelo <b>serviço do seu navegador</b> — o áudio sai do aparelho para virar texto, e o Percurso nunca o recebe nem o guarda.'}
        Se você falar um nome, ele vira código antes de qualquer gravação — e você vê isso na tela seguinte.</p>
      ${onde === 'aparelho' ? '' : `<p style="margin-top:8px"><b>Fale as iniciais</b>, como você já faz no relatório —
        “o D. F. ajudou” em vez do nome inteiro. É a proteção que não depende de navegador nenhum.</p>`}
    </div>

    <div class="cartao" style="margin-top:10px">
      <div class="lbl">${nativo ? 'Ou escreva o que você contaria' : 'Este navegador não transcreve voz — escreva aqui'}</div>
      <p class="sub" style="margin-bottom:10px">${nativo
        ? 'Se o microfone não pegar, ou se você preferir, digite aqui — ou use o microfone do teclado do celular para ditar neste campo.'
        : 'Digite aqui, ou use o microfone do teclado do celular para ditar neste campo.'}
        O resto é idêntico: o Percurso extrai os campos e você confirma.</p>
      <textarea id="ditado" placeholder="Ex.: hoje a gente fez uma roda de conversa sobre saúde, a turma participou bastante e três pediram ajuda."></textarea>
    </div>

    ${blocoPortas(estadoAudio)}

    <div class="pilha">
      <button class="btn largo" data-acao="voz-terminei" id="btn-terminei">Terminei</button>
      <button class="btn largo secundario" data-acao="ir" data-href="#/registrar?passo=mao">Preferir escrever</button>
    </div>
    <p class="rodape">O áudio é apagado assim que vira texto, aqui e no computador do Instituto.<br>
      ${onde === 'aparelho'
        ? 'A transcrição do microfone acima acontece neste aparelho.'
        : 'A transcrição do microfone acima é feita pelo serviço do seu navegador.'}
      O Percurso nunca guarda áudio.</p>`;

  // Áudio que chegou COMPARTILHADO de outro aplicativo (share target). O
  // service worker guardou o arquivo e mandou a página para cá; aqui ele entra
  // pela mesma porta C, sem passo novo — o Percurso vira mais um destino do
  // botão "compartilhar" do WhatsApp, do gravador ou do Arquivos.
  if (/[?&]compartilhado=1/.test(location.hash)) {
    if (portasDisponiveis(estadoAudio)) { abrirPorta('C'); await receberCompartilhado(); }
    else toast('Chegou um áudio compartilhado, mas o transcritor não está instalado nesta máquina.', 'ruim');
    return;
  }
  if (portaPedida && portasDisponiveis(estadoAudio)) abrirPorta(portaPedida);
  else if (portaPedida) {
    // A porta foi pedida e não existe nesta máquina. Dizer isso é melhor que
    // abrir a tela e deixar a pessoa procurando um botão que não está lá.
    toast('Trazer um áudio pronto depende do transcritor, que não está instalado nesta máquina. Dá para falar agora ou escrever.', 'ruim');
  }
}

// ======================================================================
// AS TRES PORTAS LONGAS — A' (narrar sem pressa), B (deixar gravando a sala)
// e C (trazer um audio que ela ja' tem).
//
// CAPTURAR NAO E' REGISTRAR. A captura ao vivo acima e' curta e transcrita pelo
// navegador. Estas tres sao longas e a transcricao acontece no COMPUTADOR DO
// INSTITUTO (whisper), o que significa que o audio SAI DO APARELHO — e a tela
// diz isso, no instante do toque, em vez de repetir a promessa que a F0 desfez.
//
// AS TRES PORTAS TERMINAM NO MESMO LUGAR: o texto cai no campo de escrever, e
// "Terminei" segue sendo o unico botao de saida. Porta nova nao pode virar
// fluxo novo — seria mais tela, exatamente o contrario do que o campo pediu.
//
// A ROTA DE TRANSCRICAO NAO USA A FILA OFFLINE, de proposito: a fila reenvia
// sozinha quando a rede volta, e reenviar dezenas de MB de audio sem a pessoa
// mandar seria pior que perguntar. Quando a rede cai no meio, o pedaco fica
// GUARDADO NESTE APARELHO e a tela diz isso, com um botao de tentar de novo.
// ======================================================================
const CHAVE_SALA = 'percurso_sala_ligada';
const salaLigada = () => { try { return localStorage.getItem(CHAVE_SALA) === '1'; } catch { return false; } };

const PORTAS = {
  A: {
    titulo: 'Narrar sem pressa',
    sub: 'Você conta o encontro inteiro, do jeito que sair. Sem contagem regressiva.',
    quem: 'Só a sua voz. Nenhuma criança é gravada.',
    acao: 'Começar a narrar',
  },
  B: {
    titulo: 'Deixar gravando o encontro',
    sub: 'Aperta no começo, larga o celular na mesa e não faz mais nada.',
    quem: 'A sala inteira, <b>inclusive as crianças</b>. É a única porta em que isso acontece — por isso ela vem desligada.',
    acao: 'Começar a gravar a sala',
  },
  C: {
    titulo: 'Trazer um áudio que eu já tenho',
    sub: 'O que você gravou no celular ou mandou no WhatsApp. De hoje ou de três semanas atrás.',
    quem: 'O que estiver no arquivo. O original continua no seu celular — o Percurso não guarda cópia.',
    acao: 'Escolher o arquivo',
  },
};

/** As portas longas so' aparecem quando ha' de fato como transcrever. Oferecer
 *  uma porta que devolve 503 seria pior que nao ter porta. */
const portasDisponiveis = (st) => !!(st?.habilitada && st?.modelo_presente);

function blocoPortas(st) {
  if (!portasDisponiveis(st)) return '';
  const podeMic = podeGravar();
  const botao = (k) => {
    if ((k === 'A' || k === 'B') && !podeMic) return '';
    const desligada = k === 'B' && !salaLigada();
    return `<button class="btn largo secundario" data-acao="porta" data-porta="${k}">${esc(PORTAS[k].titulo)}${desligada ? ' <span class="selo pend">desligada</span>' : ''}</button>`;
  };
  return `
    <div class="cartao" style="margin-top:10px" id="portas">
      <div class="lbl">Se falar aqui não der</div>
      <p class="sub" style="margin-bottom:10px">Estas três também terminam no mesmo registro — o texto cai no campo acima e você confere antes de guardar.</p>
      <div class="pilha" id="portas-botoes">${botao('A')}${botao('C')}${botao('B')}</div>
      <div id="porta-painel"></div>
      <!-- SEM filtro estreito, e e' proposital (pedido do campo, 04/09/2026:
           "audio pode ser importado de qualquer lugar do celular"). Um accept so'
           de audio parece inofensivo e nao e': no iPhone ele fecha o navegador de
           Arquivos em cima do que o sistema classifica como audio, e um audio de
           WhatsApp (.opus), um do Drive ou um exportado como video some da lista.
           Quem decide se o arquivo serve e' o decodificador, no passo seguinte,
           com mensagem de erro — nao um filtro que faz o arquivo nao existir. -->
      <input type="file" id="arq-audio" data-acao="arquivo-audio"
        accept="audio/*,video/*,.m4a,.mp3,.wav,.ogg,.opus,.aac,.amr,.3gp,.caf,.flac,.mp4,.mov,.webm" hidden>
    </div>`;
}

/** O painel que abre NO TOQUE. As tres garantias moram aqui, e nao no rodape:
 *  garantia que a pessoa le' depois de decidir nao e' garantia. */
function painelDaPorta(k) {
  const P = PORTAS[k];
  const precisaLigar = k === 'B' && !salaLigada();
  return `
    <div class="aviso" style="margin-top:12px">
      <h3>${esc(P.titulo)}</h3>
      <p class="sub">${esc(P.sub)}</p>
      <p style="margin-top:8px"><b>Quem é gravado:</b> ${P.quem}</p>
      <p class="linha">1. O áudio vai <b>só para o computador do Instituto</b>, pela rede daqui. Não sobe para a internet.</p>
      <p>2. É <b>apagado assim que vira texto</b> — sempre, inclusive quando a transcrição falha no meio.</p>
      <p>3. Nome falado <b>vira código</b> antes de qualquer gravação, e nada é guardado sem o seu ok.</p>
      <div class="pilha" style="margin-top:12px">
        ${precisaLigar
          ? `<button class="btn largo" data-acao="porta-ligar-sala">Entendi — ligar a gravação da sala neste aparelho</button>`
          : `<button class="btn largo" data-acao="${k === 'C' ? 'porta-arquivo' : 'porta-gravar'}" data-porta="${k}">${esc(P.acao)}</button>`}
        <button class="btn largo secundario" data-acao="porta-fechar">Agora não</button>
      </div>
    </div>`;
}

/** Repinta so' a lista de botoes — o selo "desligada" da porta B sai daqui
 *  assim que ela e' ligada, sem re-renderizar a tela (o que apagaria o texto
 *  que as portas ja' puseram no campo de escrever). */
function pintarBotoesDasPortas() {
  const el = document.getElementById('portas-botoes');
  if (!el || !ctx.voz) return;
  el.querySelectorAll('[data-porta="B"] .selo').forEach(x => x.remove());
}

function pintarPortas() {
  const el = document.getElementById('porta-painel');
  if (!el) return;
  const L = ctx.voz?.longa;
  if (!L?.porta) { el.innerHTML = ''; return; }
  if (!L.gravando && !L.ocupado && !L.feitos && !L.pendentes.length) { el.innerHTML = painelDaPorta(L.porta); return; }

  const mm = String(Math.floor(L.segundos / 60)); const ss = String(L.segundos % 60).padStart(2, '0');
  const linhas = [];
  if (L.gravando) linhas.push(`<p><b>Gravando ${mm}:${ss}.</b> Pode guardar o celular. O texto vai aparecendo no campo acima.</p>`);
  if (L.ocupado) linhas.push(`<p>Transformando em texto no computador do Instituto…</p>`);
  if (L.feitos) linhas.push(`<p class="sub">${L.feitos} pedaço(s) já viraram texto.</p>`);
  if (L.pendentes.length) linhas.push(
    `<p><b>A rede caiu no meio.</b> ${L.pendentes.length} pedaço(s) estão guardados neste aparelho e ainda não viraram texto.
     Não saia desta tela sem tentar de novo — se sair, eles se perdem.</p>`);
  if (L.erro) linhas.push(`<p>${esc(L.erro)}</p>`);

  el.innerHTML = `
    <div class="aviso ${L.pendentes.length || L.erro ? '' : 'calmo'}" style="margin-top:12px">
      <h3>${esc(PORTAS[L.porta].titulo)}</h3>
      ${linhas.join('')}
      <div class="pilha" style="margin-top:12px">
        ${L.gravando ? `<button class="btn largo" data-acao="porta-parar">Pronto, pode transformar em texto</button>` : ''}
        ${L.pendentes.length && !L.ocupado ? `<button class="btn largo" data-acao="porta-retentar">Tentar de novo</button>` : ''}
        ${!L.gravando && !L.ocupado
          ? `<button class="btn largo secundario" data-acao="porta-fechar">${L.pendentes.length ? 'Fechar e descartar o que não virou texto' : 'Fechar'}</button>`
          : ''}
      </div>
    </div>`;
}

function abrirPorta(k) {
  ctx.voz.longa = { porta: k, gravando: false, ocupado: false, gravador: null, segundos: 0, fila: [], pendentes: [], feitos: 0, erro: '' };
  pintarPortas();
}

/** Junta o texto de um pedaco ao campo de escrever — a saida e' UMA so'. */
function anexarTexto(t) {
  const campo = document.getElementById('ditado');
  if (!campo || !t) return;
  campo.value = juntarBlocos([campo.value, t]);
}

async function bombearBlocos() {
  const L = ctx.voz?.longa;
  if (!L || L.ocupado) return;
  L.ocupado = true;
  try {
    while (L.fila.length) {
      const blob = L.fila[0];
      L.erro = '';
      pintarPortas();
      try {
        const wav = await paraWav16k(blob);
        // 15 min de teto por pedaco de 5: whisper na maquina do Instituto ainda
        // nao foi medido, e um teto curto demais mataria a porta em silencio.
        const r = await api('/api/transcrever', {
          method: 'POST', body: wav, headers: { 'Content-Type': 'audio/wav' }, timeoutMs: 15 * 60 * 1000,
        });
        L.fila.shift();
        L.feitos++;
        anexarTexto(r.texto);
      } catch (e) {
        L.fila.shift();
        if (e.rede || e.timeout) {
          // Guardado NESTE APARELHO. Nao vai para a fila offline de proposito.
          L.pendentes.push(blob);
          L.erro = '';
        } else {
          L.erro = e.causa === 'sem_decodificar'
            ? 'Este navegador não conseguiu ler esse áudio. Dá para tentar outro arquivo — ou escrever.'
            : (e.message || 'A transcrição falhou. O registro por escrito continua completo.');
        }
      }
    }
  } finally {
    L.ocupado = false;
    pintarPortas();
  }
}

function receberBloco(blob) {
  const L = ctx.voz?.longa;
  if (!L) return;
  L.fila.push(blob);
  bombearBlocos();
}

async function iniciarPortaLonga(k) {
  const L = ctx.voz.longa;
  try {
    L.gravador = await iniciarGravacao({
      aoBloco: (blob) => receberBloco(blob),
      aoSegundo: (n) => { L.segundos = n; if (n % 5 === 0 || n < 3) pintarPortas(); },
      aoErro: () => { L.gravando = false; L.erro = 'A gravação parou sozinha. O que já virou texto está no campo acima.'; pintarPortas(); },
      blocoSegundos: BLOCO_SEGUNDOS,
    });
    L.gravando = true;
    pintarPortas();
  } catch {
    L.erro = 'O navegador bloqueou o microfone. Dá para escrever — o resto é igual.';
    pintarPortas();
  }
}

function pararPortaLonga() {
  const L = ctx.voz?.longa;
  if (!L?.gravador) return;
  L.gravando = false;
  try { L.gravador.parar(); } catch {}
  L.gravador = null;
  pintarPortas();
}

/**
 * Pega o arquivo que o service worker guardou quando o sistema compartilhou um
 * áudio com o Percurso. O cache e' o unico lugar por onde um POST vindo de fora
 * do app consegue entregar bytes a uma pagina que ainda nem abriu.
 *
 * Some depois de lido, sempre: audio compartilhado que fica no cache do
 * navegador seria exatamente a copia que a tela promete nao guardar.
 */
async function receberCompartilhado() {
  try {
    const cache = await caches.open('percurso-compartilhado');
    const resp = await cache.match('/__ultimo-compartilhado');
    if (!resp) { toast('O áudio compartilhado não chegou até aqui. Dá para escolher pelo botão "Trazer um áudio que eu já tenho".'); return; }
    const blob = await resp.blob();
    const nome = resp.headers.get('X-Percurso-Nome') || 'audio-compartilhado';
    await cache.delete('/__ultimo-compartilhado');
    toast(`Recebi "${nome}". Transcrevendo…`, 'bom');
    await receberArquivo(new File([blob], nome, { type: blob.type }));
  } catch {
    toast('Não consegui abrir o áudio compartilhado. Tente pelo botão de escolher arquivo.');
  }
}

async function receberArquivo(arquivo) {
  const L = ctx.voz?.longa;
  if (!L || !arquivo) return;
  if (arquivo.size > TETO_ARQUIVO_BYTES) {
    L.erro = `Esse arquivo tem ${Math.round(arquivo.size / 1024 / 1024)} MB e o limite é ${Math.round(TETO_ARQUIVO_BYTES / 1024 / 1024)} MB. Dá para mandar em pedaços.`;
    pintarPortas();
    return;
  }
  receberBloco(arquivo);
}

function pararVoz() {
  const v = ctx.voz; if (!v) return;
  // Sair da tela encerra TAMBEM a gravacao longa: microfone aceso depois de a
  // pessoa navegar seria a pior falha possivel numa tela que promete o
  // contrario. O que ja' virou texto ficou no campo; o que nao virou, nao vira.
  try { v.longa?.gravador?.cancelar(); } catch {}
  if (v.longa) { v.longa.gravando = false; v.longa.gravador = null; }
  clearInterval(v.timer); v.timer = null;
  try { v.rec?.stop(); } catch {}
  v.gravando = false;
  const mic = document.getElementById('mic');
  if (mic) {
    mic.classList.remove('gravando');
    mic.setAttribute('aria-pressed', 'false');
    mic.setAttribute('aria-label', 'Começar a gravar');
  }
  document.getElementById('onda')?.classList.remove('ativa');
}

function animarOnda() {
  const onda = document.getElementById('onda');
  if (!onda || !ctx.voz?.gravando) return;
  onda.querySelectorAll('i').forEach((b, i) => {
    b.style.height = `${5 + Math.abs(Math.sin(Date.now() / 190 + i)) * 17}px`;
  });
}

// ======================================================================
// A MAGIA — a fala virando campos, entre "Terminei" e "O que entendi".
//
// Honesta em três sentidos: começa junto com o POST real (não depois dele),
// só mostra o que o extrator de fato devolveu, e NÃO acontece quando o
// sistema falha (baixa confiança) ou protege (perímetro) — fingir encanto
// sobre uma falha quebraria a confiança que o app inteiro cultiva.
// A transcrição aparece UMA vez, para quem falou, e morre como sempre morreu;
// o trecho de perímetro jamais ganha destaque — só esmaece.
// ======================================================================
let magiaAtual = null;
function pularMagia() { magiaAtual?.pular(); }

async function magiaExtracao(texto, promessaPost, catalogos) {
  const st = { pulado: false, cancels: [] };
  const dorme = (ms) => new Promise(res => {
    if (st.pulado) return res();
    const id = setTimeout(res, ms);
    st.cancels.push(() => { clearTimeout(id); res(); });
  });

  const el = document.createElement('div');
  el.className = 'magia';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Lendo o que você contou');
  // E4 (campo): a fala aparece UMA vez, já com os nomes da turma trocados por
  // código — "você fala o nome, ele apaga". O roster vem da chamada carregada.
  const roster = (ctx.folha?.roster ?? []);
  let textoTela = texto;
  roster.forEach((nome, i) => {
    const primeiro = nome.split(' ')[0];
    if (primeiro.length < 3) return;
    const re = new RegExp('(^|[^\\p{L}])' + primeiro.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^\\p{L}])', 'giu');
    textoTela = textoTela.replace(re, (m, pre) => pre + 'Criança ' + String.fromCharCode(65 + (i % 26)));
  });
  const palavras = textoTela.trim().split(/\s+/);
  el.innerHTML = `
    <div class="magia-caixa">
      <div class="lbl magia-estado" role="status" aria-live="polite" style="margin:0">Lendo o que você contou…</div>
      <p class="magia-fala">${palavras.slice(0, 24).map((p, i) =>
        `<span style="animation-delay:${i * 12}ms">${esc(p)} </span>`).join('')}${palavras.length > 24 ? '…' : ''}</p>
      <div class="magia-lendo"><i></i></div>
      <svg class="magia-traco" viewBox="0 0 200 90" aria-hidden="true" hidden>
        <path d="M100 4 C 60 30, 140 55, 100 86"/>
      </svg>
      <ol class="magia-campos"></ol>
      <button class="magia-pular" data-acao="magia-pular">Pular</button>
    </div>`;
  document.body.appendChild(el);
  magiaAtual = { pular: () => { st.pulado = true; st.cancels.forEach(fn => { try { fn(); } catch {} }); } };
  // O roteador fecha a magia se o usuário navegar no meio (Back, link) — a
  // coreografia morre, o POST segue, e o handler NÃO sequestra a navegação.
  el._cancelarPelaRota = () => {
    st.cancelada = true;
    magiaAtual?.pular();
    magiaAtual = null;
    el.remove();
  };

  const $ = (s) => el.querySelector(s);
  const estado = $('.magia-estado');
  const fala = $('.magia-fala');
  const lendo = $('.magia-lendo');

  const tEstado = setTimeout(() => { if (!st.pulado) estado.textContent = 'Separando os campos…'; }, 2500);
  st.cancels.push(() => clearTimeout(tEstado));

  const encerrar = () => {
    magiaAtual = null;
    if (!el.isConnected) return;
    el.classList.add('saindo');
    setTimeout(() => el.remove(), 400);
  };

  let r;
  try {
    // A encenação nunca mente: espera o POST DE VERDADE (piso de 650ms para a
    // fase de leitura não virar um flash quando o servidor é rápido).
    [r] = await Promise.all([promessaPost, dorme(650)]);
  } catch (e) {
    clearTimeout(tEstado);
    encerrar();
    throw e; // o handler trata rede/erro como sempre tratou
  }
  clearTimeout(tEstado);

  if (!st.pulado) {
    if (r.excluido) {
      // Desfecho proteção: sóbrio, sem mágica. O trecho NUNCA é destacado.
      lendo.style.display = 'none';
      estado.textContent = 'Uma parte do que você contou não entra no sistema';
      fala.classList.add('esmaece');
      await dorme(900);
    } else if (r.baixa_confianca) {
      // Desfecho falha: nada se materializa — falhar em branco é melhor.
      lendo.classList.add('assentou');
      estado.textContent = 'Não consegui entender direito';
      const sub = document.createElement('p');
      sub.className = 'sub';
      sub.style.marginTop = '10px';
      sub.textContent = 'Você marca — nada foi pré-marcado.';
      lendo.after(sub);
      await dorme(1200);
    } else {
      // Desfecho feliz: sublinhado honesto → traço → campos um a um.
      lendo.style.transition = 'opacity .15s ease';
      lendo.style.opacity = '0';
      estado.textContent = 'Encontrei os campos na sua fala';

      const rot = (lista, codigo) => lista.find(x => x.codigo === codigo)?.rotulo ?? '';
      const semAcento = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const ex = r.extracao;
      const rotulos = [
        ex.atividade !== 'nao_identificada' ? rot(catalogos.atividades, ex.atividade) : '',
        ex.area_tematica !== 'nenhuma' ? rot(catalogos.areas, ex.area_tematica) : '',
        ...ex.marcadores_turma.map(m => rot(catalogos.marcadores, m)),
      ].filter(Boolean);
      // Palavras dos rótulos realmente extraídos (>=4 letras) — o sublinhado só
      // marca o que de fato virou campo; zero match = beat pulado, nunca inventado.
      const alvos = new Set(rotulos.flatMap(rt => semAcento(rt).split(/\s+/).filter(w => w.length >= 4)));
      let marcas = 0;
      if (alvos.size) {
        for (const span of fala.querySelectorAll('span')) {
          if (marcas >= 4) break;
          const w = semAcento(span.textContent.trim()).replace(/[^\p{L}\p{N}]/gu, '');
          if (w.length >= 4 && [...alvos].some(a =>
                w === a || (w.length >= 5 && a.length >= 5 && w.slice(0, 5) === a.slice(0, 5)))) {
            const mark = document.createElement('mark');
            mark.style.animationDelay = `${marcas * 90}ms`;
            mark.textContent = span.textContent;
            span.textContent = '';
            span.appendChild(mark);
            marcas++;
          }
        }
      }
      if (marcas) { fala.classList.add('sublinha'); await dorme(500); }

      const svg = $('.magia-traco');
      svg.hidden = false;
      const caminho = svg.querySelector('path');
      const L = caminho.getTotalLength();
      caminho.style.strokeDasharray = L;
      caminho.style.strokeDashoffset = L;
      caminho.getBoundingClientRect();
      caminho.style.strokeDashoffset = '0';
      await dorme(300);

      // Só campos NÃO neutros se materializam — campo vazio não vira teatro.
      const campos = [];
      const campo = (k, corpo) => campos.push(
        `<li class="magia-campo" style="animation-delay:${campos.length * 160}ms"><span class="k">${k}</span>${corpo}</li>`);
      if (ex.atividade !== 'nao_identificada')
        campo('Atividade', `<b>${esc(rot(catalogos.atividades, ex.atividade))}</b>`);
      if (ex.area_tematica !== 'nenhuma')
        campo('Área do encontro', `<b>${esc(rot(catalogos.areas, ex.area_tematica))}</b>`);
      if (ex.marcadores_turma.length)
        campo('Como foi o grupo', `<span>${ex.marcadores_turma.map(m =>
          `<span class="p on" style="margin:0 0 0 5px">${esc(rot(catalogos.marcadores, m))}</span>`).join('')}</span>`);
      if (ex.pediram_ajuda > 0)
        campo('Pediram ajuda', `<b class="num" id="magia-ajuda">0</b>`);
      $('.magia-campos').innerHTML = campos.join('');

      const ajuda = $('#magia-ajuda');
      if (ajuda) {
        const t0 = performance.now() + campos.length * 160;
        let raf = null;
        const aurora = (agora) => {
          if (!ajuda.isConnected || st.pulado) { ajuda.textContent = ex.pediram_ajuda; return; }
          const p = Math.min(1, Math.max(0, (agora - t0) / 500));
          ajuda.textContent = Math.round((1 - Math.pow(1 - p, 3)) * ex.pediram_ajuda);
          if (p < 1) raf = requestAnimationFrame(aurora);
        };
        raf = requestAnimationFrame(aurora);
        st.cancels.push(() => cancelAnimationFrame(raf));
      }
      await dorme(400 + campos.length * 160 + 500);
      if (el.isConnected) estado.textContent = 'Confira — nada foi gravado ainda.';
      await dorme(400);
    }
  }
  return { r, encerrar, cancelada: () => !!st.cancelada };
}

// ======================================================================
// CONFIRMAR REGISTRO (F6) — nada é gravado antes de confirmar.
// ======================================================================
/**
 * AS FALTAS QUE ELA DISSE (F6). O campo pediu literalmente: *"Ou então você
 * marque a presença / Pelo nome, só falando"* (Grav. 82).
 *
 * OFERECE, nunca presume. Marca só quem ela CITOU, como falta, e deixa todo o
 * resto sem marcar — presença decide renovação de matrícula (régua de 75%,
 * decisão 33), e quem a fala não citou simplesmente não foi citada.
 */
function blocoFaltasDitas() {
  const f = ctx.folha;
  const ditas = f?.faltasSugeridas ?? [];
  if (!ditas.length) return '';
  const ids = ditas.map(c => c.id).join(',');
  return `
    <div class="aviso calmo" style="margin-top:14px">
      <h3>Você disse que ${ditas.length === 1 ? 'faltou' : 'faltaram'}</h3>
      <p>${ditas.map(c => `<span class="p redsoft" style="margin:0 4px 0 0">${esc(c.nome)}</span>`).join('')}</p>
      <p class="sub" style="margin-top:8px">Quer marcar na chamada? Vou marcar falta só ${ditas.length === 1 ? 'nessa criança' : 'nessas crianças'} — o resto da turma fica sem marcar, para você conferir.</p>
      <div class="linha" style="margin-top:10px">
        <button class="btn pequeno" data-acao="ir" data-href="#/chamada?data=${f.data}&faltas=${ids}">Abrir a chamada com elas marcadas</button>
      </div>
    </div>`;
}

async function telaConfirmar() {
  if (!ctx.folha || !ctx.folha.sugestao) { location.hash = '#/registrar'; navegar(); return; }
  const f = ctx.folha;
  app.innerHTML = `
    <p class="kicker">Nada foi gravado ainda</p>
    <h1>O que eu entendi</h1>
    <p class="sub">Confira e ajuste. Só o que você confirmar é guardado.</p>

    ${f.baixaConfianca ? `
      <div class="aviso" style="margin-top:14px">
        <h3>Não consegui entender direito</h3>
        <p>Marque você mesma. Não pré-marquei nada — falhar em branco é melhor que falhar preenchido.</p>
      </div>` : ''}
    ${f.nomesSubstituidos ? `
      <div class="aviso calmo" style="margin-top:14px">
        <h3>${f.nomesSubstituidos === 1 ? 'Um nome virou código' : `${f.nomesSubstituidos} nomes viraram código`}</h3>
        <p>Você falou o nome de ${f.nomesSubstituidos === 1 ? 'uma criança' : 'crianças'}. O nome não entrou em campo nenhum e não foi gravado — a folha é da turma.</p>
      </div>` : ''}

    ${blocoFaltasDitas()}

    <div class="pilha">
      <div id="blocos-folha">${blocosDaFolha()}</div>
      ${f.excluido ? `
        <div class="aviso" role="alert">
          <h3>Tem algo aqui que não entra no sistema</h3>
          <p>Fale com a coordenação — esse caminho é fora daqui.
             ${f.trechos.length ? `O trecho era de <b>${esc(f.trechos.map(t => t.categoria).join(', '))}</b>.` : ''}
             Ele não foi extraído, não foi gravado e não fica em lugar nenhum.</p>
        </div>` : ''}
      <button class="btn largo" data-acao="salvar-folha" data-fechar="0">Confirmar e guardar</button>
      <button class="btn largo secundario" data-acao="descartar-folha">Descartar</button>
      <button class="btn largo fantasma" data-acao="ir" data-href="#/registrar">Regravar</button>
    </div>
    <p class="rodape">Áudio e transcrição são apagados ao confirmar.<br>
      Confiança do extrator nesta fala: ${f.sugestao.confianca != null ? String(f.sugestao.confianca).replace('.', ',') : '—'}.</p>`;
}

// ======================================================================
// RELATO DO PROCEDIMENTO (decisão 31) — o texto no padrão do conselho, gerado
// dos campos fechados, revisado e LIBERADO pela profissional.
// ======================================================================
// ======================================================================
// O QUE SAI DESTE ENCONTRO (F2) — o relato do conselho e o recado aos
// responsáveis eram duas telas. São as DUAS SAÍDAS do mesmo encontro, geradas
// do mesmo registro, nenhuma das duas persistindo texto. Quem acabou de
// confirmar a folha quer as duas, e tinha de achar duas portas.
// ======================================================================
const ABAS_SAIDA = [
  ['relato', 'Relato do encontro'],
  ['recado', 'Recado aos responsáveis'],
];

const cabecalhoSaida = (ativa, qs = '') => `
    <div class="linha" style="flex-wrap:wrap;gap:8px">
      ${ABAS_SAIDA.map(([k, rot]) => `<button class="btn pequeno ${k === ativa ? '' : 'fantasma'}"
        data-acao="ir" data-href="#/sai-daqui?aba=${k}${qs}" ${k === ativa ? 'aria-current="page"' : ''}>${rot}</button>`).join('')}
    </div>`;

/** A query que identifica o encontro, preservada ao trocar de aba. */
const qsDoEncontro = (params) => {
  const t = params.get('turma_id'), d = params.get('data');
  return `${t ? `&turma_id=${encodeURIComponent(t)}` : ''}${d ? `&data=${encodeURIComponent(d)}` : ''}`;
};

rota(/^#\/sai-daqui/, async () => {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  return params.get('aba') === 'recado' ? telaRecado(params) : telaRelato(params);
});

async function telaRelato(params) {
  let turmaId = params.get('turma_id');
  if (!turmaId) {
    const h = await api('/api/hoje');
    if (!h.turma) { app.innerHTML = `${VOLTA_AO_HOJE}<div class="cartao"><h2>Sem turma atribuída</h2><p class="sub">A coordenação abre o relato pela folha de cada turma.</p></div>`; return; }
    turmaId = h.turma.id;
  }
  let r;
  try { r = await api(`/api/relato?turma_id=${turmaId}${params.get('data') ? `&data=${params.get('data')}` : ''}`); }
  catch (e) {
    app.innerHTML = `<p class="kicker">Relato</p><h1>Ainda não há o que relatar</h1><p class="sub">${esc(e.message)}</p>
      <div class="linha" style="margin-top:16px"><button class="btn" data-acao="ir" data-href="#/registrar">Contar como foi</button>
      <button class="btn secundario" data-acao="ir" data-href="#/registrar?passo=mao">Preencher à mão</button></div>`;
    return;
  }
  ctx.relato = { turmaId, data: r.data };
  app.innerHTML = cabecalhoSaida('relato', qsDoEncontro(params)) + `
    <p class="kicker" style="margin-top:12px">${esc(r.turma.programa)} · ${esc(r.turma.nome)}</p>
    <h1>${r.vivencia ? 'Relato do procedimento' : 'Registro do encontro'}</h1>
    <p class="sub">${esc(porExtenso(r.data))} · ${r.liberado ? 'liberado' : 'rascunho — aguardando seu OK'}</p>
    <div class="cartao" style="margin-top:14px">
      <pre id="relato-texto" style="white-space:pre-wrap;font:inherit;line-height:1.55;margin:0">${esc(r.texto)}</pre>
    </div>
    <div class="aviso calmo" style="margin-top:12px">
      <h3>Sem nome por construção</h3>
      <p>O texto sai dos campos fechados da folha: não existe onde escrever o nome de uma criança. A IA, quando ligada, não escreve aqui — o texto é seu, e só vale depois do seu OK.</p>
    </div>
    <div class="pilha">
      ${r.liberado ? '' : `<button class="btn largo" data-acao="liberar-relato">Revisei — liberar o relato</button>`}
      <button class="btn largo secundario" data-acao="copiar-relato">Copiar o texto</button>
      <button class="btn largo fantasma" data-acao="imprimir">Imprimir</button>
      ${r.liberado ? '' : `<button class="btn largo fantasma" data-acao="ir" data-href="#/registrar?passo=mao&data=${r.data}">Ajustar a folha antes</button>`}
    </div>
    ${r.historico.length ? `<div class="cartao compacto" style="margin-top:14px">
      <h2>Relatos liberados desta turma</h2>
      <div class="pilha" style="margin-top:8px">${r.historico.map(h => `
        <button class="link" data-acao="ir" data-href="#/sai-daqui?aba=relato&turma_id=${turmaId}&data=${h.data}">
          <span><span>${dataBR(h.data)}</span><span class="d">${esc(h.procedimento_rotulo)} · por ${esc(h.liberado_por ?? '—')}</span></span>
          <span class="chev" aria-hidden="true">›</span></button>`).join('')}</div>
    </div>` : ''}
    <p class="rodape">${esc(r.versao_template)}. Editar a folha depois de liberar derruba a liberação — o texto aprovado tem que ser o do banco.</p>`;
}

// ======================================================================
// RECADO DA TURMA (decisão 33) — o que já sai para o grupo dos responsáveis,
// gerado; quem envia é a pessoa. Sem criança nomeada.
// ======================================================================
async function telaRecado(params) {
  let turmaId = params.get('turma_id');
  if (!turmaId) {
    const h = await api('/api/hoje');
    if (!h.turma) { app.innerHTML = `${VOLTA_AO_HOJE}<div class="cartao"><h2>Sem turma atribuída</h2></div>`; return; }
    turmaId = h.turma.id;
  }
  let r;
  try { r = await api(`/api/recado?turma_id=${turmaId}${params.get('data') ? `&data=${params.get('data')}` : ''}`); }
  catch (e) {
    app.innerHTML = `<p class="kicker">Recado da turma</p><h1>Antes, a chamada</h1><p class="sub">${esc(e.message)}</p>
      <div class="linha" style="margin-top:16px"><button class="btn" data-acao="ir" data-href="#/chamada">Fazer a chamada</button></div>`;
    return;
  }
  // Os grupos cadastrados DESTA turma (decisão 50): a coordenação cadastra, a
  // professora manda. Cada grupo é um toque que abre o WhatsApp com o texto
  // escrito — e o servidor lembra quem já recebeu este recado hoje.
  const referencia = `${r.turma.nome} · ${r.data}`;
  let grupos = [], jaHoje = [];
  try {
    const c = await api('/api/canais');
    grupos = c.canais.filter(x => x.tipo === 'whatsapp' && x.publico === 'pais'
      && (x.turma_id === Number(turmaId) || x.turma_id == null));
    const d = new Date(); d.setHours(0, 0, 0, 0);
    jaHoje = (await api(`/api/divulgar/ja-recebeu?conteudo=recado&referencia=${encodeURIComponent(referencia)}&desde=${encodeURIComponent(d.toISOString())}`)).canal_ids;
  } catch { /* sem canais ou sem rede: o botão genérico continua */ }
  ctx.recadoRef = referencia;
  const blocoGrupos = grupos.length ? `
    <div class="cartao compacto" style="margin-top:12px">
      <h2>Para o grupo da turma</h2>
      <p class="sub">Abre o WhatsApp já com o recado escrito — é só escolher o grupo e enviar.</p>
      <div class="pilha" style="margin-top:10px">
        ${grupos.map(g => `<div class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:8px">
          <div class="linha">
            <div class="cresce"><div class="nome">${esc(g.nome)}</div>
              <div class="meta">${jaHoje.includes(g.id) ? '<b>já recebeu este recado hoje</b>' : g.ultimo_envio ? `último envio ${dataBR(g.ultimo_envio.slice(0, 10))}` : 'nunca usado'}</div></div>
            ${jaHoje.includes(g.id) ? '<span class="selo ok">✓</span>' : ''}
          </div>
          <div class="linha" style="gap:8px">
            <a class="btn pequeno ${jaHoje.includes(g.id) ? 'fantasma' : ''} cresce" href="${r.whatsapp_url}" target="_blank" rel="noopener"
              data-acao="recado-grupo" data-id="${g.id}" style="text-align:center">Abrir com o texto pronto</a>
            <a class="btn pequeno fantasma" href="${esc(g.endereco)}" target="_blank" rel="noopener"
              data-acao="recado-grupo" data-id="${g.id}">Abrir o grupo</a>
          </div>
        </div>`).join('')}
      </div>
    </div>` : '';
  app.innerHTML = cabecalhoSaida('recado', qsDoEncontro(params)) + `
    <p class="kicker" style="margin-top:12px">${esc(r.turma.nome)}</p>
    <h1>Recado para os responsáveis</h1>
    <p class="sub">${esc(porExtenso(r.data))} · o que já sai hoje para o grupo, pronto para colar</p>
    <div class="cartao" style="margin-top:14px">
      <pre id="recado-texto" style="white-space:pre-wrap;font:inherit;line-height:1.55;margin:0">${esc(r.texto)}</pre>
    </div>
    <div class="aviso calmo" style="margin-top:12px">
      <h3>Da turma, nunca de uma criança</h3>
      <p>${esc(r.doutrina)}</p>
    </div>
    ${blocoGrupos}
    <div class="pilha">
      <button class="btn largo ${grupos.length ? 'fantasma' : ''}" data-acao="copiar-recado">Copiar o recado</button>
      ${grupos.length ? '' : `<a class="btn largo secundario" href="${r.whatsapp_url}" target="_blank" rel="noopener">Abrir no WhatsApp</a>`}
      <button class="btn largo fantasma" data-acao="ir" data-href="#/hoje">Voltar</button>
    </div>
    <p class="rodape">Base legal: legítimo interesse — comunicação com os responsáveis sobre a turma. O recado não é guardado: é gerado agora, do registro.</p>`;
}

// ======================================================================
// PAUTA DE SEGUNDA (F11) — o laço de devolução.
// ======================================================================
async function telaParaEstaSemana() {
  const h = await api('/api/hoje');
  if (!h.turma) {
    app.innerHTML = `${VOLTA_AO_HOJE}<div class="cartao"><h2>Sem turma atribuída</h2>
      <p class="sub">A pauta é da turma — este perfil não tem turma no momento.</p></div>`;
    return;
  }
  const p = await api(`/api/pauta?turma_id=${h.turma.id}`);
  ctx.pautaTurma = h.turma.id;

  app.innerHTML = `${VOLTA_AO_HOJE}
    <p class="kicker" style="margin-top:10px">Segunda-feira · gerado sozinho</p>
    <h1>Três coisas para a semana</h1>
    <p class="sub">${esc(p.turma.nome)} · semana de ${dataBR(p.semana)}</p>

    ${p.tranquila ? `<div class="cartao" style="margin-top:16px">
      <div class="big">${esc(p.mensagem_tranquila)}</div>
      <p class="sub" style="margin-top:6px">Nenhuma criança com faltas seguidas e nenhuma área de interesse sem atividade.</p>
    </div>` : ''}

    <div class="pilha">
      ${p.risco.n ? `
      <div class="cartao ambar">
        <div class="lbl">${esc(p.risco.titulo)}</div>
        <div class="big">${p.risco.n} ${p.risco.n === 1 ? 'criança' : 'crianças'}</div>
        <p class="sub" style="margin-top:4px">${esc(p.risco.frase)}</p>
        <div style="margin-top:9px">${p.risco.criancas.map(c =>
          `<button class="p amb" data-acao="ir" data-href="#/crianca/${c.crianca_id}" title="${esc(c.motivo)}">${esc(c.nome)}</button>`).join('')}</div>
      </div>` : ''}

      ${p.exposicao.area ? `
      <div class="cartao">
        <div class="lbl">${esc(p.exposicao.titulo)}</div>
        <div class="big">${esc(p.exposicao.area)}</div>
        <p class="sub" style="margin-top:4px">${esc(p.exposicao.frase)}</p>
      </div>` : ''}

      ${p.sugestao ? `
      <div class="cartao">
        <div class="lbl">Sugestão de pauta</div>
        <b style="font-size:14.5px">${esc(p.sugestao.titulo)}</b>
        <p class="sub" style="margin-top:5px">${esc(p.sugestao.descricao)}</p>
        <p class="sub" style="margin-top:5px">${esc(p.sugestao.duracao)} · ${esc(p.sugestao.porque)}</p>
        ${p.sugestao.decisao
          ? `<p class="sub" style="margin-top:10px"><span class="selo ${p.sugestao.decisao === 'aceita' ? 'ok' : 'bloq'}">${p.sugestao.decisao}</span> em ${dataBR(p.sugestao.decidido_em)}</p>`
          : `<div class="linha" style="margin-top:11px">
               <button class="btn cresce" data-acao="pauta" data-decisao="aceita">Aceitar e pôr no sábado</button>
               <button class="btn secundario cresce" data-acao="pauta" data-decisao="descartada">Não faz sentido</button>
             </div>`}
      </div>` : ''}
    </div>
    <p class="rodape">${esc(p.rodape)}<br>${esc(p.doutrina)}</p>`;
}

// ======================================================================
// SCORES (F8/F9/F10) — coordenação e diretoria. Nunca em tela de professora.
// ======================================================================
async function telaScores() {
  const d = await api('/api/scores');
  const e = d.evasao, c = d.cobertura, x = d.exposicao;
  app.innerHTML = cabecalhoPainel('scores') + `
    <p class="sub" style="margin-top:12px"><b>Nenhum pontua a criança.</b> ${esc(d.doutrina)}</p>

    <div class="kpis" style="margin-top:16px">
      <div class="kpi"><b>${e.em_risco}</b><span>Matrículas em risco</span><small>de ${e.avaliadas} avaliadas</small></div>
      <div class="kpi"><b>${c.valor}%</b><span>Cobertura do registro</span><small>${c.completas} de ${c.total} encontros</small></div>
      <div class="kpi"><b>${x.valor}%</b><span>Exposição</span><small>${x.areas_cobertas} de ${x.areas_com_interesse} áreas</small></div>
      <div class="kpi"><b>${d.extrator.taxa_correcao_pct ?? '—'}%</b><span>Correção pós-extração</span><small>${d.extrator.por_voz} folhas por voz</small></div>
    </div>

    <div class="cartao" style="margin-top:16px">
      <h2>Risco de evasão</h2>
      <p class="sub">${esc(e.doutrina)} Entra na lista com ${e.faltas_para_lista} faltas seguidas ou score acima de ${e.limiar_acao}.</p>
      ${e.nominal_suprimido ? `
        <div class="aviso protecao" style="margin-top:12px">
          <h3>A lista nominal não abre neste perfil</h3>
          <p>A diretoria trabalha sobre a camada agregada: quem presta contas não precisa saber
             o nome da criança para agir, e por isso não recebe. Quem liga para a família é a
             coordenação. Abaixo, a distribuição por turma — com recortes menores que
             ${e.minimo_celula ?? 5} crianças agrupados.</p>
        </div>
        <div class="rolagem" style="margin-top:12px"><table>
          <thead><tr><th>Turma</th><th>Em risco</th></tr></thead>
          <tbody>${e.por_turma.map(t => `<tr><td>${esc(t.turma)}</td><td><b>${t.n}</b></td></tr>`).join('')}</tbody>
        </table></div>
        ${e.turmas_suprimidas ? `<p class="sub" style="margin-top:8px">${e.turmas_suprimidas} turma(s) com menos de ${e.minimo_celula} em risco foram agrupadas.</p>` : ''}`
      : e.linhas.length ? `<div class="rolagem" style="margin-top:12px"><table>
        <thead><tr><th>Criança</th><th>Turma</th><th>Score</th><th>Motivo</th><th>Linha de base</th><th>Recente</th></tr></thead>
        <tbody>${e.linhas.slice(0, 20).map(l => `<tr>
          <td><b>${esc(l.nome)}</b></td><td>${esc(l.turma || '—')}</td>
          <td><b style="color:var(--red)">${l.valor}</b></td><td>${esc(l.motivo)}</td>
          <td>${l.linha_de_base_pct}%</td><td>${l.recente_pct}%</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="vazio">Nenhuma matrícula em risco.</p>'}
    </div>

    <div class="cartao" style="margin-top:14px">
      <h2>Cobertura do registro</h2>
      <p class="sub">${esc(c.doutrina)}</p>
      <div class="dado" style="margin-top:10px"><span class="k">Folhas completas</span><b>${c.completas} de ${c.total}</b></div>
      <div class="dado"><span class="k">Turmas sem registro</span><b style="color:var(--atencao)">${c.turmas_sem_registro}</b></div>
      <div class="dado"><span class="k">Período</span><b>${dataBR(c.periodo.inicio)} a ${dataBR(c.periodo.fim)}</b></div>
      ${barra(c.valor, !c.alerta)}
      <div class="rolagem" style="margin-top:14px"><table>
        <thead><tr><th>Turma</th><th>Completas</th><th>Encontros</th><th>%</th><th>Última completa</th></tr></thead>
        <tbody>${c.turmas.map(t => `<tr><td>${esc(t.turma)}</td><td>${t.completas}</td><td>${t.total}</td>
          <td><b>${t.pct}%</b></td><td>${t.ultima_completa ? dataBR(t.ultima_completa) : '—'}</td></tr>`).join('')}</tbody></table></div>
    </div>

    <div class="cartao" style="margin-top:14px">
      <h2>Exposição</h2>
      <p class="sub">${esc(x.doutrina)}</p>
      <div class="rolagem" style="margin-top:12px"><table>
        <thead><tr><th>Área declarada</th><th>Crianças</th><th>Atividades</th><th>Situação</th></tr></thead>
        <tbody>${x.areas.map(a => `<tr><td><b>${esc(a.rotulo)}</b></td><td>${a.criancas}</td><td>${a.atividades}</td>
          <td>${a.lacuna ? '<span class="selo alerta">em aberto</span>' : '<span class="selo ok">coberta</span>'}</td></tr>`).join('')}</tbody></table></div>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>Qualidade dos agentes</h2>
      <p class="sub">As duas métricas que medem a IA de verdade. Se a educadora corrige muito, o agente está pior que o formulário; se descarta muito, a pauta está genérica.</p>
      <div class="dado" style="margin-top:10px"><span class="k">Taxa de correção pós-extração</span><b>${d.extrator.taxa_correcao_pct ?? '—'}%</b></div>
      <div class="dado"><span class="k">Confiança média do extrator</span><b>${d.extrator.confianca_media != null ? String(d.extrator.confianca_media).replace('.', ',') : '—'}</b></div>
      <div class="dado"><span class="k">Falas com conteúdo excluído</span><b>${d.extrator.excluiram_conteudo}</b></div>
      <div class="dado"><span class="k">Taxa de descarte da pauta</span>
        <b style="color:${d.descarte.alerta ? 'var(--red)' : 'var(--ink)'}">${d.descarte.pct ?? '—'}%</b></div>
      <p class="sub" style="margin-top:8px">Limiar de alerta da pauta: ${d.descarte.limiar}%. ${d.descarte.decididas} sugestões decididas.</p>
    </div>
    <p class="rodape">A cobertura do registro não aparece em tela de educadora e não vira ranking.</p>`;
}

// ======================================================================
// RELATÓRIO DO CICLO (F13/F14) — diretoria.
// ======================================================================
// ======================================================================
// RELATÓRIO (F2) — o SROI é um BLOCO do relatório, não um destino; e perguntar
// à base é perguntar sobre aqueles mesmos números. Três telas para a diretoria
// (que tinha só três) viraram uma com três abas — e o menu dela, que era o
// produto inteiro em três botões, passa a ter um item.
// ======================================================================
const ABAS_RELATORIO = [
  ['ciclo', 'Relatório'],
  ['impacto', 'Impacto potencial'],
  ['consulta', 'Perguntar à base'],
];

const cabecalhoRelatorio = (ativa) => `
    <p class="kicker">Diretoria · saída para quem financia</p>
    <div class="linha" style="margin-top:10px;flex-wrap:wrap;gap:8px">
      ${ABAS_RELATORIO.map(([k, rot]) => `<button class="btn pequeno ${k === ativa ? '' : 'fantasma'}"
        data-acao="ir" data-href="#/relatorio${k === 'ciclo' ? '' : `?aba=${k}`}" ${k === ativa ? 'aria-current="page"' : ''}>${rot}</button>`).join('')}
    </div>`;

rota(/^#\/relatorio/, async () => {
  const aba = (location.hash.match(/[?&]aba=([a-z]+)/) || [])[1] || 'ciclo';
  if (aba === 'impacto') return telaImpactoPotencial();
  if (aba === 'consulta') return telaPerguntarABase();
  return telaRelatorioDoCiclo();
});

async function telaRelatorioDoCiclo() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const tipo = params.get('tipo') || 'ciclo';
  let periodo = params.get('periodo') || '';
  let d = await api(`/api/relatorio?tipo=${tipo}${periodo ? `&periodo=${periodo}` : ''}`);
  if (!periodo && d.periodos?.length) {
    const p0 = d.periodos[0];
    periodo = `${p0.inicio}..${p0.fim}`;
    if (periodo) d = await api(`/api/relatorio?tipo=${tipo}&periodo=${encodeURIComponent(periodo)}`);
  }
  ctx.rel = { tipo, periodo, periodos: d.periodos };
  const r = d.relatorio, n = d.previa;

  app.innerHTML = cabecalhoRelatorio('ciclo') + `
    <h1 style="margin-top:12px">Boa tarde, ${esc(sessao.apelido.split(' ')[0])}.</h1>
    <p class="sub">O doador não entra no sistema. Ele recebe este artefato, gerado e revisado aqui.</p>

    <button class="btn largo secundario" data-acao="ir" data-href="#/divulgar" style="margin-top:14px">
      Divulgar · grupos e Instagram</button>

    <div class="cartao" style="margin-top:16px">
      <div class="lbl">Tipo</div>
      <button class="p ${tipo === 'ciclo' ? 'on' : 'off'}" data-acao="rel-tipo" data-tipo="ciclo">Relatório do ciclo</button>
      <button class="p ${tipo === 'carta' ? 'on' : 'off'}" data-acao="rel-tipo" data-tipo="carta">Carta do trimestre</button>
      <div class="lbl" style="margin-top:14px">Período</div>
      ${d.periodos.map(p => `<button class="p ${periodo === `${p.inicio}..${p.fim}` ? 'on' : 'off'}"
        data-acao="rel-periodo" data-periodo="${p.inicio}..${p.fim}">${esc(p.rotulo)}</button>`).join('')}
      <div style="margin-top:12px">
        <label for="custo" style="font-size:12.5px;font-weight:600">Custo do período (opcional)</label>
        <input type="number" id="custo" min="0" step="0.01" placeholder="Ex.: 48200.50"
               value="${r?.numeros?.custo?.valor ?? ''}" style="margin-top:6px">
        <p class="sub" style="margin-top:5px">Sem custo preenchido, o bloco 7 publica só os dois denominadores.</p>
      </div>
    </div>

    ${n ? `
    <div class="cartao" style="margin-top:14px">
      <div class="lbl">Prévia</div>
      <div class="big">${n.permanencia.mais_de_doze_meses} crianças</div>
      <p class="sub" style="margin-top:4px">com mais de 12 meses de vínculo</p>
      <div class="dado" style="margin-top:10px"><span class="k">Presença média</span><b>${n.permanencia.presenca_pct ?? '—'}%</b></div>
      <div class="dado"><span class="k">Crianças únicas · matrículas</span><b>${n.cobertura.criancas_unicas} · ${n.cobertura.matriculas}</b></div>
      <div class="dado"><span class="k">Áreas com interesse declarado</span><b>${n.exposicao.areas_com_interesse}</b></div>
      <div class="dado"><span class="k">Aspirações declaradas</span><b>${n.exposicao.aspiracoes_declaradas}</b></div>
      <div class="aviso neutro" style="margin-top:12px">Nenhuma criança aparece isolada. Recortes com menos de ${d.minimo_celula} crianças são agrupados ou suprimidos.</div>
      <div class="linha" style="margin-top:14px">
        <button class="btn cresce" data-acao="gerar-relatorio">${r ? 'Gerar de novo' : 'Gerar rascunho'}</button>
      </div>
    </div>` : `<div class="aviso calmo" style="margin-top:14px"><p>Escolha o período para ver a prévia.</p></div>`}

    ${r ? `
    <div class="cartao area-impressao" style="margin-top:14px">
      <div class="linha">
        <div class="cresce"><h2>${tipo === 'ciclo' ? 'Relatório do Ciclo' : 'Carta do trimestre'}</h2>
          <p class="sub">${esc(r.periodo_inicio)} a ${esc(r.periodo_fim)} · gerado em ${dataBR(r.gerado_em)}</p></div>
        <span class="selo ${r.status === 'publicado' ? 'ok' : 'pend'}">${r.status}</span>
      </div>

      <div class="aviso ${r.revisor_status === 'aprovado' ? 'calmo' : ''}" style="margin-top:12px">
        <h3>Revisor de sobre-alegação: ${esc(r.revisor_status)}</h3>
        <p>${esc(r.revisor_notas || 'Nenhum verbo causal forte e a ressalva metodológica está presente.')}</p>
      </div>

      ${r.blocos.map(b => `
        <div class="bloco-relatorio">
          <div class="numero">Bloco ${b.numero}</div>
          <h3>${esc(b.titulo)}</h3>
          ${b.destaque ? `<div class="destaque">${esc(b.destaque)}</div>` : ''}
          ${b.origem === 'modelo' ? `<div class="selo alerta" style="margin-bottom:8px">redigido por modelo local · confira antes de publicar</div>` : ''}
          <p>${esc(b.texto)}</p>
          ${b.origem === 'modelo' && b.texto_automatico ? `
            <details class="comparar">
              <summary>ver a versão automática deste bloco</summary>
              <p>${esc(b.texto_automatico)}</p>
              <p class="sub">Os números são os mesmos nas duas versões — a conferência garante isso.
                 O que pode ter mudado é a QUEM o número está ligado numa frase. É por isso que a
                 comparação existe: leia as duas antes de publicar.</p>
              <button class="btn pequeno fantasma" data-acao="usar-automatico" data-bloco="${b.numero}">Prefiro a versão automática</button>
            </details>` : ''}
          ${b.tabela?.length ? `<div class="rolagem" style="margin-top:10px"><table>
            <thead><tr>${Object.keys(b.tabela[0]).map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead>
            <tbody>${b.tabela.map(l => `<tr>${Object.values(l).map(v => `<td>${esc(v ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>` : ''}
        </div>`).join('')}

      <div class="suprimido">
        <b>Supressão aplicada antes da redação.</b>
        Mínimo de ${r.supressoes.minimo} crianças por recorte.
        ${r.supressoes.programas.length ? `Programas agrupados: ${esc(r.supressoes.programas.join(', '))}.` : ''}
        ${r.supressoes.areas.length ? `Áreas agrupadas: ${esc(r.supressoes.areas.join(', '))}.` : ''}
        ${r.supressoes.dose_publicavel ? '' : 'Bloco de dose não publicado neste período.'}
        ${r.supressoes.observacao_publicavel ? '' : 'Bloco de observação não publicado neste período.'}
      </div>
    </div>

    <div class="pilha">
      ${r.status === 'publicado'
        ? `<div class="aviso calmo"><h3>Publicado</h3><p>Publicado em ${dataBR(r.publicado_em)}. Para mudar, gere um período novo.</p></div>`
        : `<button class="btn largo" data-acao="publicar-relatorio" ${r.revisor_status !== 'aprovado' ? 'disabled' : ''}>Revisar e publicar</button>`}
      <button class="btn largo secundario" data-acao="baixar-rascunho">Baixar rascunho</button>
      <button class="btn largo fantasma" data-acao="imprimir">Imprimir</button>
    </div>` : ''}

    ${d.lista.length ? `<div class="cartao compacto" style="margin-top:14px">
      <h2>Gerados até agora</h2>
      <div class="pilha" style="margin-top:10px">
        ${d.lista.map(l => `<button class="item" data-acao="ir" data-href="#/relatorio?tipo=${l.tipo}&periodo=${l.periodo}">
          <div class="cresce"><div class="nome">${l.tipo === 'ciclo' ? 'Relatório do ciclo' : 'Carta'} · ${dataBR(l.periodo_inicio)} a ${dataBR(l.periodo_fim)}</div>
            <div class="meta">gerado em ${dataBR(l.gerado_em)}</div></div>
          <span class="selo ${l.status === 'publicado' ? 'ok' : 'pend'}">${l.status}</span>
        </button>`).join('')}
      </div></div>` : ''}

    <p class="rodape">Gerado a partir do que já foi registrado. Nada é publicado sem sua revisão.<br>
      Nenhum número no texto que não venha do banco. Nenhuma afirmação causal.</p>`;
}

// ======================================================================
// CONSULTA EM LINGUAGEM NATURAL (F15) — só a camada agregada.
// ======================================================================
async function telaPerguntarABase() {
  // As sugestões vêm ANTES da primeira pergunta. Até aqui elas só apareciam na
  // recusa: quem chegava tinha de errar uma vez para descobrir o que a base
  // sabe responder. O placeholder não repete nenhum chip — usa outra formulação
  // de propósito, para dizer que a pergunta não precisa ser copiada daqui.
  const { sugestoes } = await api('/api/consulta');
  app.innerHTML = cabecalhoRelatorio('consulta') + `
    <h1 style="margin-top:12px">Perguntar à base</h1>
    <p class="sub"><b>Camada agregada, nunca dado individual.</b> Fale ou escreva a pergunta. A resposta é montada com número vindo do banco — se eu não souber, eu digo que não sei.</p>
    <div class="cartao" style="margin-top:16px">
      ${(() => { const d = blocoDitado('pergunta', 'pergunta-ditado-estado'); return `
      <div class="linha" style="flex-wrap:nowrap">
        <input type="text" id="pergunta" class="cresce" placeholder="Ex.: qual é o limiar do alerta de ausência?" autocomplete="off" style="width:auto">
        ${d.botao}
      </div>
      ${d.estado}`; })()}
      <div class="linha" style="margin-top:12px"><button class="btn largo" data-acao="perguntar">Perguntar</button></div>
    </div>
    <div class="cartao compacto" style="margin-top:12px">
      <div class="lbl">O que a base sabe responder</div>
      <div style="margin-top:8px">${sugestoes.map(x =>
        `<button class="p off" data-acao="sugestao" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <p class="sub" style="margin-top:4px">Uma pergunta por assunto. Pode perguntar com as suas palavras — não precisa copiar daqui.</p>
    </div>
    <div id="resposta" class="pilha"></div>
    <p class="rodape">Dado individual de criança não é respondido aqui, em nenhuma formulação.</p>`;
  document.getElementById('pergunta')?.focus();
}

// ======================================================================
// INGESTÃO RETROATIVA (F7) — coordenação.
// ======================================================================
// ======================================================================
// PESSOAS — cadastro de equipe e de crianças (coordenação).
// A porta manual do item 2.8 do horizonte de ARQUITETURA.md: até aqui toda
// pessoa do Percurso nascia da seed ou de planilha. Uma por vez, com as
// guardas do domínio à vista em vez de escondidas atrás de um "salvo".
// ======================================================================
const cadastro = { trocaPendente: null };   // aviso do 409 de troca de turma

// `hoje()` do servidor não vale no `max` dos campos de data: o limite é o
// relógio de quem está com o celular na mão.
const hojeIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// ======================================================================
// PESSOAS (F2) — cadastro, arquivo e importação eram TRÊS telas e são o mesmo
// assunto: o elenco. Quem entra, quem saiu e o que veio de antes.
//
// As três continuam existindo como conteúdo; o que sumiu foi a necessidade de
// achar três portas diferentes para o mesmo assunto. A aba vive na URL para o
// link continuar apontando para o lugar certo.
// ======================================================================
const ABAS_PESSOAS = [
  ['equipe', 'Quem entra'],
  ['turmas', 'Turmas'],
  ['canais', 'Canais'],
  ['arquivo', 'Quem saiu'],
  ['importar', 'O que veio de antes'],
];

const cabecalhoPessoas = (ativa) => `
    <p class="kicker">Cadastro · o elenco do Instituto</p>
    <h1>Pessoas</h1>
    <div class="linha" style="margin-top:12px;flex-wrap:wrap;gap:8px">
      ${ABAS_PESSOAS.map(([k, rot]) => `<button class="btn pequeno ${k === ativa ? '' : 'fantasma'}"
        data-acao="ir" data-href="#/pessoas?aba=${k}" ${k === ativa ? 'aria-current="page"' : ''}>${rot}</button>`).join('')}
    </div>`;

// ======================================================================
// DIVULGAR (decisões 47, 48 e 50) — os grupos cadastrados, a fila de envio, o
// card do Instagram, a folha da turma e o passe para o celular.
//
// O PEDIDO E O QUE DELE É POSSÍVEL. Em 04/09/2026: *"ao clicar um botão não
// precise ficar depois clicando em cada grupo do WhatsApp, mas que os grupos já
// estejam pré-cadastrados no próprio artefato"*.
//
// A metade que não existe está medida em `docs/PESQUISA-WHATSAPP.md` e dita na
// própria tela: **não há como um site postar num grupo de WhatsApp existente**.
// A Groups API da Meta só cria grupos novos de até 8 pessoas com selo que quase
// ninguém tem; a Cloud API é 1-para-1; e as bibliotecas que postam em grupo
// violam os Termos, com o número como preço possível — e o número é o único
// canal do Instituto com as famílias.
//
// A metade que existe é onde estava o tempo dela: os grupos ficam cadastrados,
// o texto é montado UMA vez, a fila lembra onde ela parou, e o que saiu fica
// registrado. Sobra um toque por grupo — o que a Meta exige, e só ele.
//
// O QUE A SEGUNDA RODADA (decisão 50) TIROU DO CAMINHO — cada item era um
// lugar em que a fila de ontem quebrava sem avisar:
//   · o clipboard: `navigator.clipboard` não existe fora de HTTPS, e a fila
//     inteira dependia dele. Agora o texto vai DENTRO do link (`wa.me/?text=`),
//     e o WhatsApp abre já com a mensagem escrita — só falta escolher o grupo;
//   · o notebook: sem WhatsApp e sem `navigator.share`, a coordenação montava
//     a fila e não tinha para onde ir. O PASSE guarda a fila dez minutos no
//     servidor e um QR leva o celular direto a ela;
//   · o responsável que digita link: para entrar no grupo da turma, escaneia a
//     FOLHA DA TURMA colada na parede — QR gerado aqui, sem biblioteca;
//   · mandar duas vezes: o servidor diz quem já recebeu este conteúdo hoje, e
//     a tela desmarca esses por padrão;
//   · o Instagram só em quadrado: agora story (vertical) e carrossel (três
//     imagens de uma vez pela folha de compartilhar), com texto alternativo.
// ======================================================================
const CHAVE_DIVULGACAO = 'percurso_fila_divulgacao';

// Nome longo de propósito: `lerFila` já existe neste arquivo e é OUTRA fila —
// a dos POSTs que ficaram sem rede. Duas filas com o mesmo nome viram um bug
// que ninguém enxerga.
const lerDivulgacao = () => { try { return JSON.parse(localStorage.getItem(CHAVE_DIVULGACAO) || 'null'); } catch { return null; } };
const gravarDivulgacao = (f) => { try { localStorage.setItem(CHAVE_DIVULGACAO, JSON.stringify(f)); } catch { /* aba anônima */ } };
const limparDivulgacao = () => { try { localStorage.removeItem(CHAVE_DIVULGACAO); } catch { /* idem */ } };

const NO_CELULAR = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Copiar que não depende de HTTPS: tenta a API moderna e, sem ela, cai no
 *  caminho antigo (textarea + execCommand), que funciona em http na rede
 *  local — que é exatamente onde a API moderna não existe. */
async function copiarTexto(t) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(t); return true; } } catch { /* cai abaixo */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}

const linkWhatsAppComTexto = (t) => `https://wa.me/?text=${encodeURIComponent(t)}`;

rota(/^#\/divulgar(?=$|[?&])/, async () => {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const d = await api('/api/divulgar');
  // Chegou pelo QR do notebook: o passe vira a fila local, e o hash limpa para
  // o recarregar da página não tentar consumir um passe já consumido.
  if (q.get('passe')) {
    try {
      const r = await api(`/api/divulgar/passe?id=${encodeURIComponent(q.get('passe'))}`);
      if (r.fila?.tipo === 'card' && r.fila.card) r.fila.imagem = await desenharCard(r.fila.card, r.fila.formato || 'feed');
      gravarDivulgacao(r.fila);
      toast('A fila chegou do outro aparelho.', 'bom');
    } catch (e) { toast(e.message, 'ruim'); }
    history.replaceState(null, '', '#/divulgar');
  }
  ctx.divulgar = { ...d, fila: lerDivulgacao() };
  if (q.get('folha') === '1') return pintarFolhaDaTurma();
  pintarDivulgar();
});

function pintarDivulgar() {
  const d = ctx.divulgar;
  const fila = d.fila;
  const podeCadastrar = sessao.papel === 'coordenacao';
  const PUB = Object.fromEntries(d.publicos.map(p => [p.id, p]));

  app.innerHTML = `
    <p class="kicker">Coordenação · o que sai do Instituto</p>
    <h1>Divulgar</h1>
    <p class="sub">Os grupos já estão aqui. Você escolhe o que vai, marca para quem, e o WhatsApp abre
      com o texto escrito — resta escolher o grupo e enviar.</p>

    ${fila ? blocoFila(fila, d) : blocoMontar(d, PUB)}

    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Canais cadastrados</h2>
        <span class="sub">${d.canais.length}</span></div>
      <div class="pilha" style="margin-top:10px">
        ${d.canais.map(c => `<div class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:6px">
          <div class="linha">
            <div class="cresce"><div class="nome">${c.tipo === 'instagram' ? '◎' : '✆'} ${esc(c.nome)}</div>
              <div class="meta">${esc(PUB[c.publico]?.rotulo ?? c.publico)}${c.turma ? ` · ${esc(c.turma)}` : ''}${
                c.ultimo_envio ? ` · último envio ${dataBR(c.ultimo_envio.slice(0, 10))}` : ' · nunca usado'}</div></div>
            ${podeCadastrar ? `<button class="btn pequeno fantasma" data-acao="canal-arquivar" data-id="${c.id}">Arquivar</button>` : ''}
          </div>
          ${c.observacao ? `<p class="sub" style="margin:0">${esc(c.observacao)}</p>` : ''}
        </div>`).join('') || '<p class="vazio">Nenhum canal cadastrado ainda.</p>'}
      </div>
      <div class="linha" style="margin-top:12px;gap:8px">
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/divulgar?folha=1">Folha da turma para imprimir</button>
        <span class="sub">QR de cada grupo e do Instagram: cola na parede, o responsável escaneia e entra.</span>
      </div>
      ${podeCadastrar ? `<button class="btn pequeno fantasma" data-acao="ir" data-href="#/pessoas?aba=canais"
        style="margin-top:10px">Cadastrar ou editar grupos e perfil</button>` : ''}
    </div>

    ${d.recentes.length ? `<details class="cartao compacto" style="margin-top:14px">
      <summary style="cursor:pointer;font-weight:600">O que já saiu · ${d.recentes.length}</summary>
      <p class="sub" style="margin-top:8px">O Percurso não envia — quem envia é você. O registro de que
        saiu, para onde e por quem fica aqui, para "já mandei para os pais?" ter resposta que não seja a memória.</p>
      <div class="pilha" style="margin-top:8px">
        ${d.recentes.map(r => `<div class="dado">
          <span class="k">${esc(r.canal)}</span>
          <b style="font-weight:500">${esc(d.conteudos[r.conteudo]?.rotulo ?? r.conteudo)} · ${dataBR(r.em.slice(0, 10))}</b></div>`).join('')}
      </div>
    </details>` : ''}

    <p class="rodape">Por que não um botão só: nenhum site consegue postar num grupo de WhatsApp já
      existente. A API oficial da Meta só cria grupos novos de até 8 pessoas, e as bibliotecas que
      postam em grupo violam os Termos — o preço possível é o número do Instituto, que é o único canal
      com as famílias. O que dá para tirar do caminho, o Percurso tirou. <b>O único caminho legítimo
      para "um envio, todos os responsáveis" é do próprio WhatsApp:</b> transformar os grupos numa
      <b>Comunidade</b>, cujo grupo de avisos alcança todos os membros de todos os grupos de uma vez —
      cadastre esse grupo de avisos aqui como público "Responsáveis da turma", sem turma.</p>`;

}

/** Passo 1: o que vai sair, e para quem. */
function blocoMontar(d, PUB) {
  const conteudos = [
    ...d.recados.map(r => ({ chave: `recado:${r.turma_id}:${r.data}`, tipo: 'recado',
      rotulo: `Recado · ${r.turma}`, detalhe: dataBR(r.data) })),
    ...d.publicados.map(p => ({ chave: `carta:${p.tipo}:${p.periodo}`, tipo: 'carta',
      rotulo: p.rotulo, detalhe: `publicado em ${dataBR((p.publicado_em || '').slice(0, 10))}` })),
    { chave: 'card:feed', tipo: 'card', rotulo: 'Card do período · quadrado',
      detalhe: 'feed do Instagram e grupos de apoiadores' },
    { chave: 'card:story', tipo: 'card', rotulo: 'Card do período · story',
      detalhe: 'vertical, para o story do Instagram' },
  ];
  return `
    <div class="cartao" style="margin-top:16px">
      <h2>O que vai sair</h2>
      <p class="sub">Só o que já existe: o recado nasce do encontro registrado, e carta e relatório
        precisam estar <b>publicados</b> — texto que não passou pelo revisor não sai daqui.</p>
      <div class="pilha" style="margin-top:10px">
        ${conteudos.map((c, i) => `<button class="item" data-acao="div-conteudo" data-chave="${esc(c.chave)}"
          ${i === 0 ? 'aria-current="true"' : ''}>
          <div class="cresce"><div class="nome">${esc(c.rotulo)}</div>
            <div class="meta">${esc(c.detalhe)}</div></div>
          <span class="seta" aria-hidden="true">›</span>
        </button>`).join('')}
      </div>
      ${d.publicados.length ? '' : `<p class="sub" style="margin-top:10px">Nenhuma carta publicada ainda —
        quem publica é a diretoria, em Relatório. O card do período não depende disso: ele é montado
        agora, do número que já está no banco.</p>`}
    </div>`;
}

/** Passo 2: a fila, que é o que devolve o tempo. */
function blocoFila(fila, d) {
  const feitos = fila.canais.filter(c => c.feito).length;
  const proximo = fila.canais.find(c => !c.feito);
  const textoLink = fila.texto_whatsapp || fila.texto;
  return `
    <div class="cartao" style="margin-top:16px">
      <div class="linha"><h2 class="cresce">${esc(fila.rotulo)}</h2>
        <span class="selo ${feitos === fila.canais.length ? 'ok' : 'pend'}">${feitos} de ${fila.canais.length}</span></div>
      ${barra(Math.round((feitos / fila.canais.length) * 100), feitos === fila.canais.length)}
      ${fila.imagem ? `<img src="${fila.imagem}" alt="${esc(fila.alt || 'Card do período')}" style="width:100%;border-radius:10px;margin-top:12px;${fila.formato === 'story' ? 'max-height:480px;object-fit:contain;background:#000' : ''}">` : `
        <div class="cartao" style="margin-top:12px;background:var(--fundo)">
          <pre id="div-texto" style="white-space:pre-wrap;font:inherit;line-height:1.55;margin:0">${esc(fila.texto)}</pre>
        </div>`}
      <div class="pilha" style="margin-top:12px">
        ${fila.imagem ? `
          <button class="btn largo secundario" data-acao="div-compartilhar">Compartilhar pelo celular</button>
          <button class="btn largo fantasma" data-acao="div-carrossel">Compartilhar como carrossel (3 imagens)</button>
          <div class="linha" style="gap:8px">
            <button class="btn pequeno fantasma cresce" data-acao="div-baixar">Baixar a imagem</button>
            <button class="btn pequeno fantasma cresce" data-acao="div-copiar-imagem">Copiar a imagem</button>
            <button class="btn pequeno fantasma cresce" data-acao="div-copiar">Copiar a legenda</button>
          </div>
          <details><summary style="cursor:pointer;font-size:13px;color:var(--tinta-fraca)">Texto alternativo (acessibilidade)</summary>
            <p class="sub" style="margin-top:6px">${esc(fila.alt || '')}</p>
            <button class="btn pequeno fantasma" data-acao="div-copiar-alt" style="margin-top:6px">Copiar o texto alternativo</button>
          </details>` : `
          <button class="btn largo fantasma" data-acao="div-copiar">Copiar o texto</button>`}
        ${NO_CELULAR ? '' : `<button class="btn largo fantasma" data-acao="div-passe">Passar para o celular (QR)</button>`}
      </div>
      <p class="sub" style="margin-top:10px">${fila.imagem
        ? 'No celular, "Compartilhar" abre a folha do sistema com a imagem e a legenda — o Instagram e o WhatsApp aparecem lá. No notebook, baixe a imagem ou passe para o celular.'
        : 'Cada botão abaixo abre o WhatsApp já com o texto escrito: escolha o grupo e envie. O Percurso marca aqui quais já foram.'}</p>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>Onde colar</h2>
      <div class="pilha" style="margin-top:10px">
        ${fila.canais.map(c => `<div class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:8px${
            proximo && proximo.id === c.id ? ';border-color:var(--vermelho)' : ''}">
          <div class="linha">
            <div class="cresce"><div class="nome">${esc(c.nome)}</div>
              <div class="meta">${c.feito ? 'já enviado' : proximo && proximo.id === c.id ? 'o próximo' : 'na fila'}${
                c.ja_hoje ? ' · <b>já recebeu isto hoje</b>' : ''}</div></div>
            <span class="selo ${c.feito ? 'ok' : 'pend'}">${c.feito ? '✓' : fila.canais.indexOf(c) + 1}</span>
          </div>
          <div class="linha" style="gap:8px;flex-wrap:wrap">
            ${c.tipo === 'instagram' ? `
              <a class="btn pequeno ${c.feito ? 'fantasma' : ''} cresce" href="${esc(c.endereco)}" target="_blank" rel="noopener"
                data-acao="div-abrir" data-id="${c.id}" data-instagram="${esc(c.endereco.replace('https://instagram.com/', ''))}"
                style="text-align:center">Abrir o perfil</a>
              ${NO_CELULAR && fila.imagem ? `<a class="btn pequeno fantasma" href="instagram://story-camera" data-acao="div-abrir" data-id="${c.id}">Abrir a câmera do story</a>` : ''}` : `
              <a class="btn pequeno ${c.feito ? 'fantasma' : ''} cresce" href="${linkWhatsAppComTexto(textoLink)}" target="_blank" rel="noopener"
                data-acao="div-abrir" data-id="${c.id}" style="text-align:center">Abrir com o texto pronto</a>
              <a class="btn pequeno fantasma" href="${esc(c.endereco)}" target="_blank" rel="noopener"
                data-acao="div-abrir" data-id="${c.id}">Abrir o grupo</a>`}
            ${c.feito ? `<button class="btn pequeno fantasma" data-acao="div-desfazer" data-id="${c.id}">Desfazer</button>` : ''}
          </div>
        </div>`).join('')}
      </div>
      <div class="linha" style="margin-top:12px">
        <button class="btn pequeno fantasma cresce" data-acao="div-encerrar">${
          feitos === fila.canais.length ? 'Terminei' : 'Cancelar este envio'}</button>
      </div>
    </div>`;
}

// ----------------------------------------------------------------------
// A FOLHA DA TURMA (decisão 50): QR de cada grupo e do Instagram, para
// imprimir e colar na parede. É a porta de ENTRADA do responsável — a que
// digitar um link nunca foi.
// ----------------------------------------------------------------------
function pintarFolhaDaTurma() {
  const d = ctx.divulgar;
  const PUB = Object.fromEntries(d.publicos.map(p => [p.id, p]));
  const grupos = d.canais.filter(c => c.tipo === 'whatsapp' && c.publico === 'pais');
  const outros = d.canais.filter(c => !(c.tipo === 'whatsapp' && c.publico === 'pais'));
  const bloco = (c) => `
    <div class="folha-item">
      ${svgQR(c.endereco, { modulo: 5 })}
      <div class="folha-texto">
        <b>${esc(c.nome)}</b>
        <span>${esc(PUB[c.publico]?.rotulo ?? c.publico)}${c.turma ? ` · ${esc(c.turma)}` : ''}</span>
        <small>${c.tipo === 'instagram' ? 'Abra a câmera do celular e aponte: o Instagram abre no perfil.' : 'Abra a câmera do celular e aponte: o WhatsApp abre no grupo.'}</small>
        <code>${esc(c.tipo === 'instagram' ? c.destino : c.endereco)}</code>
      </div>
    </div>`;
  app.innerHTML = `
    <div class="nao-imprime">
      <p class="kicker">Coordenação · para colar na parede</p>
      <h1>Folha da turma</h1>
      <p class="sub">Imprima e cole onde os responsáveis passam. Quem aponta a câmera do celular para o
        QR entra no grupo sem digitar nada. O QR é gerado aqui, sem serviço externo: o link não
        passa por ninguém.</p>
      <div class="linha" style="gap:8px;margin:12px 0">
        <button class="btn secundario" data-acao="div-imprimir">Imprimir</button>
        <button class="btn fantasma" data-acao="ir" data-href="#/divulgar">Voltar</button>
      </div>
    </div>
    <div class="folha">
      <div class="folha-cabecalho">
        <b>Instituto Ebenézer</b>
        <span>Os grupos de WhatsApp das turmas${outros.some(c => c.tipo === 'instagram') ? ' e o nosso Instagram' : ''}</span>
      </div>
      ${grupos.map(bloco).join('') || '<p class="vazio">Nenhum grupo de responsáveis cadastrado.</p>'}
      ${outros.filter(c => c.tipo === 'instagram').map(bloco).join('')}
      <p class="folha-rodape">No grupo vai só o recado da turma — presença em contagens, o que foi feito, o próximo encontro. Nunca o nome de uma criança ligado a um fato.</p>
    </div>`;
}

// ----------------------------------------------------------------------
// Passo 2 de Divulgar: escolher para quem, e montar a fila.
// ----------------------------------------------------------------------
async function escolherCanais(chave) {
  const d = ctx.divulgar;
  const [tipo] = chave.split(':');
  const elegiveis = d.canais.filter(c => (d.publicos.find(p => p.id === c.publico)?.pode ?? []).includes(tipo));
  if (!elegiveis.length) {
    toast(`Nenhum canal cadastrado pode receber "${d.conteudos[tipo]?.rotulo ?? tipo}".`, 'ruim');
    return;
  }
  // Um recado é de UMA turma: só os grupos daquela turma (e os que não são de
  // turma) entram pré-marcados. Mandar o recado da Vivência para o grupo do
  // Reforço é o erro que a pressa do sábado produz.
  const turmaDoRecado = tipo === 'recado' ? Number(chave.split(':')[1]) : null;
  const referencia = referenciaDe(chave);
  // E o segundo erro da pressa: mandar duas vezes. O servidor sabe quem já
  // recebeu isto hoje; esses vêm desmarcados, com o motivo escrito.
  let jaHoje = [];
  try { jaHoje = (await api(`/api/divulgar/ja-recebeu?conteudo=${tipo}&referencia=${encodeURIComponent(referencia ?? '')}&desde=${encodeURIComponent(inicioDeHojeIso())}`)).canal_ids; }
  catch { /* sem rede: segue sem a trava, que é aviso e não proibição */ }
  const marcado = (c) => !jaHoje.includes(c.id) && (tipo !== 'recado' || c.turma_id == null || c.turma_id === turmaDoRecado);

  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dv">
      <h2 id="dv">Para quem vai</h2>
      <p>${esc(d.conteudos[tipo]?.rotulo ?? tipo)}. Só aparecem os canais cujo público pode receber isto.</p>
      <div class="pilha" style="margin-top:12px;max-height:46vh;overflow:auto">
        ${elegiveis.map(c => `<label class="item" style="cursor:pointer">
          <input type="checkbox" data-canal="${c.id}" ${marcado(c) ? 'checked' : ''}
            style="width:auto;min-height:0;margin-right:10px">
          <div class="cresce"><div class="nome">${esc(c.nome)}</div>
            <div class="meta">${esc(d.publicos.find(p => p.id === c.publico)?.rotulo ?? c.publico)}${
              c.turma ? ` · ${esc(c.turma)}` : ''}${jaHoje.includes(c.id) ? ' · <b>já recebeu isto hoje</b>' : ''}</div></div>
        </label>`).join('')}
      </div>
      <p class="sub" id="dv-erro" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></p>
      <div class="linha" style="margin-top:16px">
        <button class="btn cresce" data-acao="dv-ok" type="button">Preparar o envio</button>
        <button class="btn secundario cresce" data-acao="dv-cancelar" type="button">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);

  veu.addEventListener('click', comErro(async (e) => {
    const a2 = e.target.dataset?.acao;
    if (a2 === 'dv-cancelar' || e.target === veu) { veu.remove(); return; }
    if (a2 !== 'dv-ok') return;
    const ids = [...veu.querySelectorAll('input[data-canal]:checked')].map(i => Number(i.dataset.canal));
    const erro = veu.querySelector('#dv-erro');
    if (!ids.length) { erro.textContent = 'Marque pelo menos um canal.'; erro.style.display = 'block'; return; }
    e.target.disabled = true;
    try { await montarFila(chave, ids.map(id => ({ ...elegiveis.find(c => c.id === id), ja_hoje: jaHoje.includes(id) }))); veu.remove(); }
    catch (err) { e.target.disabled = false; erro.textContent = err.message; erro.style.display = 'block'; }
  }));
}

// A referência do disparo tem UMA fonte. Ontem ela era calculada em dois
// lugares com duas formas ("turma 6 · data" ao perguntar quem já recebeu, e
// "Vivência · Sábado manhã · data" ao registrar), e a trava de envio duplicado
// nunca casava — passava verde na tela e não protegia ninguém.
const referenciaDe = (chave) => {
  const [tipo, a, b] = chave.split(':');
  if (tipo === 'recado') {
    const r = ctx.divulgar?.recados?.find(x => String(x.turma_id) === a && x.data === b);
    return `${r?.turma ?? `turma ${a}`} · ${b}`;
  }
  if (tipo === 'carta') return b;
  return periodoPadraoDoCard();
};
// Meia-noite LOCAL em ISO: "hoje" é o dia de quem manda, não o de Greenwich.
// Um envio às 21h de sábado em São Paulo já é domingo em UTC.
const inicioDeHojeIso = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };

async function montarFila(chave, canais) {
  const d = ctx.divulgar;
  const [tipo, a, b] = chave.split(':');
  let texto = '', textoWhatsApp = '', rotulo = '', imagem = null, periodo = null, referencia = referenciaDe(chave);
  let card = null, formato = null, alt = null;

  if (tipo === 'recado') {
    const r = await api(`/api/recado?turma_id=${a}&data=${b}`);
    texto = r.texto; textoWhatsApp = r.texto_whatsapp || r.texto; rotulo = `Recado · ${r.turma.nome}`;
  } else if (tipo === 'carta') {
    const p = d.publicados.find(x => x.tipo === a && x.periodo === b);
    if (!p) throw new Error('Esse texto não está mais publicado.');
    texto = p.texto; textoWhatsApp = p.texto; rotulo = p.rotulo;
  } else {
    formato = a === 'story' ? 'story' : 'feed';
    periodo = referencia;
    card = await api(`/api/divulgar/card?periodo=${periodo}`);
    imagem = await desenharCard(card, formato);
    texto = card.legenda; textoWhatsApp = card.legenda;
    rotulo = `Card · ${card.rotulo}${formato === 'story' ? ' · story' : ''}`;
    alt = textoAlternativo(card);
  }

  // O texto é copiado UMA vez, aqui — e se o clipboard não existir (http na
  // rede local), a fila não depende dele: o link já leva o texto dentro.
  await copiarTexto(textoWhatsApp || texto);

  const fila = { chave, tipo, rotulo, texto, texto_whatsapp: textoWhatsApp, imagem, periodo, referencia, card, formato, alt,
    canais: canais.map(c => ({ id: c.id, nome: c.nome, tipo: c.tipo, endereco: c.endereco, feito: false, ja_hoje: !!c.ja_hoje })) };
  gravarDivulgacao(fila);
  ctx.divulgar.fila = fila;
  pintarDivulgar();
  toast(imagem ? 'Card pronto. Compartilhe, baixe ou passe para o celular.' : 'Pronto: cada botão abre o WhatsApp com o texto escrito.', 'bom');
}

const periodoPadraoDoCard = () => {
  const h = hojeIso();
  const ano = h.slice(0, 4);
  return Number(h.slice(5, 7)) <= 6 ? `${ano}-01-01..${ano}-06-30` : `${ano}-07-01..${ano}-12-31`;
};

/** Texto alternativo do card — a imagem lida em voz alta por quem não a vê.
 *  Determinístico, do mesmo agregado; o Instagram aceita colar no campo "alt". */
function textoAlternativo(c) {
  return `Card do Instituto Ebenézer, ${c.rotulo}: ` + c.linhas.map(l => `${l.valor} ${l.rotulo}`).join('; ')
    + `. ${c.ressalva} A leitura é de associação: fatores externos não foram isolados.`;
}

/** Marca que este canal já recebeu — e registra no servidor, que é o que dá
 *  resposta a "já mandei para os pais?" depois que a tela fechar. */
function marcarEnviado(id) {
  const f = ctx.divulgar?.fila;
  const c = f?.canais.find(x => x.id === id);
  if (!c || c.feito) return;
  c.feito = true;
  gravarDivulgacao(f);
  postComFila('/api/disparo', { canal_id: id, conteudo: f.tipo, referencia: f.referencia })
    .catch(() => { /* a fila offline reenvia; a marca local já valeu */ });
  setTimeout(pintarDivulgar, 60);
}

const dataUrlParaArquivo = async (dataUrl, nome) => new File([await (await fetch(dataUrl)).blob()], nome, { type: 'image/png' });

/** Web Share: no celular ele abre a folha do sistema, onde WhatsApp e Instagram
 *  aparecem. Continua sendo um toque por destino — mas com o arquivo junto, que
 *  o link de convite não leva. `carrossel` manda três imagens de uma vez: o
 *  Instagram as recebe como um post único de várias páginas. */
async function compartilharDivulgacao({ carrossel = false } = {}) {
  const f = ctx.divulgar?.fila;
  if (!f) return;
  try {
    if (f.imagem && navigator.canShare) {
      const arquivos = carrossel && f.card
        ? await Promise.all((await desenharCarrossel(f.card)).map((u, i) => dataUrlParaArquivo(u, `percurso-${f.periodo}-${i + 1}.png`)))
        : [await dataUrlParaArquivo(f.imagem, `percurso-${f.periodo || 'card'}.png`)];
      if (navigator.canShare({ files: arquivos })) {
        await navigator.share({ files: arquivos, text: f.texto, title: f.rotulo });
        return;
      }
    }
    if (navigator.share) { await navigator.share({ text: f.texto_whatsapp || f.texto, title: f.rotulo }); return; }
    toast('Este navegador não abre a folha de compartilhar. Use "Passar para o celular" ou baixe a imagem.');
  } catch (e) {
    if (e?.name !== 'AbortError') toast('O compartilhamento foi cancelado ou não é suportado aqui.');
  }
}

/** O passe: a fila vai para o servidor por dez minutos e volta num QR. */
async function passarParaCelular() {
  const f = ctx.divulgar?.fila;
  if (!f) return;
  const r = await post('/api/divulgar/passe', { fila: { ...f, imagem: null } });
  const url = `${location.origin}/#/divulgar?passe=${r.id}`;
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pq">
      <h2 id="pq">Passar para o celular</h2>
      <p>Aponte a câmera do celular. Ele abre o Percurso já nesta fila — entre com a sua senha e
        continue de lá. Vale por ${Math.round(r.expira_em_s / 60)} minutos e por uma leitura.</p>
      <div style="display:flex;justify-content:center;margin:14px 0"><canvas id="passe-qr" aria-label="QR do passe"></canvas></div>
      <p class="sub" style="word-break:break-all;font-size:12px">${esc(url)}</p>
      <div class="linha" style="margin-top:14px">
        <button class="btn secundario cresce" data-acao="passe-fechar" type="button">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);
  desenharQR(veu.querySelector('#passe-qr'), url, { escala: 5 });
  veu.addEventListener('click', (e) => {
    if (e.target.dataset?.acao === 'passe-fechar' || e.target === veu) veu.remove();
  });
}

// ----------------------------------------------------------------------
// O CARD DO INSTAGRAM (decisão 48), desenhado no próprio navegador.
//
// Canvas puro: nenhuma biblioteca, nenhum servidor de imagem, nada de npm — a
// decisão 1 continua de pé. E o conteúdo é o mesmo agregado que já passou pela
// supressão de célula pequena e pelo revisor de sobre-alegação: o que não pode
// sair no relatório também não sai aqui.
//
// Três formas do mesmo card (decisão 50): quadrado (feed), vertical (story) e
// carrossel — três quadrados, um número em cada, que o Instagram junta num
// post de várias páginas quando chegam juntos pela folha de compartilhar.
// ----------------------------------------------------------------------
const CARD_CORES = { fundo: '#F4EFE5', faixa: '#B0392C', tinta: '#2E2A24', fraca: '#8B8478', ouro: '#E6A400', miolo: '#6B4410' };
const fonteCard = (px, peso = '400') => `${peso} ${px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

function girassol(g, x, y, r) {
  g.fillStyle = CARD_CORES.ouro; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = CARD_CORES.miolo; g.beginPath(); g.arc(x, y, r * 0.43, 0, Math.PI * 2); g.fill();
}

async function desenharCard(c, formato = 'feed') {
  const L = 1080, A = formato === 'story' ? 1920 : 1080;
  const cv = document.createElement('canvas');
  cv.width = L; cv.height = A;
  const g = cv.getContext('2d');
  g.fillStyle = CARD_CORES.fundo; g.fillRect(0, 0, L, A);
  g.fillStyle = CARD_CORES.faixa; g.fillRect(0, 0, L, 14);

  // No story a zona de cima e a de baixo ficam sob a interface do Instagram
  // (nome do perfil, caixa de resposta): o conteúdo começa mais abaixo e os
  // números crescem, porque a peça é vista de longe e em movimento.
  const topo = formato === 'story' ? 330 : 130;
  const esc = formato === 'story' ? 1.25 : 1;
  g.fillStyle = CARD_CORES.fraca; g.font = fonteCard(30 * esc, '600');
  g.fillText('INSTITUTO EBENÉZER · JARDIM ÂNGELA', 84, topo);
  g.fillStyle = CARD_CORES.tinta; g.font = fonteCard(46 * esc, '700');
  g.fillText(c.rotulo, 84, topo + 66 * esc);

  let y = topo + 190 * esc;
  for (const linha of c.linhas) {
    g.fillStyle = CARD_CORES.faixa; g.font = fonteCard(104 * esc, '700');
    g.fillText(linha.valor, 84, y);
    const largura = g.measureText(linha.valor).width;
    g.fillStyle = CARD_CORES.tinta; g.font = fonteCard(36 * esc, '400');
    g.fillText(linha.rotulo, 84 + largura + 24, y - 8);
    y += 148 * esc;
  }

  // A ressalva metodológica vai NA IMAGEM, não só na legenda: legenda se corta,
  // imagem é o que circula quando alguém salva e reenvia.
  g.fillStyle = CARD_CORES.fraca; g.font = fonteCard(27 * esc, '400');
  let ly = y + 30;
  for (const l of quebrar(g, c.ressalva, L - 168)) { g.fillText(l, 84, ly); ly += 38 * esc; }
  g.font = fonteCard(25 * esc, '400');
  for (const l of quebrar(g, 'A leitura é de associação: fatores externos não foram isolados.', L - 168)) {
    g.fillText(l, 84, ly + 14); ly += 36 * esc;
  }
  girassol(g, L - 132, A - 132, 46);
  return cv.toDataURL('image/png');
}

/** Três quadrados, um número em cada — a versão em carrossel do mesmo card. */
async function desenharCarrossel(c) {
  const L = 1080;
  const saida = [];
  c.linhas.forEach((linha, i) => {
    const cv = document.createElement('canvas');
    cv.width = L; cv.height = L;
    const g = cv.getContext('2d');
    g.fillStyle = CARD_CORES.fundo; g.fillRect(0, 0, L, L);
    g.fillStyle = CARD_CORES.faixa; g.fillRect(0, 0, L, 14);
    g.fillStyle = CARD_CORES.fraca; g.font = fonteCard(30, '600');
    g.fillText(`INSTITUTO EBENÉZER · ${i + 1} DE ${c.linhas.length}`, 84, 130);
    g.fillStyle = CARD_CORES.tinta; g.font = fonteCard(40, '700');
    g.fillText(c.rotulo, 84, 196);
    g.fillStyle = CARD_CORES.faixa; g.font = fonteCard(260, '700');
    g.fillText(linha.valor, 84, 560);
    g.fillStyle = CARD_CORES.tinta; g.font = fonteCard(52, '400');
    let y = 660;
    for (const l of quebrar(g, linha.rotulo, L - 168)) { g.fillText(l, 84, y); y += 64; }
    g.fillStyle = CARD_CORES.fraca; g.font = fonteCard(26, '400');
    let ly = L - 190;
    for (const l of quebrar(g, i === c.linhas.length - 1 ? c.ressalva : 'Nenhuma criança aparece sozinha: só agregado, com supressão de grupos pequenos.', L - 260)) { g.fillText(l, 84, ly); ly += 36; }
    girassol(g, L - 132, L - 132, 46);
    saida.push(cv.toDataURL('image/png'));
  });
  return saida;
}

function quebrar(g, texto, largura) {
  const palavras = String(texto).split(/\s+/);
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (g.measureText(tentativa).width > largura && atual) { linhas.push(atual); atual = p; }
    else atual = tentativa;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

rota(/^#\/pessoas/, async () => {
  const aba = (location.hash.match(/[?&]aba=([a-z]+)/) || [])[1] || 'equipe';
  if (aba === 'arquivo') return telaQuemSaiu();
  if (aba === 'importar') return telaOQueVeioDeAntes();
  if (aba === 'turmas') return telaTurmas();
  if (aba === 'canais') return telaCanais();
  return telaQuemEntra();
});

// ======================================================================
// CANAIS (decisão 50) — o cadastro dos grupos de WhatsApp e do perfil do
// Instagram, na tela de cadastro, onde se procura cadastro.
//
// A primeira versão escondia isto num "detalhes" recolhido no fim de
// Divulgar, depois da fila e da lista. O dono do produto não achou — e quem
// não acha, não cadastra. Cadastro mora em Pessoas, ao lado de Quem entra e
// Turmas; Divulgar fica só com o envio.
// ======================================================================
async function telaCanais() {
  const d = await api('/api/canais?todos=1');
  const PUB = Object.fromEntries(d.publicos.map(p => [p.id, p]));
  const vivos = d.canais.filter(c => c.ativo);
  const arquivados = d.canais.filter(c => !c.ativo);
  const opcoesTipo = (sel) => d.tipos.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.rotulo)}</option>`).join('');
  const opcoesPub = (sel) => d.publicos.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.rotulo)}</option>`).join('');
  const opcoesTurma = (sel) => `<option value="">Não é de uma turma</option>` + d.turmas.map(t =>
    `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.nome)}</option>`).join('');
  const regra = (pub) => PUB[pub] ? `Pode receber: ${PUB[pub].pode.map(k => d.conteudos[k]?.rotulo ?? k).join(', ')}. ${PUB[pub].nao}` : '';

  app.innerHTML = cabecalhoPessoas('canais') + `
    <p class="sub" style="margin-top:12px">Os grupos de WhatsApp e o perfil de Instagram por onde o Instituto
      fala. O <b>público</b> não é etiqueta: é ele que decide o que pode ser enviado para cada um — e a recusa
      é do servidor, não do botão.</p>

    <div class="cartao" style="margin-top:16px">
      <h2>Novo grupo ou perfil</h2>
      <label class="rot-campo" for="cn-tipo">Tipo</label>
      <select id="cn-tipo">${opcoesTipo(null)}</select>
      <label class="rot-campo" for="cn-nome">Nome <span class="sub">(o que você chama ele)</span></label>
      <input type="text" id="cn-nome" placeholder="Ex.: Responsáveis · Vivência Sábado manhã" autocomplete="off">
      <label class="rot-campo" for="cn-publico">Quem está desse lado</label>
      <select id="cn-publico">${opcoesPub(null)}</select>
      <p class="sub" id="cn-regra" style="margin-top:6px"></p>
      <label class="rot-campo" for="cn-turma">Turma <span class="sub">(se o grupo é de uma turma só)</span></label>
      <select id="cn-turma">${opcoesTurma(null)}</select>
      <label class="rot-campo" for="cn-destino">Destino</label>
      <input type="text" id="cn-destino" placeholder="https://chat.whatsapp.com/…" autocomplete="off">
      <p class="sub" id="cn-ajuda" style="margin-top:6px">No WhatsApp: abra o grupo → Dados do grupo → Convidar por
        link → Copiar. É esse link que o Percurso guarda — nunca o telefone de ninguém.</p>
      <label class="rot-campo" for="cn-obs">Observação <span class="sub">(opcional)</span></label>
      <input type="text" id="cn-obs" placeholder="Ex.: só o recado da turma, nunca lista com nome" autocomplete="off">
      <button class="btn" data-acao="canal-criar" style="margin-top:14px">Cadastrar</button>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Canais hoje</h2><span class="sub">${vivos.length}</span></div>
      <div class="pilha" style="margin-top:10px">
        ${vivos.map(c => `<details class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:8px">
          <summary style="cursor:pointer;list-style:none">
            <div class="linha">
              <div class="cresce"><div class="nome">${c.tipo === 'instagram' ? '◎' : '✆'} ${esc(c.nome)}</div>
                <div class="meta">${esc(PUB[c.publico]?.rotulo ?? c.publico)}${c.turma ? ` · ${esc(c.turma)}` : ''}${
                  c.ultimo_envio ? ` · último envio ${dataBR(c.ultimo_envio.slice(0, 10))}` : ' · nunca usado'}</div></div>
              <span class="sub">editar ›</span>
            </div>
          </summary>
          <label class="rot-campo" for="ce-nome-${c.id}">Nome</label>
          <input type="text" id="ce-nome-${c.id}" value="${esc(c.nome)}" autocomplete="off">
          <label class="rot-campo" for="ce-pub-${c.id}">Quem está desse lado</label>
          <select id="ce-pub-${c.id}">${opcoesPub(c.publico)}</select>
          ${c.tipo === 'instagram' ? '' : `<label class="rot-campo" for="ce-turma-${c.id}">Turma</label>
          <select id="ce-turma-${c.id}">${opcoesTurma(c.turma_id)}</select>`}
          <label class="rot-campo" for="ce-dest-${c.id}">Destino</label>
          <input type="text" id="ce-dest-${c.id}" value="${esc(c.destino)}" autocomplete="off">
          <label class="rot-campo" for="ce-obs-${c.id}">Observação</label>
          <input type="text" id="ce-obs-${c.id}" value="${esc(c.observacao || '')}" autocomplete="off">
          <div class="linha" style="margin-top:10px;gap:8px">
            <button class="btn pequeno secundario" data-acao="canal-editar" data-id="${c.id}">Salvar</button>
            <button class="btn pequeno fantasma" data-acao="canal-arquivar" data-id="${c.id}">Arquivar</button>
          </div>
        </details>`).join('') || '<p class="vazio">Nenhum canal cadastrado ainda.</p>'}
      </div>
      <p class="sub" style="margin-top:12px">Canal não se apaga: o registro do que saiu aponta para ele. Arquivar tira da
        lista de envio e mantém o histórico.</p>
    </div>

    ${arquivados.length ? `<details class="cartao compacto" style="margin-top:14px">
      <summary style="cursor:pointer;font-weight:600">Arquivados · ${arquivados.length}</summary>
      <div class="pilha" style="margin-top:10px">
        ${arquivados.map(c => `<div class="item" style="cursor:default">
          <div class="cresce"><div class="nome">${esc(c.nome)}</div>
            <div class="meta">${esc(PUB[c.publico]?.rotulo ?? c.publico)}${c.turma ? ` · ${esc(c.turma)}` : ''}</div></div>
          <button class="btn pequeno fantasma" data-acao="canal-reativar" data-id="${c.id}">Trazer de volta</button>
        </div>`).join('')}
      </div>
    </details>` : ''}

    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">E o envio?</h2></div>
      <p class="sub">Cadastrado o canal, o envio acontece em <b>Divulgar</b> — recado, carta e card do
        período — e a professora manda o recado da própria turma pela tela dela.</p>
      <button class="btn pequeno secundario" data-acao="ir" data-href="#/divulgar" style="margin-top:10px">Ir para Divulgar</button>
    </div>`;

  const tipo = document.getElementById('cn-tipo');
  const publico = document.getElementById('cn-publico');
  const sincronizar = () => {
    document.getElementById('cn-regra').textContent = regra(publico.value);
    document.getElementById('cn-destino').placeholder = tipo.value === 'instagram' ? '@perfil' : 'https://chat.whatsapp.com/…';
    document.getElementById('cn-ajuda').textContent = tipo.value === 'instagram'
      ? 'O @ do perfil, como aparece no Instagram. O perfil é da organização inteira — não se amarra a uma turma.'
      : 'No WhatsApp: abra o grupo → Dados do grupo → Convidar por link → Copiar. É esse link que o Percurso guarda — nunca o telefone de ninguém.';
    document.getElementById('cn-turma').disabled = tipo.value === 'instagram';
  };
  tipo.addEventListener('change', sincronizar);
  publico.addEventListener('change', sincronizar);
  sincronizar();
}


// ======================================================================
// TURMAS (decisão 39) — o cadastro que não existia.
//
// A pergunta do campo foi de uma frase: "quem cadastra as turmas? tem que ter
// um campo para isso na direção / coordenação, já tem?". Não tinha. Turma só
// nascia da seed — a coordenação matriculava criança numa lista fixa e não
// podia abrir a turma do ano seguinte, corrigir um nome nem passar a turma
// para outra professora sem mexer no banco.
//
// Fica na mesma tela do resto do elenco, e é da coordenação, pelo mesmo motivo
// que o cadastro de pessoa é: turma é o que decide quem lê a ficha de quem.
// ======================================================================
async function telaTurmas() {
  const d = await api('/api/cadastro');
  const equipe = d.equipe.filter(p => ['educador', 'profissional'].includes(p.papel));
  const opcoesProg = (sel) => (d.programas_de_turma ?? d.programas).map(p =>
    `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nome)}${
      p.no_escopo === 0 ? ' (fora da medição)' : ''}</option>`).join('');
  const opcoesTurno = (sel) => d.turnos.map(t =>
    `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.rotulo)}</option>`).join('');
  const opcoesEdu = (sel) => `<option value="">Sem professora por enquanto</option>` + equipe.map(p =>
    `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nome)}</option>`).join('');

  app.innerHTML = cabecalhoPessoas('turmas') + `
    <p class="sub" style="margin-top:12px">A turma é a unidade de tudo: o encontro, a chamada, a folha e a
      leitura da ficha saem dela. O turno não é rótulo — é ele que diz em que dias existe encontro, e é por
      ele que o Percurso sabe quando você está mesmo em falta.</p>

    <div class="cartao" style="margin-top:16px">
      <h2>Nova turma</h2>
      <label class="rot-campo" for="t-nome">Nome</label>
      <input type="text" id="t-nome" placeholder="Ex.: Vivência · Sábado manhã" autocomplete="off">
      <label class="rot-campo" for="t-prog">Programa</label>
      <select id="t-prog">${opcoesProg(null)}</select>
      <label class="rot-campo" for="t-turno">Quando encontra</label>
      <select id="t-turno">${opcoesTurno(null)}</select>
      <label class="rot-campo" for="t-edu">Quem atende</label>
      <select id="t-edu">${opcoesEdu(null)}</select>
      <p class="sub" style="margin-top:6px">Quem atende passa a ler a ficha de quem for matriculado aqui.</p>
      <button class="btn" data-acao="criar-turma" style="margin-top:14px">Criar turma</button>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Turmas hoje</h2><span class="sub">${d.turmas.length}</span></div>
      <div class="pilha" style="margin-top:10px">
        ${d.turmas.map(t => `<details class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:8px">
          <summary style="cursor:pointer;list-style:none">
            <div class="linha">
              <div class="cresce"><div class="nome">${esc(t.nome)}</div>
                <div class="meta">${esc(t.programa)} · ${t.turno === 'sabado' ? 'sábado' : 'dias de semana'} ·
                  ${t.educador ? esc(t.educador) : 'sem professora'}</div></div>
              <span class="selo ${t.criancas ? 'ok' : 'pend'}">${t.criancas} criança${t.criancas === 1 ? '' : 's'}</span>
            </div>
          </summary>
          <label class="rot-campo" for="te-nome-${t.id}">Nome</label>
          <input type="text" id="te-nome-${t.id}" value="${esc(t.nome)}" autocomplete="off">
          <label class="rot-campo" for="te-prog-${t.id}">Programa</label>
          <select id="te-prog-${t.id}">${opcoesProg(t.programa_id)}</select>
          <label class="rot-campo" for="te-turno-${t.id}">Quando encontra</label>
          <select id="te-turno-${t.id}">${opcoesTurno(t.turno)}</select>
          <label class="rot-campo" for="te-edu-${t.id}">Quem atende</label>
          <select id="te-edu-${t.id}">${opcoesEdu(t.educador_id)}</select>
          <button class="btn pequeno secundario" data-acao="editar-turma" data-id="${t.id}"
            style="margin-top:10px">Guardar</button>
        </details>`).join('')}
      </div>
      <p class="sub" style="margin-top:12px">Turma não se apaga: ela guarda encontros, chamadas e folhas.
        Para encerrar uma, tire a professora e rematricule as crianças — o histórico continua de pé.</p>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>E a matrícula?</h2>
      <p class="sub">A matrícula da criança em cada turma é feita em <b>Quem entra</b>, aqui do lado, no bloco
        "Nova criança" — programa e turma são escolhidos ali. Quem já está no cadastro e mudou de turma
        volta pelo <b>arquivo</b> ou pela rematrícula, na ficha dela.</p>
      <button class="btn pequeno fantasma" data-acao="ir" data-href="#/pessoas?aba=equipe"
        style="margin-top:10px">Ir para o cadastro de criança</button>
    </div>`;
}

async function telaQuemEntra() {
  const d = await api('/api/cadastro');
  // O aviso de troca vale para UMA tentativa. Consumido aqui, ele não
  // reaparece quando a coordenação voltar à tela outro dia.
  const troca = cadastro.trocaPendente;
  cadastro.trocaPendente = null;

  app.innerHTML = cabecalhoPessoas('equipe') + `
    <p class="sub" style="margin-top:12px">Professora, coordenação, diretoria e criança entram por aqui. Quem cadastra é a coordenação:
      papel e matrícula são exatamente o que decide, no resto do produto, quem enxerga a ficha de quem.</p>

    <div class="cartao" style="margin-top:16px">
      <h2>Nova pessoa na equipe</h2>
      <p class="sub">O apelido é o que aparece no cabeçalho e em cada registro — em branco, sai do próprio nome.</p>
      <label class="rot-campo" for="p-nome">Nome</label>
      <input type="text" id="p-nome" placeholder="Nome completo" autocomplete="off">
      <label class="rot-campo" for="p-apelido">Apelido <span class="sub">(opcional)</span></label>
      <input type="text" id="p-apelido" placeholder="Ex.: Maria S." autocomplete="off">
      <label class="rot-campo" for="p-papel">Papel</label>
      <select id="p-papel">${d.papeis.map(p =>
        `<option value="${p.id}">${esc(p.rotulo)}</option>`).join('')}</select>
      <p class="sub" id="p-nota" style="margin-top:6px"></p>
      <div id="p-turma-bloco">
        <label class="rot-campo" for="p-turma">Turma <span class="sub">(opcional)</span></label>
        <select id="p-turma">
          <option value="">Sem turma por enquanto</option>
          ${d.turmas.map(t => `<option value="${t.id}">${esc(t.nome)} · ${esc(t.programa)} — ${
            t.educador ? `hoje de ${esc(t.educador)}` : 'sem professora'}</option>`).join('')}
        </select>
      </div>
      ${troca ? `<div class="aviso" style="margin-top:12px">
        <h3>Essa turma já tem professora</h3>
        <p>${esc(troca.mensagem)}</p>
        <label style="display:flex;gap:8px;align-items:flex-start;margin-top:9px;font-size:12.5px;line-height:1.5">
          <input type="checkbox" id="p-confirma" style="width:auto;min-height:0;margin-top:3px">
          <span>Confirmo a troca: as crianças dessa turma passam a ser lidas pela pessoa nova.</span>
        </label></div>` : ''}
      <button class="btn" data-acao="cadastrar-pessoa" style="margin-top:14px">Cadastrar pessoa</button>
    </div>

    <div class="cartao" style="margin-top:14px">
      <h2>Nova criança</h2>
      <p class="sub">Entra pela presença (legítimo interesse) e sai daqui com a rubrica socioemocional
        <b>bloqueada</b>: quem libera é o responsável, na tela de Consentimentos.
        Próximo código: <b>${esc(d.proximo_codigo)}</b>.</p>
      <label class="rot-campo" for="c-nome">Nome da criança</label>
      <input type="text" id="c-nome" placeholder="Nome completo" autocomplete="off">
      <label class="rot-campo" for="c-nasc">Data de nascimento</label>
      <input type="date" id="c-nasc" max="${hojeIso()}">
      <label class="rot-campo" for="c-resp">Responsável</label>
      <input type="text" id="c-resp" placeholder="Quem responde pela criança" autocomplete="off">
      <label class="rot-campo" for="c-tel">Telefone do responsável <span class="sub">(com DDD)</span></label>
      <input type="tel" id="c-tel" inputmode="tel" placeholder="(11) 98888-7777" autocomplete="off">
      <p class="sub" style="margin-top:6px">É por aqui que sai o boletim da criança — e só para esta pessoa.
        Sem telefone, a ficha existe igual; só não tem para onde enviar.</p>
      <label class="rot-campo" for="c-prog">Programa</label>
      <select id="c-prog">${d.programas.map(p =>
        `<option value="${p.id}">${esc(p.nome)} · ${esc(p.faixa)}</option>`).join('')}</select>
      <label class="rot-campo" for="c-turma">Turma</label>
      <select id="c-turma"></select>
      <label class="rot-campo" for="c-entrada">Entrada no programa</label>
      <input type="date" id="c-entrada" value="${hojeIso()}" max="${hojeIso()}">
      <button class="btn" data-acao="cadastrar-crianca" style="margin-top:14px">Cadastrar criança</button>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Equipe hoje</h2><span class="sub">${d.equipe.length} na ativa</span></div>
      <div class="pilha" style="margin-top:10px">
        ${d.equipe.map(p => `<div class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:9px">
          <div class="linha">
            <div class="cresce"><div class="nome">${esc(p.nome)}</div>
              <div class="meta">${esc(PAPEL[p.papel] ?? p.papel)}${p.turmas ? ` · ${esc(p.turmas)}` : ''}</div></div>
            <span class="selo ${['educador', 'profissional'].includes(p.papel) ? 'ok' : 'pend'}">${esc(p.apelido)}</span>
          </div>
          ${p.id === sessao.id
            ? '<p class="sub">É você. Quem arquiva não pode ser quem sai.</p>'
            : `<div class="linha">
                ${p.turmas ? `<select id="sucessora-${p.id}" style="flex:1;min-width:180px">
                  <option value="">Deixar a(s) turma(s) sem professora</option>
                  ${d.equipe.filter(o => ['educador', 'profissional'].includes(o.papel) && o.id !== p.id).map(o =>
                    `<option value="${o.id}">${esc(o.nome)} assume</option>`).join('')}
                </select>` : ''}
                <button class="btn pequeno fantasma" data-acao="redefinir-senha"
                  data-id="${p.id}" data-nome="${esc(p.nome)}">Redefinir a senha</button>
                <button class="btn pequeno fantasma" data-acao="arquivar-pessoa"
                  data-id="${p.id}" data-nome="${esc(p.nome)}">Arquivar</button>
              </div>`}
        </div>`).join('')}
      </div>
      <p class="sub" style="margin-top:12px">Arquivar não apaga: a pessoa sai das listas vivas e o que ela
        registrou continua no sistema, com o nome dela — está em "Quem saiu", aqui em cima.</p>
    </div>

    <p class="rodape">Este produto não apaga pessoa — quem sai do pipeline vai para o arquivo, e volta de lá
      (decisão 30).<br>Todos os dados desta aplicação são sintéticos.</p>`;

  // Turma só existe para professora — coordenação e diretoria enxergam todas.
  const papel = document.getElementById('p-papel');
  const blocoTurma = document.getElementById('p-turma-bloco');
  const nota = document.getElementById('p-nota');
  const sincPapel = () => {
    nota.textContent = d.papeis.find(x => x.id === papel.value)?.nota ?? '';
    blocoTurma.hidden = !['educador', 'profissional'].includes(papel.value);
    if (blocoTurma.hidden) document.getElementById('p-turma').value = '';
  };
  papel.addEventListener('change', sincPapel);
  sincPapel();

  // A lista de turmas da criança segue o programa: o domínio recusa turma de
  // outro programa, e um select que oferece o inválido é uma armadilha.
  const prog = document.getElementById('c-prog');
  const turmaC = document.getElementById('c-turma');
  const sincTurmas = () => {
    turmaC.innerHTML = '<option value="">Sem turma por enquanto</option>' +
      d.turmas.filter(t => String(t.programa_id) === prog.value)
        .map(t => `<option value="${t.id}">${esc(t.nome)} · ${esc(t.turno)}</option>`).join('');
  };
  prog.addEventListener('change', sincTurmas);
  sincTurmas();
}

document.addEventListener('click', comErro(async (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const a = alvo.dataset.acao;

  if (a === 'cadastrar-pessoa') {
    const corpo = {
      nome: document.getElementById('p-nome').value,
      apelido: document.getElementById('p-apelido').value,
      papel: document.getElementById('p-papel').value,
      turma_id: document.getElementById('p-turma').value || null,
      confirmar_troca: !!document.getElementById('p-confirma')?.checked,
    };
    alvo.disabled = true;
    let r;
    try { r = await post('/api/equipe', corpo); }
    catch (e) {
      // O 409 de troca de turma não é falha: é a pergunta que faltava. Pinta o
      // aviso, devolve o que a pessoa tinha digitado e espera o novo toque.
      if (e.dados?.exige_confirmacao !== 'troca_de_turma') throw e;
      cadastro.trocaPendente = { mensagem: e.message };
      await navegar();
      document.getElementById('p-nome').value = corpo.nome;
      document.getElementById('p-apelido').value = corpo.apelido;
      document.getElementById('p-papel').value = corpo.papel;
      document.getElementById('p-papel').dispatchEvent(new Event('change'));
      document.getElementById('p-turma').value = corpo.turma_id ?? '';
      return;
    } finally { alvo.disabled = false; }
    toast(r.substituiu
      ? `${r.pessoa.nome} entrou e assumiu a ${r.turma.nome} no lugar de ${r.substituiu}.`
      : `${r.pessoa.nome} entrou como ${PAPEL[r.pessoa.papel] ?? r.pessoa.papel}.`, 'bom');
    await navegar();
  }

  if (a === 'cadastrar-crianca') {
    const corpo = {
      nome: document.getElementById('c-nome').value,
      nascimento: document.getElementById('c-nasc').value,
      responsavel: document.getElementById('c-resp').value,
      contato: document.getElementById('c-tel').value || null,
      programa_id: document.getElementById('c-prog').value,
      turma_id: document.getElementById('c-turma').value || null,
      entrada: document.getElementById('c-entrada').value || null,
    };
    alvo.disabled = true;
    let r;
    try { r = await post('/api/criancas', corpo); }
    finally { alvo.disabled = false; }
    toast(`${r.crianca.nome} entrou como ${r.crianca.codigo} — consentimento pendente.`, 'bom');
    await navegar();
  }
}));

// ======================================================================
// ARQUIVO — quem saiu do pipeline. Ninguém é apagado (decisão 30).
// A tela existe para mostrar as duas coisas ao mesmo tempo: que a pessoa
// saiu, e o que ela deixou registrado — que é o motivo de não se apagar.
// ======================================================================
async function telaQuemSaiu() {
  const [a, d] = await Promise.all([api('/api/arquivo'), api('/api/cadastro')]);
  const opcoesTurma = (progId) => d.turmas.filter(t => t.programa_id === progId)
    .map(t => `<option value="${t.id}">${esc(t.nome)} · ${esc(t.turno)}</option>`).join('');

  app.innerHTML = cabecalhoPessoas('arquivo') + `
    <p class="sub" style="margin-top:12px">${esc(a.doutrina)}</p>

    <div class="cartao" style="margin-top:16px">
      <div class="linha"><h2 class="cresce">Equipe</h2><span class="sub">${a.pessoas.length}</span></div>
      ${a.pessoas.length ? `<div class="pilha" style="margin-top:10px">
        ${a.pessoas.map(p => `<div class="item" style="cursor:default;flex-direction:column;align-items:stretch;gap:9px">
          <div class="linha">
            <div class="cresce"><div class="nome">${esc(p.nome)}</div>
              <div class="meta">${esc(PAPEL[p.papel] ?? p.papel)} · saiu em ${dataBR(p.arquivado_em)}</div></div>
            <span class="selo bloq">arquivada</span>
          </div>
          <p class="sub">Deixou ${p.chamadas} chamada(s) e ${p.observacoes} observação(ões) no sistema — tudo assinado com o nome dela.</p>
          <div class="linha">
            <button class="btn pequeno secundario" data-acao="reativar-pessoa"
              data-id="${p.id}" data-nome="${esc(p.nome)}">Trazer de volta</button>
          </div>
        </div>`).join('')}
      </div>` : '<p class="vazio">Ninguém da equipe está no arquivo.</p>'}
    </div>

    <div class="cartao" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Crianças</h2><span class="sub">${a.criancas.length}</span></div>
      <p class="sub">Voltar é uma matrícula NOVA — a saída não é apagada, porque é ela que a curva de
        permanência lê. O consentimento volta a pendente: a base legal caducou com a saída.</p>
      ${a.criancas.length ? `<div class="pilha" style="margin-top:10px">
        ${a.criancas.map(c => `<details class="item bloco-volta">
          <summary>
            <span class="cresce"><span class="nome">${esc(c.nome)}</span>
              <span class="meta">${esc(c.codigo)} · saiu em ${dataBR(c.saiu_em)} · ${c.presencas} presença(s) · ${esc(c.programas || '—')}</span></span>
            <span class="selo bloq">arquivada</span>
          </summary>
          <div class="pilha" style="margin-top:12px;gap:0">
            <label class="rot-campo" for="v-prog-${c.id}">Volta em qual programa</label>
            <select id="v-prog-${c.id}" data-acao="volta-programa" data-id="${c.id}">${d.programas.map(p =>
              `<option value="${p.id}">${esc(p.nome)} · ${esc(p.faixa)}</option>`).join('')}</select>
            <label class="rot-campo" for="v-turma-${c.id}">Turma</label>
            <select id="v-turma-${c.id}">
              <option value="">Sem turma por enquanto</option>${opcoesTurma(d.programas[0].id)}</select>
            <label class="rot-campo" for="v-ent-${c.id}">Data da volta</label>
            <input type="date" id="v-ent-${c.id}" value="${hojeIso()}" max="${hojeIso()}">
            <button class="btn" data-acao="rematricular" data-id="${c.id}"
              data-nome="${esc(c.nome)}" style="margin-top:14px">Trazer de volta</button>
          </div>
        </details>`).join('')}
      </div>` : '<p class="vazio">Nenhuma criança no arquivo.</p>'}
    </div>

    <p class="rodape">Não existe rota que apague pessoa neste produto, e a ausência é a decisão
      (decisão 30). Todos os dados desta aplicação são sintéticos.</p>`;

  // A turma do formulário de volta segue o programa, como no cadastro: o
  // domínio recusa turma de outro programa e um select que oferece o inválido
  // é armadilha.
  for (const c of a.criancas) {
    const prog = document.getElementById(`v-prog-${c.id}`);
    prog?.addEventListener('change', () => {
      document.getElementById(`v-turma-${c.id}`).innerHTML =
        '<option value="">Sem turma por enquanto</option>' + opcoesTurma(Number(prog.value));
    });
  }
}

document.addEventListener('click', comErro(async (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const a = alvo.dataset.acao;
  const id = Number(alvo.dataset.id);

  if (a === 'arquivar-pessoa') {
    const sucessora = document.getElementById(`sucessora-${id}`)?.value || null;
    alvo.disabled = true;
    let r;
    try { r = await post('/api/equipe/arquivar', { id, assumida_por: sucessora }); }
    finally { alvo.disabled = false; }
    toast(r.aviso, 'bom');
    await navegar();
  }

  if (a === 'reativar-pessoa') {
    alvo.disabled = true;
    let r;
    try { r = await post('/api/equipe/reativar', { id }); }
    finally { alvo.disabled = false; }
    toast(r.aviso, 'bom');
    await navegar();
  }

  if (a === 'arquivar-crianca') {
    alvo.disabled = true;
    let r;
    try {
      r = await post('/api/criancas/arquivar', {
        id, saida: document.getElementById('saida-crianca')?.value || null,
      });
    } finally { alvo.disabled = false; }
    toast(r.aviso, 'bom');
    location.hash = '#/pessoas?aba=arquivo';
  }

  if (a === 'rematricular') {
    alvo.disabled = true;
    let r;
    try {
      r = await post('/api/criancas/rematricular', {
        id,
        programa_id: document.getElementById(`v-prog-${id}`).value,
        turma_id: document.getElementById(`v-turma-${id}`).value || null,
        entrada: document.getElementById(`v-ent-${id}`).value || null,
      });
    } finally { alvo.disabled = false; }
    toast(r.aviso, 'bom');
    await navegar();
  }
}));

async function telaOQueVeioDeAntes() {
  const [{ importacoes }, { turmas }] = await Promise.all([api('/api/importacoes'), api('/api/turmas')]);
  app.innerHTML = cabecalhoPessoas('importar') + `
    <p class="sub" style="margin-top:12px"><b>A série histórica que um sistema novo só teria em 2029.</b>
      Colunas escritas de qualquer jeito, nomes em três grafias, presença como P/F, 1/0 ou sim/não.
      A deduplicação é por primeiro nome mais data de nascimento — e toda decisão aparece no relatório antes de gravar.</p>

    <div class="cartao" style="margin-top:16px">
      <label for="turma-imp" style="font-size:12.5px;font-weight:600">Turma de destino</label>
      <select id="turma-imp" style="margin-top:6px">${turmas.map(t =>
        `<option value="${t.id}">${esc(t.nome)} · ${esc(t.programa)}</option>`).join('')}</select>
      <label for="csv" style="font-size:12.5px;font-weight:600;display:block;margin-top:14px">Conteúdo da planilha (CSV)</label>
      <textarea id="csv" style="min-height:150px;margin-top:6px" placeholder="Nome;Nascimento;Data;Presença"></textarea>
      <div class="linha" style="margin-top:12px">
        <button class="btn secundario cresce" data-acao="importar" data-simular="1">Simular</button>
        <button class="btn cresce" data-acao="importar" data-simular="0">Importar</button>
      </div>
      <p class="sub" style="margin-top:8px">Simular não grava nada. Use antes de importar.</p>
    </div>

    <div id="resultado-import" class="pilha"></div>

    ${importacoes.length ? `<div class="cartao compacto" style="margin-top:14px">
      <h2>Importações anteriores</h2>
      <div class="rolagem" style="margin-top:10px"><table>
        <thead><tr><th>Arquivo</th><th>Linhas</th><th>Novas</th><th>Reconhecidas</th><th>Duplicatas</th><th>Quando</th></tr></thead>
        <tbody>${importacoes.map(i => `<tr><td>${esc(i.origem)}</td><td>${i.linhas}</td><td>${i.criancas_novas}</td>
          <td>${i.reconhecidas}</td><td>${i.duplicatas}</td><td>${dataBR(i.executado_em)}</td></tr>`).join('')}</tbody>
      </table></div></div>` : ''}
    <p class="rodape">A planilha não é guardada. O que fica é o log da decisão: quantas crianças, quantas grafias, o que foi descartado e por quê.</p>`;
}

// ======================================================================
// IMPACTO — SROI exploratorio (Fase 3). Motor deterministico; o modelo so'
// explica premissas (rotulado e fora do relatorio exportado por padrao).
// Eixo central da narrativa: prevencao de violencia/criminalidade — decisao
// registrada do Instituto; relevancia estrategica, NAO prova de causalidade.
// ======================================================================
const sroi = { resultado: null, explicacao: null };
const brl = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

async function telaImpactoPotencial() {
  const [prem, inv] = await Promise.all([api('/api/sroi/premissas'), api('/api/inventario')]);
  const r = sroi.resultado;
  app.innerHTML = cabecalhoRelatorio('impacto') + `
    <h1 style="margin-top:12px">Impacto potencial</h1>
    <p class="sub">Cenários exploratórios · associação compatível, não causalidade comprovada.</p>
    <div class="cartao" style="margin-top:12px">
      <p class="sub" style="margin:0"><b>O que esta tela é:</b> uma faixa exploratória de valor social
        potencial, com todas as premissas expostas, para conversa de captação.
        <b>O que ela não é:</b> prova de impacto — a ponte causal é pendência declarada, e uso externo
        exige revisão humana. O eixo da narrativa é a <b>prevenção de violência</b>, decisão do Instituto.</p>
    </div>

    <div class="cartao" style="margin-top:12px">
      <h2 style="margin-top:0">Montar cenário</h2>
      <div class="grade d3" style="margin-top:10px">
        <label><span class="lbl" style="display:block">Crianças únicas</span>
          <input type="number" id="sroi-n" value="${sroi.n ?? inv.criancasUnicas}" min="1"></label>
        <label><span class="lbl" style="display:block">Investimento anual (R$)</span>
          <input type="number" id="sroi-inv" value="${sroi.inv ?? ''}" placeholder="ex.: 180000" min="1"></label>
        <label><span class="lbl" style="display:block">Horizonte (anos)</span>
          <input type="number" id="sroi-anos" value="${sroi.anos ?? 5}" min="1" max="30"></label>
      </div>
      <p style="margin:16px 0 2px;font-weight:600">Proxy monetária <span class="sub" style="font-weight:400">(dupla contagem é bloqueada pelo motor)</span></p>
      <label class="opcao"><input type="radio" name="sroi-proxy" value="violencia" checked>
        <span class="marca-radio" aria-hidden="true"></span>
        <span><b>Violência dentro do custo da evasão</b> — ${brl(45000)}/jovem<br>
          <span class="sub">eixo da narrativa, decisão do Instituto</span></span></label>
      <label class="opcao"><input type="radio" name="sroi-proxy" value="envelope">
        <span class="marca-radio" aria-hidden="true"></span>
        <span><b>Envelope total da não conclusão</b> — ${brl(372000)}/jovem<br>
          <span class="sub">JÁ contém a violência e os demais componentes</span></span></label>
      <label class="opcao"><input type="radio" name="sroi-proxy" value="componentes">
        <span class="marca-radio" aria-hidden="true"></span>
        <span><b>Componentes somados</b><br>
          <span class="sub">renda ${brl(159000)} + qualidade de vida ${brl(114000)} + violência ${brl(45000)}</span></span></label>
      <button class="btn largo" data-acao="sroi-calcular" style="margin-top:12px">Calcular os 3 cenários</button>
    </div>

    ${r ? pintarSROI(r) : ''}
    ${r ? `
    <div class="cartao no-print" style="margin-top:12px">
      <div class="linha">
        <button class="btn secundario" data-acao="imprimir">Imprimir / exportar relatório</button>
        <button class="btn fantasma" data-acao="sroi-explicar">Explicar premissas</button>
      </div>
      ${sroi.explicacao ? `
        <div style="margin-top:12px;border-left:4px solid var(--ok,#4a7c59);padding-left:12px">
          ${sroi.explicacao.rotulo ? `<p class="sintetico" style="margin:0 0 8px">${esc(sroi.explicacao.rotulo)}</p>` : ''}
          ${sroi.explicacao.texto.split('\n\n').map(p => `<p class="sub" style="margin:0 0 8px">${esc(p)}</p>`).join('')}
        </div>` : ''}
    </div>` : ''}`;
}

function pintarSROI(r) {
  return `
    <div class="cartao area-impressao" style="margin-top:12px">
      <h2 style="margin-top:0">${esc(r.leitura_obrigatoria)}</h2>
      <div class="linha" style="gap:10px;flex-wrap:wrap">
        ${r.cenarios.map(c => `
          <div class="cartao area-impressao cresce" style="min-width:180px;margin:0">
            <p class="kicker" style="margin:0">${esc(c.cenario)}</p>
            <div style="font-size:28px;font-weight:600;letter-spacing:-.02em">R$ ${String(c.sroi.toFixed(2)).replace('.', ',')}</div>
            <p class="sub" style="margin:2px 0 8px">por R$ 1 investido</p>
            <p class="sub" style="margin:0">benefício presente: ${brl(c.beneficio_presente_total)}<br>
              investimento: ${brl(c.investimento_total)}</p>
            <p class="sub" style="margin:8px 0 0">efeito ${Math.round(c.parametros.efeito_incremental * 100)}% ·
              deadweight ${Math.round(c.parametros.deadweight * 100)}% ·
              atribuição ${Math.round(c.parametros.atribuicao * 100)}% ·
              desconto ${Math.round(c.parametros.desconto * 100)}%</p>
          </div>`).join('')}
      </div>
      <h2>Premissas usadas (cada uma com fonte e ressalva)</h2>
      ${r.proxies_usadas.map(p => `
        <div style="margin-bottom:10px">
          <b>${esc(p.nome)}</b> — ${brl(p.valor)} (${esc(p.unidade)}, ano-base ${p.ano_base})<br>
          <span class="sub">Fonte: <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.fonte)}</a> ·
          confiança: ${esc(p.confianca)} · ${esc(p.status_ebenezer)}</span><br>
          <span class="sub">${esc(p.ressalva)}</span>
        </div>`).join('')}
      <h2>Benchmarks brasileiros (método, nunca multiplicador)</h2>
      ${r.benchmarks.map(b => `
        <p class="sub" style="margin:0 0 6px"><b>${esc(b.nome)}</b>: R$ ${String(b.valor).replace('.', ',')}/R$ 1
          ${b.faixa ? `(sensibilidade R$ ${String(b.faixa[0]).replace('.', ',')}–${String(b.faixa[1]).replace('.', ',')})` : ''}
          — ${esc(b.fonte)}. ${esc(b.ressalva)}</p>`).join('')}
      <h2>Ressalvas metodológicas</h2>
      <ul style="padding-left:18px">${r.ressalvas.map(x => `<li class="sub">${esc(x)}</li>`).join('')}</ul>
      <p class="sub">Motor v${esc(r.versao_motor)} · premissas ${esc(r.versao_premissas)} — cálculo determinístico, sem modelo de linguagem.</p>
    </div>`;
}

document.addEventListener('click', comErro(async (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  if (alvo.dataset.acao === 'sroi-calcular') {
    const proxy = document.querySelector('input[name="sroi-proxy"]:checked')?.value;
    const proxy_ids = proxy === 'envelope' ? ['nao-conclusao-total']
      : proxy === 'componentes' ? ['renda-remuneracao', 'qualidade-vida', 'violencia-evasao']
      : ['violencia-evasao'];
    sroi.n = Number(document.getElementById('sroi-n').value);
    sroi.inv = Number(document.getElementById('sroi-inv').value);
    sroi.anos = Number(document.getElementById('sroi-anos').value);
    sroi.explicacao = null;
    sroi.resultado = await post('/api/sroi/calcular', {
      criancas: sroi.n, investimento_anual: sroi.inv, horizonte_anos: sroi.anos, proxy_ids,
    });
    sroi.proxy_ids = proxy_ids;
    navegar();
  }
  if (alvo.dataset.acao === 'sroi-explicar') {
    alvo.disabled = true;
    try {
      sroi.explicacao = await post('/api/sroi/explicar', {
        criancas: sroi.n, investimento_anual: sroi.inv, horizonte_anos: sroi.anos, proxy_ids: sroi.proxy_ids,
      }, { timeoutMs: 75000 });
    } finally { alvo.disabled = false; }
    navegar();
  }
}));

// ======================================================================
// COPILOT — sala de reflexao pedagogica (Modo B). Fase 2 do plano de IA.
// A IA nunca grava; memoria so' de sessao; a decisao e' sempre humana.
// ======================================================================
const copiloto = { sessao: null, trocas: [] };

rota(/^#\/pensar/, async () => {
  const st = await api('/api/ia/status');
  if (!st.habilitada || !st.papeis?.reflexivo?.pronto) {
    // Antes esta tela despejava `ai/scripts/start-llama.sh` e `AI_ENABLED=1` na
    // cara de quem so' queria pensar sobre a turma. Instrucao de operacao e' da
    // coordenacao; para quem esta em sala, o que importa e' que nada se perdeu.
    const daCasa = sessao?.papel === 'coordenacao' || sessao?.papel === 'diretoria';
    app.innerHTML = `
      <p class="kicker">Aurora · pensar junto</p>
      <h1>Agora eu não consigo pensar junto</h1>
      <div class="cartao" style="margin-top:16px">
        <p class="sub">${st.habilitada
          ? 'Eu estou aqui, mas a parte que consulta as fontes não respondeu agora.'
          : 'Esta parte de mim está desligada — é opcional, e o Instituto escolhe quando ligar.'}
          <b>Nada do seu registro depende disso.</b> A chamada, o registro por voz, a folha e o
          relato continuam inteiros, e eu continuo respondendo do guia na gaveta.</p>
        <div class="linha" style="margin-top:12px">
          <button class="btn largo" data-acao="ir" data-href="#/hoje">Voltar ao que importa</button>
          <button class="btn largo secundario" data-acao="recarregar">Tentar de novo</button>
        </div>
      </div>
      ${daCasa ? `<details class="cartao compacto" style="margin-top:12px">
        <summary>Como ligar (coordenação)</summary>
        <p class="sub" style="margin-top:8px">Suba o modelo com <code>ai/scripts/start-llama.sh</code> e
           inicie o servidor com <code>AI_ENABLED=1</code>. Em operação real com educadoras, ligar
           depende do resultado da PoC — <code>docs/POC-COPILOT.md</code>.</p>
      </details>` : ''}`;
    return;
  }
  app.innerHTML = `
    <p class="kicker">Aurora · pensar junto · modelo local, nada sai da máquina</p>
    <h1>Pensar junto</h1>
    <div class="cartao" style="margin-top:12px">
      <p class="sub" style="margin:0"><b>Fale ou escreva</b> a <b>situação</b>, não a criança — como na
        folha do dia. Nomes do cadastro viram pseudônimos antes do modelo, mas apelidos e descrições
        que identificam não são cobertos. Hipóteses não são fatos; a decisão pedagógica é sua.
        Situação de violência, saúde ou risco: o caminho é a coordenação, fora daqui.</p>
    </div>
    <div id="copilot-fio" class="pilha" style="margin-top:12px">${copiloto.trocas.map(pintarTroca).join('')}</div>
    <div class="cartao" style="margin-top:12px">
      ${(() => { const d = blocoDitado('copilot-texto', 'copilot-ditado-estado'); return `
      <div class="linha" style="align-items:flex-end;flex-wrap:nowrap">
        <textarea id="copilot-texto" class="cresce" rows="3" placeholder="Ex.: metade da turma se dispersa na roda depois de dez minutos…"
          style="resize:vertical">${esc(copiloto.rascunho || '')}</textarea>
        ${d.botao}
      </div>
      ${d.estado}`; })()}
      <div class="linha" style="margin-top:10px">
        <button class="btn cresce" data-acao="copilot-enviar">Pensar junto</button>
        <button class="btn secundario" data-acao="copilot-apagar" title="Apaga a memória desta sessão — nada dela é persistido">Apagar sessão</button>
      </div>
    </div>`;
  const fio = document.getElementById('copilot-fio');
  if (fio && fio.lastElementChild) fio.lastElementChild.scrollIntoView({ block: 'end' });
});

function pintarTroca(t, i) {
  if (t.carregando) return `
    <div class="cartao">
      <div class="linha" style="justify-content:space-between">
        <p class="sub" style="margin:0">✷ pensando… (modelo local; costuma levar 10–20 s)</p>
        <button class="btn pequeno fantasma" data-acao="copilot-cancelar" data-i="${i}">Cancelar</button>
      </div>
    </div>`;
  const cab = `<div class="cartao" style="background:var(--ink);color:var(--bg);border-color:var(--ink)">
      <p style="margin:0">${esc(t.pergunta)}</p>
      ${t.nomes_substituidos ? `<p style="margin:6px 0 0;opacity:.75;font-size:13.5px">${t.nomes_substituidos} nome(s) viraram pseudônimo antes do modelo</p>` : ''}
    </div>`;
  if (t.tipo === 'encaminhamento') return cab + `
    <div class="cartao" style="border-left:4px solid var(--red,#b3402a)">
      <b>Tem algo aqui que não entra no sistema</b>
      <p class="sub">${esc(t.mensagem || '')}</p>
      ${(t.trechos || []).map(x => `<div class="trecho"><b>${esc(x.categoria)}</b>${esc(x.trecho)}</div>`).join('')}
    </div>`;
  if (t.tipo === 'recusa') return cab + `
    <div class="cartao" style="border-left:4px solid var(--red,#b3402a)">
      <b>Isso o copilot não faz (${esc(t.motivo || 'recusa')})</b>
      <p class="sub" style="margin-bottom:0">${esc(t.mensagem || '')}</p>
    </div>`;
  const r = t.resposta || {};
  const bloco = (titulo, html) => `<div style="margin-top:12px"><p class="kicker" style="margin:0 0 4px">${titulo}</p>${html}</div>`;
  return cab + `
    <div class="cartao">
      ${bloco('O que entendi', `<p style="margin:0">${esc(r.entendi || '')}</p>`)}
      ${bloco('Perguntas para pensar', `<ul style="margin:0;padding-left:18px">${(r.perguntas || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>`)}
      ${bloco('Hipóteses — para debate, não diagnóstico', (r.hipoteses || []).map(h =>
        `<p style="margin:0 0 6px"><span class="sintetico">${esc(h.rotulo)}</span> ${esc(h.texto)}</p>`).join(''))}
      ${bloco('Alternativas', (r.alternativas || []).map(a =>
        `<div style="margin:0 0 8px"><b>→ ${esc(a.acao)}</b><p class="sub" style="margin:2px 0 0">limites: ${esc(a.limites)}</p></div>`).join(''))}
      ${bloco('Contraponto', `<p style="margin:0">${esc(r.contraponto || '')}</p>`)}
      ${bloco('Próximo aurora seguro', `<p style="margin:0">${esc(r.proximo_passo || '')}</p>`)}
      ${r.escalonamento ? `<div style="margin-top:12px;border-left:4px solid var(--red,#b3402a);padding-left:10px"><b>Escalonamento humano</b><p class="sub" style="margin:2px 0 0">${esc(r.escalonamento)}</p></div>` : ''}
      ${bloco('Fontes do corpus aprovado', r.sem_fonte_no_corpus
        ? '<p class="sub" style="margin:0">Nenhum trecho do corpus sustentou esta resposta — leia como opinião do modelo, não como material documentado.</p>'
        : (r.fontes || []).map(f => `<span class="sintetico" title="${esc(f.secao)}">[fonte:${esc(f.id)}] ${esc(f.titulo)}</span> `).join(''))}
      ${t.decisao ? `<p class="sub" style="margin-top:12px"><b>${t.decisao === 'aceita' ? '✓ Você marcou: vai testar uma das alternativas' : '✕ Você rejeitou esta reflexão'}</b> — registro só desta tela; nada foi gravado.</p>` : ''}
      <div class="linha" style="margin-top:14px">
        <button class="btn pequeno secundario cresce" data-acao="copilot-outra" data-i="${i}">Outra perspectiva</button>
        <button class="btn pequeno fantasma cresce" data-acao="copilot-doar" data-i="${i}"
          title="Doa esta interação (anonimizada) para o futuro dataset de ajuste do modelo — ato seu, revogável">Doar interação</button>
      </div>
      <div class="linha" style="margin-top:8px">
        <button class="btn pequeno secundario cresce" data-acao="copilot-aceitar" data-i="${i}"
          title="Marca que a reflexão ajudou e você vai testar algo — a decisão pedagógica continua sua">✓ Aceitar</button>
        <button class="btn pequeno secundario cresce" data-acao="copilot-rejeitar" data-i="${i}"
          title="Marca que não ajudou — peça outra perspectiva ou siga seu caminho">✕ Rejeitar</button>
        <button class="btn pequeno secundario cresce" data-acao="copilot-escalar"
          title="Situação de violência, saúde ou risco: o caminho é humano, fora daqui">Escalar</button>
      </div>
      <p class="sub" style="margin-top:10px">${esc(t.aviso || '')}</p>
    </div>`;
}

async function copilotEnviar(texto) {
  const original = (texto || '').trim();
  if (!original) return;
  // Um envio por vez: envios cruzados embaralhariam a ordem local vs. a sessão
  // do servidor (e o índice de doação junto).
  if (copiloto.trocas.some(t => t.carregando)) {
    toast('Aguarde a resposta anterior — ou toque em Cancelar nela.', 'ruim');
    return;
  }
  // Cada envio tem o próprio abort: o Cancelar do cartão "pensando…" e o
  // timeout de 75s garantem que a tela NUNCA fica presa num pedido pendurado.
  const ctl = new AbortController();
  const idx = copiloto.trocas.push({ carregando: true, abortar: () => ctl.abort() }) - 1;
  const fio = document.getElementById('copilot-fio');
  if (fio) { fio.innerHTML = copiloto.trocas.map(pintarTroca).join(''); fio.lastElementChild?.scrollIntoView({ block: 'end' }); }
  try {
    const r = await post('/api/copilot/chat', { message: original, session_id: copiloto.sessao },
      { timeoutMs: 75000, signal: ctl.signal });
    copiloto.sessao = r.session_id;
    copiloto.trocas[idx] = {
      pergunta: original, tipo: r.tipo, mensagem: r.mensagem, motivo: r.motivo,
      trechos: r.trechos, resposta: r.resposta, aviso: r.aviso,
      nomes_substituidos: r.nomes_substituidos,
      indice_servidor: r.indice ?? null,   // índice DESTA reflexão na sessão do servidor (doação)
    };
  } catch (e) {
    copiloto.trocas.splice(idx, 1);
    // O que a pessoa falou/escreveu volta para o campo — cancelar ou cair a
    // conexão nunca perde a pergunta.
    copiloto.rascunho = original;
    if (e.cancelado) toast('Cancelado. Sua pergunta voltou para o campo.');
    else toast(e.message, 'ruim');
  }
  if (location.hash.startsWith('#/pensar')) navegar();
}

function limparEstadoLocal() {
  // Aparelho compartilhado: trocar de pessoa não pode herdar a conversa de
  // reflexão nem os valores do SROI da pessoa anterior.
  copiloto.sessao = null; copiloto.trocas = []; copiloto.rascunho = '';
  sroi.resultado = null; sroi.explicacao = null;
  sroi.n = sroi.inv = sroi.anos = sroi.proxy_ids = undefined;
  aurora.sessao = null; aurora.trocas = []; aurora.rascunho = '';
  // A voz da Aurora é opt-in POR PESSOA, não do aparelho: quem entra depois
  // não herda o som ligado por quem saiu. O painel também não: ele é o estado
  // do dia de UMA pessoa.
  aurora.som = false;
  aurora.painel = null; aurora.resumo = null; aurora.badge = false; aurora.badgeRota = null;
  localStorage.removeItem('percurso_aurora_som');
  document.querySelector('.aurora-ponto')?.remove();
}

document.addEventListener('click', comErro(async (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const a = alvo.dataset.acao;
  if (a === 'copilot-enviar') {
    pararDitado();   // fala pendente entra no campo antes do envio; mic desliga
    const campo = document.getElementById('copilot-texto');
    const v = campo?.value ?? '';
    if (campo) campo.value = '';
    copiloto.rascunho = '';
    await copilotEnviar(v);
  }
  if (a === 'copilot-cancelar') {
    copiloto.trocas[Number(alvo.dataset.i)]?.abortar?.();
    return;
  }
  if (a === 'copilot-apagar') {
    if (copiloto.sessao) await api('/api/copilot/sessao', { method: 'DELETE', body: JSON.stringify({ session_id: copiloto.sessao }) });
    copiloto.sessao = null; copiloto.trocas = [];
    toast('Sessão apagada. Nada dela foi persistido.', 'bom');
    navegar();
  }
  if (a === 'copilot-outra') {
    const t = copiloto.trocas[Number(alvo.dataset.i)];
    if (t?.pergunta) await copilotEnviar(`Me dê OUTRA perspectiva, diferente da anterior, sobre: ${t.pergunta}`);
  }
  if (a === 'copilot-aceitar' || a === 'copilot-rejeitar') {
    const t = copiloto.trocas[Number(alvo.dataset.i)];
    if (t) { t.decisao = a === 'copilot-aceitar' ? 'aceita' : 'rejeitada'; navegar(); }
  }
  if (a === 'copilot-escalar') {
    modalEncaminhamento([{ categoria: 'escalonamento pedido por você',
      trecho: 'Nenhum conteúdo foi enviado a lugar nenhum — este aviso só reforça o caminho humano.' }]);
  }
  if (a === 'copilot-doar') {
    const t = copiloto.trocas[Number(alvo.dataset.i)];
    if (!t || t.tipo !== 'reflexao') return;
    // O índice vem do SERVIDOR na resposta do chat — posições recontadas no
    // cliente doariam a interação errada se a sessão expirasse no meio.
    const indice = t.indice_servidor;
    if (indice == null) { toast('Esta interação não está mais na sessão do servidor.', 'ruim'); return; }
    const previa = await post('/api/copilot/doacao/previa', { session_id: copiloto.sessao, indice });
    modalDoacao(previa, async () => {
      const r = await post('/api/copilot/doar', { session_id: copiloto.sessao, indice });
      toast(`Interação doada (id ${r.id.slice(0, 8)}…). Você pode revogar depois.`, 'bom');
    });
  }
}));

// Pre-visualizacao EXATA do que sera' gravado — a doacao e' ato consciente.
function modalDoacao(previa, aoConfirmar) {
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="md">
      <h2 id="md">Doar esta interação?</h2>
      <p class="sub">Isto — e somente isto — será gravado localmente (anonimizado) para compor, no futuro,
         o dataset de ajuste do modelo. Doação é sua escolha, por interação, e revogável.</p>
      <div class="trecho" style="max-height:200px;overflow:auto"><b>pergunta (pseudonimizada)</b>${esc(previa.pergunta)}</div>
      <div class="trecho" style="max-height:160px;overflow:auto"><b>resposta</b>${esc(JSON.stringify(previa.resposta).slice(0, 800))}…</div>
      <div class="linha" style="margin-top:16px">
        <button class="btn cresce" data-acao="doacao-ok">Doar</button>
        <button class="btn secundario cresce" data-acao="doacao-cancelar">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);
  veu.querySelector('[data-acao="doacao-ok"]').focus();
  veu.addEventListener('click', async (e) => {
    if (e.target.dataset.acao === 'doacao-ok') { veu.remove(); await aoConfirmar(); }
    if (e.target.dataset.acao === 'doacao-cancelar' || e.target === veu) veu.remove();
  });
}

// ======================================================================
// MODAL DO FILTRO DE PROTECAO
// ======================================================================
// A-15: focus-trap generico — Tab e Shift+Tab circulam DENTRO do dialogo
// enquanto ele estiver aberto; o foco nao escapa para a pagina por tras.
function prenderFoco(veu) {
  veu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focaveis = [...veu.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!focaveis.length) return;
    const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });
}

// Modal com um campo — usado no registro de consentimento.
// Substitui o prompt() nativo: mesma linguagem visual, foco gerenciado e Esc funciona.
// ======================================================================
// CONSENTIMENTO COM PROVA EM VÍDEO (decisão 41).
//
// O pedido do campo, em 04/09/2026: "como ele deixa registrado o consentimento?
// tem como ser por meio de um vídeo do responsável na hora de fazer a
// matrícula?". Tem — e é melhor do que o que havia.
//
// O que havia era o nome do responsável DIGITADO por quem estava do outro lado
// da mesa. Isso é a afirmação de que houve consentimento, não a prova dele; e a
// LGPD põe o ônus da prova no controlador (Art. 8º, §1º). Trinta segundos de
// vídeo sustentam o que uma linha de texto não sustenta.
//
// E resolve um problema de campo antes de um jurídico: papel se perde, e nem
// todo responsável lê um termo com facilidade. Falar é mais fácil que assinar.
//
// O vídeo é OPCIONAL de propósito — nem todo responsável quer ser filmado, e
// exigir a câmera seria transformar uma proteção em barreira. Sem vídeo o
// consentimento vale igual; a tela é que diz, depois, quais têm prova e quais
// só têm a palavra de quem digitou.
// ======================================================================
const CAMPOS_DA_MATRICULA = ['rubrica_socioemocional', 'campo_livre'];

function modalConsentimento({ id, nome }) {
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mcv">
      <h2 id="mcv">Registrar consentimento</h2>
      <p>Consentimento específico do responsável (LGPD Art. 14) para o registro socioemocional de
        ${esc(nome)}. Pode ser revogado a qualquer momento.</p>
      <label for="cv-resp" style="font-size:13px;font-weight:600;display:block;margin:12px 0 6px">Quem é o responsável que consentiu?</label>
      <input type="text" id="cv-resp" autocomplete="off" placeholder="Nome do responsável">

      <div class="cartao compacto" style="margin-top:14px;background:var(--fundo)">
        <div class="linha"><h3 class="cresce" style="margin:0;font-size:14px">A prova, em vídeo</h3>
          <span class="selo pend" id="cv-selo">opcional</span></div>
        <p class="sub" style="margin-top:6px">Trinta segundos bastam: peça para o responsável dizer o nome
          dele, o nome da criança e que autoriza o Instituto a registrar como ela está indo. O vídeo fica
          nesta casa, só a coordenação abre, e toda abertura fica registrada.</p>
        <video id="cv-video" playsinline muted style="width:100%;border-radius:10px;margin-top:8px;display:none;background:#000"></video>
        <p class="sub" id="cv-estado" style="min-height:18px;margin-top:6px"></p>
        <div class="pilha" style="margin-top:8px">
          <button class="btn pequeno secundario" data-acao="cv-abrir" type="button">Abrir a câmera</button>
          <button class="btn pequeno" data-acao="cv-gravar" type="button" hidden>Começar a gravar</button>
          <button class="btn pequeno fantasma" data-acao="cv-virar" type="button" hidden>Virar a câmera</button>
          <button class="btn pequeno fantasma" data-acao="cv-escolher" type="button">Escolher um vídeo do celular</button>
        </div>
        <input type="file" id="cv-arquivo" accept="video/*,audio/*" hidden>
      </div>

      <p class="sub" id="cv-erro" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></p>
      <div class="linha" style="margin-top:16px">
        <button class="btn cresce" data-acao="cv-ok" type="button">Registrar e desbloquear</button>
        <button class="btn secundario cresce" data-acao="cv-cancelar" type="button">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);

  const campo = veu.querySelector('#cv-resp');
  const erro = veu.querySelector('#cv-erro');
  const estado = veu.querySelector('#cv-estado');
  const selo = veu.querySelector('#cv-selo');
  const video = veu.querySelector('#cv-video');
  const btnAbrir = veu.querySelector('[data-acao="cv-abrir"]');
  const btnGravar = veu.querySelector('[data-acao="cv-gravar"]');
  const btnVirar = veu.querySelector('[data-acao="cv-virar"]');
  let blob = null, gravador = null, duracao = 0, camera = null, traseira = false;
  campo.focus();

  // A prévia: a imagem na tela ANTES de gravar, que é quando a escolha da
  // câmera importa. Quem grava o responsável sentado do outro lado da mesa
  // precisa da traseira; quem grava a si mesmo, da frontal.
  const mostrarPrevia = async () => {
    if (camera) encerrarStream(camera);
    camera = await abrirCamera({ traseira });
    video.srcObject = camera; video.src = ''; video.muted = true; video.controls = false;
    video.style.display = 'block';
    // A frontal é espelhada na tela, como todo aplicativo de selfie faz — sem
    // isso a pessoa se vê ao contrário e não consegue se enquadrar. O ARQUIVO
    // não é espelhado: prova invertida seria prova adulterada.
    video.style.transform = traseira ? 'none' : 'scaleX(-1)';
    video.play?.().catch(() => {});
    btnAbrir.hidden = true; btnGravar.hidden = false;
    btnVirar.hidden = !(await temDuasCameras());
    estado.textContent = traseira ? 'Câmera de trás. Enquadre e comece.' : 'Câmera da frente. Enquadre e comece.';
  };
  const fecharCamera = () => { if (camera) { encerrarStream(camera); camera = null; } };

  const marcarProva = (b, segundos) => {
    blob = b; duracao = segundos || 0;
    selo.textContent = 'com prova'; selo.className = 'selo ok';
    const dizer = () => { estado.textContent = duracao
      ? `Vídeo de ${duracao} s guardado aqui, ainda não enviado.`
      : 'Vídeo guardado aqui, ainda não enviado.'; };
    dizer();
    video.srcObject = null; video.src = URL.createObjectURL(b); video.muted = false; video.controls = true;
    video.style.display = 'block';
    // Arquivo escolhido do celular não traz duração — quem sabe é o próprio
    // elemento, depois de ler os metadados. Estimar pelo tamanho daria número
    // errado com cara de certo, e a duração vai para o registro da prova.
    video.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(video.duration) && video.duration > 0) { duracao = Math.round(video.duration); dizer(); }
    }, { once: true });
  };

  const encerrarGravacao = () => {
    try { gravador?.cancelar(); } catch { /* já parou */ }
    gravador = null; fecharCamera();
  };

  veu.addEventListener('click', comErro(async (e) => {
    const a2 = e.target.dataset?.acao;
    if (a2 === 'cv-cancelar' || e.target === veu) { encerrarGravacao(); fecharCamera(); veu.remove(); return; }

    if (a2 === 'cv-escolher') { fecharCamera(); veu.querySelector('#cv-arquivo').click(); return; }

    if (a2 === 'cv-abrir') {
      if (!podeGravar()) { estado.textContent = 'Este aparelho não deixa gravar pelo navegador. Dá para escolher um vídeo já gravado.'; return; }
      try { await mostrarPrevia(); }
      catch { estado.textContent = 'Não consegui abrir a câmera. Confira a permissão do navegador, ou escolha um vídeo já gravado.'; }
      return;
    }

    if (a2 === 'cv-virar') {
      if (gravador) return;   // no meio da gravação, virar perderia o que já foi dito
      traseira = !traseira;
      try { await mostrarPrevia(); }
      catch { traseira = !traseira; estado.textContent = 'Este aparelho não deixou trocar de câmera.'; }
      return;
    }

    if (a2 === 'cv-gravar') {
      if (gravador) { gravador.parar(); return; }
      if (!camera) { await mostrarPrevia(); return; }
      let segundos = 0;
      btnGravar.textContent = 'Parar e usar este vídeo';
      btnVirar.hidden = true;   // virar agora perderia o que já foi dito
      gravador = await gravarVideoConsentimento({
        stream: camera,
        aoSegundo: (n) => { segundos = n; estado.textContent = `Gravando… ${n} s (para sozinho em 90 s)`; },
        aoParar: (b) => {
          gravador = null; camera = null;
          btnGravar.hidden = true; btnAbrir.hidden = false; btnAbrir.textContent = 'Gravar de novo';
          video.style.transform = 'none';
          marcarProva(b, segundos);
        },
      });
      return;
    }

    if (a2 !== 'cv-ok') return;
    const responsavel = campo.value.trim();
    if (!responsavel) { erro.textContent = 'É preciso informar quem consentiu.'; erro.style.display = 'block'; campo.focus(); return; }
    encerrarGravacao();
    e.target.disabled = true;
    try {
      for (const c of CAMPOS_DA_MATRICULA)
        await post('/api/consentimento', { crianca_id: id, campo: c, status: 'ativo', responsavel });
      if (blob) {
        estado.textContent = 'Enviando o vídeo…';
        await enviarEvidencia(blob, { id, responsavel, duracao });
      }
      veu.remove();
      toast(blob
        ? `Consentimento registrado com vídeo. O campo de ${nome} foi desbloqueado.`
        : `Consentimento registrado. O campo de ${nome} foi desbloqueado.`, 'bom');
      navegar();
    } catch (err) {
      e.target.disabled = false;
      erro.textContent = err.message; erro.style.display = 'block';
    }
  }));

  veu.querySelector('#cv-arquivo').addEventListener('change', (e) => {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (arq) { btnGravar.hidden = true; btnAbrir.hidden = false; marcarProva(arq, 0); }
  });
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') veu.querySelector('[data-acao="cv-ok"]').click();
  });
}

/** O upload é de BYTES CRUS, como o do áudio: base64 dentro de JSON inflaria
 *  33% um arquivo de megabytes e esbarraria no teto de corpo do servidor. */
async function enviarEvidencia(blob, { id, responsavel, duracao }) {
  const q = new URLSearchParams({
    crianca_id: String(id), campo: 'consentimento_em_video',
    mime: blob.type || 'video/webm', responsavel,
    ...(duracao ? { duracao: String(duracao) } : {}),
  });
  const r = await fetch(`/api/consentimento/evidencia?${q}`, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corpo.erro || 'Não consegui guardar o vídeo.');
  return corpo;
}

function modalCampo({ titulo, texto, rotulo, dica, confirmar }, aoConfirmar) {
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mc">
      <h2 id="mc">${esc(titulo)}</h2>
      <p>${esc(texto)}</p>
      <label for="campo-modal" style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">${esc(rotulo)}</label>
      <input type="text" id="campo-modal" autocomplete="off" placeholder="${esc(dica || '')}">
      <p class="sub" id="erro-modal" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></p>
      <div class="linha" style="margin-top:16px">
        <button class="btn cresce" data-acao="campo-ok">${esc(confirmar)}</button>
        <button class="btn secundario cresce" data-acao="campo-cancelar">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);
  const campo = veu.querySelector('#campo-modal');
  const erro  = veu.querySelector('#erro-modal');
  campo.focus();
  const confirmarAgora = () => {
    const v = campo.value.trim();
    if (!v) { erro.textContent = 'É preciso informar quem consentiu.'; erro.style.display = 'block'; campo.focus(); return; }
    veu.remove(); aoConfirmar(v);
  };
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmarAgora(); });
  veu.addEventListener('click', (e) => {
    if (e.target.dataset.acao === 'campo-ok') confirmarAgora();
    if (e.target.dataset.acao === 'campo-cancelar' || e.target === veu) veu.remove();
  });
}

// Encaminhamento humano (F5). O sistema nao tenta impedir que a revelacao
// aconteca — ela vai acontecer. Ele reconhece, nao grava, e devolve o caminho
// certo. E' o bloco 6 do dossie virando funcionalidade.
/** Trocar a própria senha (decisão 39). Fica no CABEÇALHO, ao lado de "sair" —
 *  não numa tela nova. A F2 acabou de reduzir 28 rotas para 12; abrir a 13ª
 *  para dois campos seria desfazer o que ela fez. */
function modalTrocarSenha() {
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ms">
      <h2 id="ms">Trocar a minha senha</h2>
      <p class="sub">Pede a senha de agora porque um navegador deixado aberto na sala não pode virar uma conta tomada.</p>
      <label class="rot-campo" for="s-atual">Senha de agora</label>
      <input type="password" id="s-atual" autocomplete="current-password">
      <label class="rot-campo" for="s-nova">Senha nova</label>
      <input type="password" id="s-nova" autocomplete="new-password" placeholder="pelo menos 8 caracteres">
      <p class="sub" id="s-erro" role="alert" style="color:var(--red);min-height:18px"></p>
      <div class="linha" style="margin-top:12px">
        <button class="btn cresce" data-acao="senha-ok">Trocar</button>
        <button class="btn secundario cresce" data-acao="senha-cancelar">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);
  veu.querySelector('#s-atual').focus();
  const erro = veu.querySelector('#s-erro');
  const trocar = async () => {
    try {
      const r = await post('/api/senha', {
        senha_atual: veu.querySelector('#s-atual').value,
        senha_nova: veu.querySelector('#s-nova').value,
      });
      veu.remove();
      // A troca derruba TODAS as sessões, inclusive esta — é o ponto dela.
      toast(r.aviso, 'bom');
      limparEstadoLocal();
      sessao = null;
      location.hash = '#/entrar';
      navegar();
    } catch (e) { erro.textContent = e.message; }
  };
  veu.addEventListener('keydown', (e) => { if (e.key === 'Enter') trocar(); });
  veu.addEventListener('click', (e) => {
    if (e.target.dataset.acao === 'senha-ok') trocar();
    if (e.target.dataset.acao === 'senha-cancelar' || e.target === veu) veu.remove();
  });
}

function modalEncaminhamento(trechos) {
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Tem algo aqui que não entra no sistema</h2>
      <p>Fale com a coordenação — esse caminho é fora daqui. O trecho não foi extraído,
         não foi gravado e não fica em lugar nenhum: some quando você fechar este aviso.</p>
      ${(trechos || []).map(t => `<div class="trecho"><b>${esc(t.categoria)}</b>${esc(t.trecho)}</div>`).join('')}
      <p>Se for situação de proteção, o canal é a coordenação e, quando for o caso, a psicóloga do Instituto —
         com o sigilo certo. O resto do que você contou virou campo normalmente.</p>
      <div class="linha" style="margin-top:16px">
        <button class="btn cresce" data-acao="encaminhamento-ok">Entendi</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);
  veu.querySelector('[data-acao="encaminhamento-ok"]').focus();
  veu.addEventListener('click', (e) => {
    if (e.target.dataset.acao === 'encaminhamento-ok' || e.target === veu) veu.remove();
  });
}

// ======================================================================
// AURORA — assistente-parceiro que flutua em todas as telas
// ======================================================================
// A persona e TODOS os limites moram no servidor (src/assistente.js): aqui é
// só a concha — botão flutuante, painel, fio de conversa, chips da tela, voz
// de entrada (o MESMO blocoDitado de sempre) e voz de saída (speechSynthesis,
// desligada por padrão, nunca por cima do microfone aberto). A ação que o
// Aurora sugere é uma OFERTA: vira botão "Ir para…", e é a pessoa quem toca.
const aurora = {
  sessao: null, trocas: [], rascunho: '',
  som: localStorage.getItem('percurso_aurora_som') === '1',
  ocupado: false, ctl: null, vozTts: null, ttsDestravado: false, falaGen: 0,
  bolhaNestaAbertura: false,   // balão de saudação: uma vez por abertura do app
  painel: null, badge: false, badgeRota: null,
};

function vozDoAurora() {
  if (aurora.vozTts) return aurora.vozTts;
  const vozes = speechSynthesis.getVoices();
  aurora.vozTts = vozes.find(v => /pt[-_]BR/i.test(v.lang) && v.localService)
              || vozes.find(v => /pt[-_]BR/i.test(v.lang))
              || vozes.find(v => /^pt/i.test(v.lang)) || null;
  return aurora.vozTts;
}
if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener?.('voiceschanged', () => { aurora.vozTts = null; });
}

function cancelarFala() {
  aurora.falaGen++;
  try { window.speechSynthesis?.cancel(); } catch {}
}

// iOS só solta a síntese depois de um speak() DENTRO de um gesto — destravar
// no toque (ligar o som, enviar, chip) libera a fala que chega assíncrona.
function destravarTts() {
  if (aurora.ttsDestravado || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
    aurora.ttsDestravado = true;
  } catch {}
}

function falar(texto) {
  if (!aurora.som || !texto || !('speechSynthesis' in window)) return;
  // Nunca por cima de microfone aberto (eco): nem o ditado compartilhado,
  // nem a gravação de 40s da folha (#/voz), que tem reconhecimento próprio.
  if (ditadoAtivo || ctx.voz?.gravando) return;
  cancelarFala();
  const gen = aurora.falaGen;
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR';
  u.rate = 0.97;
  const voz = vozDoAurora();
  if (voz) u.voice = voz;
  // Respiro pós-cancel (iOS engasga com speak colado no cancel). Se nesse
  // meio tempo a pessoa navegou, ligou o mic ou pediu outra fala, não fala.
  setTimeout(() => {
    if (gen !== aurora.falaGen || ditadoAtivo || ctx.voz?.gravando || document.hidden) return;
    try { speechSynthesis.speak(u); } catch {}
  }, 120);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelarFala(); });

/** O girassol do protótipo v3, desenhado: doze pétalas de 8×17 a cada 30°
 *  (#e6a400) e miolo de 17 px (#6b4410), num quadro de 44. Vetor e não caractere
 *  — `❋` vira o que a fonte do aparelho quiser, e não lê como flor. */
const SVG_GIRASSOL = `<svg viewBox="0 0 44 44" width="40" height="40" aria-hidden="true" focusable="false">
  <g fill="#e6a400">${Array.from({ length: 12 }, (_, i) =>
    `<rect x="18" y="1.5" width="8" height="17" rx="4" transform="rotate(${i * 30} 22 22)"/>`).join('')}</g>
  <circle cx="22" cy="22" r="8.5" fill="#6b4410"/>
</svg>`;

function pintarAuroraFab(visivel) {
  let fab = document.getElementById('aurora-fab');
  if (!visivel) { fab?.remove(); document.getElementById('aurora-bolha')?.remove(); return; }
  // O FAB atravessa as rotas, mas o PONTO é por tela: sem esta linha antes do
  // early return, o badge era buscado uma única vez na vida da aba.
  if (fab) { buscarBadge(); return; }
  fab = document.createElement('button');
  fab.id = 'aurora-fab';
  fab.className = 'aurora-fab';
  fab.type = 'button';
  fab.dataset.acao = 'aurora-abrir';
  fab.setAttribute('aria-label', 'Abrir a Aurora, guia do Percurso');
  fab.innerHTML = SVG_GIRASSOL;
  document.body.appendChild(fab);
  // O balão aparece UMA vez por abertura do app (flag em memória — reabrir a
  // página traz a Aurora se apresentando de novo) e some sozinho. Na primeira
  // vez de todas, o texto é a apresentação completa; nas voltas, uma saudação
  // curta pelo horário — o mesmo tom do "Bom dia, Maria" da tela Hoje.
  if (!aurora.bolhaNestaAbertura) {
    aurora.bolhaNestaAbertura = true;
    const primeira = !localStorage.getItem('percurso_aurora_apresentado');
    if (primeira) localStorage.setItem('percurso_aurora_apresentado', '1');
    // A apresentação é a única vez em que a Aurora diz o que ELE é. O badge
    // chegava ~3 ms depois e a sobrescrevia — a apresentação era gasta sem ter
    // sido lida, e o flag já estava consumido.
    aurora.balaoDeApresentacao = primeira;
    const h = new Date().getHours();
    const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const b = document.createElement('div');
    b.id = 'aurora-bolha';
    b.className = 'aurora-bolha';
    b.dataset.acao = 'aurora-abrir';
    b.textContent = primeira
      ? 'Oi! Eu sou a Aurora — toque aqui quando tiver uma dúvida sobre o app.'
      : `${saudacao}! Eu sou a Aurora — qualquer dúvida no caminho, toque aqui.`;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 12000);
  }
  buscarBadge();
}

// O PONTO no FAB — um ponto, nunca um número: contador ao lado do ❋ lê como
// caixa de entrada em dívida; ponto lê como aviso. Acende só quando há sinal
// que o instituto precisa que a pessoa veja, e APAGA quando o sinal esfria (a
// chamada foi feita), não quando a pessoa clica.
async function buscarBadge() {
  const rota = location.hash || '#/hoje';
  if (!sessao || aurora.badgeRota === rota) return;
  aurora.badgeRota = rota;
  try {
    const p = await api(`/api/aurora/painel?tela=${encodeURIComponent(rota)}`, { timeoutMs: 8000 });
    if (aurora.badgeRota !== rota) return;          // navegou no meio: descarta
    aurora.badge = !!p.badge;
    aurora.painel = p;
    pintarPonto();
    // Quando há algo relevante, o balão de saudação carrega a sugestão do dia
    // em vez da frase genérica — é a diferença entre "oi" e "olha isto aqui".
    const b = document.getElementById('aurora-bolha');
    if (b && p.badge && p.sugestoes?.[0] && !aurora.balaoDeApresentacao)
      b.textContent = `${p.sugestoes[0].rotulo} — toque para ver.`;
  } catch { /* badge é enfeite: falha de rede não pode virar erro na tela */ }
}

function pintarPonto() {
  const fab = document.getElementById('aurora-fab');
  if (!fab) return;
  const tem = fab.querySelector('.aurora-ponto');
  if (aurora.badge && !tem) {
    const d = document.createElement('i');
    d.className = 'aurora-ponto';
    d.setAttribute('aria-hidden', 'true');
    fab.appendChild(d);
    fab.setAttribute('aria-label', 'Abrir a Aurora — há algo que vale a pena ver');
  } else if (!aurora.badge && tem) {
    tem.remove();
    fab.setAttribute('aria-label', 'Abrir a Aurora, guia do Percurso');
  }
}

function fecharAurora({ foco = true } = {}) {
  const veu = document.querySelector('.aurora-veu');
  if (!veu) return;
  pararDitado();
  cancelarFala();
  const campo = document.getElementById('aurora-texto');
  if (campo) aurora.rascunho = campo.value;
  veu.remove();
  if (foco) document.getElementById('aurora-fab')?.focus();
}

async function abrirAurora() {
  if (document.querySelector('.aurora-veu')) return;
  document.getElementById('aurora-bolha')?.remove();
  // O painel é da TELA: sem zerar aqui, o resumo e as sugestões da tela
  // anterior ficavam na gaveta e a Aurora afirmava o estado de ontem como se
  // fosse o de hoje quando a busca falhasse.
  aurora.painel = null; aurora.resumo = null;
  const dit = blocoDitado('aurora-texto', 'aurora-ditado-estado');
  const veu = document.createElement('div');
  veu.className = 'veu aurora-veu';
  veu.innerHTML = `
    <div class="aurora-sheet" role="dialog" aria-modal="true" aria-labelledby="aurora-titulo">
      <div class="aurora-cabeca">
        <div>
          <h2 id="aurora-titulo">Aurora</h2>
          <p class="sub" id="aurora-sub">seu parceiro no Percurso</p>
        </div>
        <div class="linha" style="gap:8px;flex-wrap:nowrap">
          <button type="button" class="aurora-som" data-acao="aurora-som" aria-pressed="${aurora.som}"
                  aria-label="${aurora.som ? 'Desligar a voz da Aurora' : 'Ligar a voz da Aurora'}">voz</button>
          <button type="button" class="aurora-fechar" data-acao="aurora-fechar" aria-label="Fechar a Aurora">×</button>
        </div>
      </div>
      <div class="aurora-fio" id="aurora-fio"></div>
      <p class="oculto-acessivel" id="aurora-vivo" aria-live="polite"></p>
      <div class="aurora-chips" id="aurora-chips"></div>
      <div class="aurora-entrada">
        <textarea id="aurora-texto" rows="1" maxlength="500" placeholder="Pergunte aqui…"
                  aria-label="Sua pergunta para a Aurora"></textarea>
        ${dit.botao}
        <button type="button" class="btn aurora-enviar" data-acao="aurora-enviar" ${aurora.ocupado ? 'disabled' : ''}>Enviar</button>
      </div>
      ${dit.estado}
    </div>`;
  document.body.appendChild(veu);
  prenderFoco(veu);
  veu.addEventListener('click', (e) => { if (e.target === veu) fecharAurora(); });
  if (!aurora.trocas.length) {
    aurora.trocas.push({ quem: 'aurora', semente: true, resposta:
      'Oi! Eu sou a Aurora, seu parceiro aqui no Percurso. Eu conheço as telas e as tarefas do app, e sei contar quantas coisas estão em aberto — nunca quem. Não abro a ficha de ninguém. Pergunte, por exemplo: "como faço a chamada?"' });
  }
  pintarAuroraFio();
  const campo = document.getElementById('aurora-texto');
  campo.value = aurora.rascunho || '';
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.querySelector('[data-acao="aurora-enviar"]')?.click();
    }
  });
  campo.focus();
  try {
    const p = await api(`/api/aurora/painel?tela=${encodeURIComponent(location.hash || '#/hoje')}`);
    aurora.painel = p;
    aurora.resumo = p.resumo || null;
    pintarAuroraSugestoes();
    // Com resumo do dia, a saudação-semente sai: as duas abrem o fio e dizer a
    // mesma coisa duas vezes é o defeito que o painel existe para não ter.
    if (p.resumo && aurora.trocas.length === 1 && aurora.trocas[0].semente) aurora.trocas = [];
    pintarAuroraFio();
  } catch { /* sem painel não é erro: o campo continua lá */ }
  // O refinamento pelo Qwen roda DEPOIS de a tela estar pintada e nunca é
  // esperado: se chegar, troca rótulos no lugar; se falhar, sumir ou demorar,
  // nada muda visualmente. O `hash` impede um refinamento velho de reescrever
  // um painel que já mudou de tela.
  refinarPainel();
  try {
    const m = await api('/api/aurora/memoria');
    aurora.memoria = m;
    // O convite acontece UMA vez, em primeiro plano, e a resposta padrão é
    // "agora não". A única coisa deste produto que grava algo sobre a pessoa
    // não pode nascer ligada com o aviso enterrado numa seção que ela talvez
    // nunca role.
    if (m.ligada && !m.convidado) pintarConvite();
    pintarRodapeMemoria();
  } catch {}
}

// Telemetria da Aurora: SÓ o que a pessoa faz com ele. `keepalive` e falha
// engolida — isto nunca pode virar toast nem travar a tela. No servidor é
// no-op silencioso enquanto o aprendizado está desligado (o padrão).
function marcarUso(id, evento) {
  if (!id || id.startsWith('guia:')) return;
  try {
    fetch('/api/aurora/uso', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, evento, tela: location.hash || '#/hoje' }),
    }).catch(() => {});
  } catch {}
}

/** Os chips deixam de ser lista fixa e passam a ser o painel do estado real. */
function pintarAuroraSugestoes() {
  const el = document.getElementById('aurora-chips');
  const p = aurora.painel;
  if (!el || !p) return;
  for (const s of p.sugestoes || []) marcarUso(s.id, 'mostrada');
  el.innerHTML = (p.sugestoes || []).map(s => `
    <span class="aurora-sug" data-id="${esc(s.id)}">
      <button type="button" class="aurora-chip" data-acao="aurora-sug" data-tipo="${esc(s.tipo)}"
        >${esc(s.rotulo)}</button>${s.silenciavel && !s.id.startsWith('guia:')
      ? `<button type="button" class="aurora-adiar" data-acao="aurora-adiar"
           aria-label="Hoje não: ${esc(s.rotulo)}">×</button>` : ''}
    </span>`).join('');
}

async function refinarPainel() {
  const p = aurora.painel;
  if (!p || !p.sugestoes?.length) return;
  const hash = p.hash;
  try {
    const r = await post('/api/aurora/refinar', { tela: location.hash || '#/hoje' }, { timeoutMs: 9000 });
    if (!r.refinado || aurora.painel?.hash !== hash) return;   // painel trocou: descarta
    const porId = new Map(aurora.painel.sugestoes.map(s => [s.id, s]));
    // `rotuloBase` preservado: o rótulo do modelo é superfície do CHIP e nada
    // mais. Sem isto, ele era empurrado no fio como `quem: 'voce'` — a pessoa
    // via, atribuída a si, uma frase que ela nunca escreveu ("O áudio tá
    // gravado onde?") e o TTS lia aquilo como se fosse dela.
    for (const { id, rotulo } of (r.rotulos || [])) {
      const s = porId.get(id);
      if (s) { s.rotuloBase ??= s.rotulo; s.rotulo = rotulo; }
    }
    const ordem = (r.ordem || []).map(id => porId.get(id)).filter(Boolean);
    const resto = aurora.painel.sugestoes.filter(s => !ordem.includes(s));
    aurora.painel.sugestoes = [...ordem, ...resto];
    aurora.painel.origem = 'modelo';
    pintarAuroraSugestoes();
  } catch { /* refinamento é enfeite: falhar é gratuito e invisível */ }
}

function pintarConvite() {
  const el = document.getElementById('aurora-chips');
  if (!el || document.getElementById('aurora-convite')) return;
  el.insertAdjacentHTML('beforebegin', `
    <div class="aurora-convite" id="aurora-convite">
      <p><b>Posso ficar mais útil?</b> Se você deixar, eu aurora a reparar no que você toca
      aqui dentro para trazer primeiro o que costuma te servir. Eu conto só o que você faz
      COMIGO — nunca o que você faz no Percurso, nunca o texto das suas perguntas, nunca
      nome de criança, e nem a hora, só o dia.</p>
      <div class="linha" style="margin-top:10px">
        <button type="button" class="btn pequeno" data-acao="aurora-aprender" data-v="1">Pode reparar</button>
        <button type="button" class="btn pequeno secundario" data-acao="aurora-aprender" data-v="0">Agora não</button>
      </div>
    </div>`);
}

const AURORA_TIPOS = [
  ['acao', 'Atalhos de ação'],
  ['duvida', 'Dúvidas da tela'],
  ['aprimoramento', 'Pontos de melhoria'],
  ['pergunta', 'Perguntas'],
];

/** "O que eu lembro de você" — leitura E controle, no mesmo lugar. */
async function abrirMemoria({ recarregar = false } = {}) {
  const m = (recarregar ? null : aurora.memoria) || await api('/api/aurora/memoria').catch(() => null);
  if (!m) return;
  aurora.memoria = m;
  document.getElementById('aurora-memoria')?.remove();
  const tocadas = m.linhas.filter(l => l.familia === 'sugestao' && l.evento === 'aceita').slice(0, 4);
  const tipos = m.linhas.filter(l => l.familia === 'tipo' && l.evento === 'aceita');
  const rotuloTipo = (k) => AURORA_TIPOS.find(t => t[0] === k)?.[1] ?? k;

  const html = `
    <div class="aurora-memoria" id="aurora-memoria">
      <div class="linha" style="justify-content:space-between;align-items:flex-start">
        <b>O que eu lembro de você</b>
        <button type="button" class="aurora-fechar" data-acao="aurora-fechar-memoria" aria-label="Fechar">×</button>
      </div>

      <div class="aurora-opcao">
        <span>Aprender com o meu uso</span>
        <button type="button" class="p ${m.aprender ? 'on' : 'off'}" data-acao="aurora-aprender"
          data-v="${m.aprender ? 0 : 1}" aria-pressed="${!!m.aprender}">${m.aprender ? 'ligado' : 'desligado'}</button>
      </div>
      <div class="aurora-opcao">
        <span>Abrir com o resumo do dia</span>
        <button type="button" class="p ${m.resumo_do_dia ? 'on' : 'off'}" data-acao="aurora-resumo-dia"
          data-v="${m.resumo_do_dia ? 0 : 1}" aria-pressed="${!!m.resumo_do_dia}">${m.resumo_do_dia ? 'ligado' : 'desligado'}</button>
      </div>

      <p class="lbl" style="margin-top:12px">Eu gosto mais de…</p>
      <div class="aurora-chips" style="padding:6px 0">
        ${AURORA_TIPOS.map(([k, rot]) => `<button type="button" class="aurora-chip ${m.prefere_tipo === k ? 'on' : ''}"
            data-acao="aurora-prefere" data-v="${k}" aria-pressed="${m.prefere_tipo === k}">${esc(rot)}</button>`).join('')}
        <button type="button" class="aurora-chip ${!m.prefere_tipo ? 'on' : ''}" data-acao="aurora-prefere"
          aria-pressed="${!m.prefere_tipo}">Sem preferência</button>
      </div>
      <p class="aurora-porque">Isto vale já na próxima vez que você me abrir, e não depende de eu ter aprendido nada.</p>

      ${m.aprender ? `
        <p class="lbl" style="margin-top:12px">O que eu já reparei</p>
        <p class="aurora-porque">
          ${tocadas.length ? `Você tocou: ${tocadas.map(l => `${esc(l.chave)} (${l.n}×)`).join(' · ')}.` : 'Ainda não sei nada do seu uso.'}
          ${tipos.length ? ` Tipos que você mais usa: ${tipos.map(l => `${esc(rotuloTipo(l.chave))} ${l.n}×`).join(' · ')}.` : ''}
          ${m.silenciadas.length ? ` ${m.silenciadas.length} silenciada(s) — a mais próxima volta em ${dataBR(m.silenciadas[0].ate)}.` : ''}
        </p>` : ''}

      <p class="aurora-porque" style="margin-top:10px">${esc(m.politica)}</p>
      <div class="linha" style="margin-top:10px">
        <button type="button" class="btn pequeno fantasma" data-acao="aurora-esquecer">Esquecer tudo o que eu aprendi</button>
      </div>
    </div>`;
  document.getElementById('aurora-chips')?.insertAdjacentHTML('beforebegin', html);
  document.getElementById('aurora-memoria')?.scrollIntoView({ block: 'nearest' });
}

function pintarRodapeMemoria() {
  const sheet = document.querySelector('.aurora-sheet');
  const m = aurora.memoria;
  if (!sheet || !m?.ligada || document.getElementById('aurora-memoria-link')) return;
  sheet.insertAdjacentHTML('beforeend',
    `<button type="button" class="aurora-memlink" id="aurora-memoria-link" data-acao="aurora-memoria"
      >o que eu lembro de você${m.aprender ? '' : ' · não estou aprendendo'}</button>`);
}

function pintarAuroraFio() {
  const fio = document.getElementById('aurora-fio');
  if (!fio) return;
  // O resumo do dia abre o fio e sobrevive à repintura — ele é o estado da
  // pessoa hoje, não uma mensagem da conversa.
  fio.innerHTML = (aurora.resumo ? `<p class="aurora-resumo">${esc(aurora.resumo)}</p>` : '')
    + aurora.trocas.map(t => {
    if (t.quem === 'voce') return `<div class="aurora-msg voce">${esc(t.texto)}</div>`;
    if (t.pensando) return `<div class="aurora-msg aurora">✷ pensando…
        <button type="button" class="btn pequeno fantasma" data-acao="aurora-cancelar" style="margin-left:8px">Cancelar</button></div>`;
    // A oferta some quando a pessoa JÁ está na tela oferecida — "Ir para Hoje"
    // dentro do Hoje seria botão morto.
    const oferta = t.acao && !(location.hash || '#/hoje').startsWith(t.acao.hash);
    return `<div class="aurora-msg aurora">${esc(t.resposta)}${(t.trechos || []).map(x =>
        `<div class="trecho"><b>${esc(x.categoria)}</b>${esc(x.trecho)}</div>`).join('')}${
      // "apareceu porque …": a sugestão diz de onde veio. Sem isso ela é
      // palpite; com isso é leitura de estado, e a pessoa pode discordar.
      t.porque ? `<p class="aurora-porque">apareceu porque ${esc(t.porque)}</p>` : ''}${
      t.fonte ? `<p class="aurora-porque">número vindo de ${esc(t.fonte)} — nenhum modelo participou</p>` : ''}${oferta
      ? `<div style="margin-top:10px"><button type="button" class="btn secundario pequeno" data-acao="aurora-ir"
           data-sug="${esc(t.sugestao || '')}" data-href="${esc(t.acao.hash)}">Ir para ${esc(t.acao.rotulo)}</button></div>` : ''}</div>`;
  }).join('');
  fio.scrollTop = fio.scrollHeight;
  // aria-live num nó próprio com SÓ a última fala da Aurora: reescrever o fio
  // inteiro dentro de uma região viva fazia o leitor de tela reanunciar a
  // conversa toda a cada troca.
  const vivo = document.getElementById('aurora-vivo');
  if (vivo) {
    const ultima = [...aurora.trocas].reverse().find(t => t.quem === 'aurora');
    vivo.textContent = ultima ? (ultima.pensando ? 'Pensando…' : ultima.resposta) : '';
  }
}

async function auroraEnviar(texto) {
  const t = String(texto || '').trim();
  if (!t || aurora.ocupado) return;
  aurora.ocupado = true;
  aurora.rascunho = '';
  aurora.trocas.push({ quem: 'voce', texto: t });
  const pensando = { quem: 'aurora', pensando: true };
  aurora.trocas.push(pensando);
  pintarAuroraFio();
  document.querySelector('.aurora-enviar')?.setAttribute('disabled', '');
  const ctl = new AbortController();
  aurora.ctl = ctl;
  try {
    const r = await post('/api/assistente',
      { message: t, session_id: aurora.sessao, tela: location.hash || '#/hoje' },
      { timeoutMs: 75000, signal: ctl.signal });
    aurora.sessao = r.session_id;
    // Perímetro (total ou parcial): os trechos retidos e o aviso do caminho
    // humano aparecem no fio — retenção nunca é silenciosa.
    if (r.aviso_perimetro) {
      aurora.trocas.splice(aurora.trocas.indexOf(pensando), 0, { quem: 'aurora', resposta: r.aviso_perimetro, trechos: r.trechos_excluidos || null });
    }
    Object.assign(pensando, { pensando: false, resposta: r.resposta, acao: r.acao || null, trechos: r.trechos || null });
    // Só fala com o painel aberto: resposta que chega depois de fechar não
    // pode virar uma voz saindo do nada no meio da sala.
    if (r.fala && document.querySelector('.aurora-veu')) falar(r.fala);
  } catch (e) {
    aurora.trocas.splice(aurora.trocas.indexOf(pensando), 1);
    if (e.status === 401) {
      // Mesma convenção do app inteiro: sessão expirada leva ao #/entrar —
      // nunca vira bolha de erro em loop dentro do painel.
      fecharAurora({ foco: false });
      sessao = null;
      location.hash = '#/entrar';
      return;
    }
    if (e.cancelado) {
      // Rascunho devolvido: cancelar não come a pergunta.
      aurora.rascunho = t;
      const campo = document.getElementById('aurora-texto');
      if (campo && !campo.value.trim()) campo.value = t;
    } else if (e.rede) {
      aurora.trocas.push({ quem: 'aurora', resposta:
        'Estou sem conexão com o servidor agora — mas o Percurso segue: registro feito sem internet entra na fila e sobe sozinho quando a conexão voltar. Me chama de novo daqui a pouco?' });
    } else {
      aurora.trocas.push({ quem: 'aurora', resposta: e.message });
    }
  } finally {
    aurora.ocupado = false;
    aurora.ctl = null;
    document.querySelector('.aurora-enviar')?.removeAttribute('disabled');
    pintarAuroraFio();
    // A repintura destrói o botão Cancelar: se o foco caiu no body (fora do
    // focus-trap), ele volta para o campo de pergunta.
    const veu = document.querySelector('.aurora-veu');
    if (veu && !veu.contains(document.activeElement)) document.getElementById('aurora-texto')?.focus();
  }
}

document.addEventListener('click', comErro(async (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const a = alvo.dataset.acao;

  if (a === 'aurora-abrir') {
    if (document.querySelector('.aurora-veu')) fecharAurora();
    else await abrirAurora();
    return;
  }
  if (a === 'aurora-fechar') { fecharAurora(); return; }
  if (a === 'aurora-som') {
    aurora.som = !aurora.som;
    localStorage.setItem('percurso_aurora_som', aurora.som ? '1' : '0');
    alvo.setAttribute('aria-pressed', String(aurora.som));
    alvo.setAttribute('aria-label', aurora.som ? 'Desligar a voz da Aurora' : 'Ligar a voz da Aurora');
    if (aurora.som) destravarTts(); else cancelarFala();
    return;
  }
  if (a === 'aurora-enviar') {
    pararDitado();   // fala pendente já entrou no campo; mic desliga antes do envio
    destravarTts();
    const campo = document.getElementById('aurora-texto');
    const v = campo?.value ?? '';
    if (campo) campo.value = '';
    await auroraEnviar(v);
    return;
  }
  if (a === 'aurora-chip') {
    destravarTts();
    await auroraEnviar(alvo.textContent);
    return;
  }
  // Toque numa sugestão do painel. pergunta/dúvida viram conversa (o
  // comportamento de sempre); ação/aprimoramento abrem um CARD no fio com o
  // texto completo, o porquê e a oferta — dois toques até navegar, porque a
  // oferta continua sendo oferta.
  if (a === 'aurora-sug') {
    destravarTts();
    const id = alvo.closest('.aurora-sug')?.dataset.id;
    const s = (aurora.painel?.sugestoes || []).find(x => x.id === id);
    if (!s) { await auroraEnviar(alvo.textContent); return; }
    // TOCAR já é o sinal positivo. Sem isto, 'aceita' só existia no botão
    // "Ir para", que pergunta e dúvida nunca têm: a Aurora só conseguia
    // aprender a ESCONDER — penalizava por fadiga justamente o que a pessoa
    // mais usa, e nunca recompensava.
    marcarUso(s.id, 'aceita');
    if (s.resposta) {
      // Pergunta agregada: o número já veio do banco com o painel. Não há ida
      // ao servidor nem ao modelo — e nunca é falada.
      aurora.trocas.push({ quem: 'voce', texto: s.rotuloBase ?? s.rotulo });
      aurora.trocas.push({ quem: 'aurora', resposta: s.resposta.texto, acao: s.acao, fonte: s.resposta.fonte });
      pintarAuroraFio();
      return;
    }
    if (s.tipo === 'pergunta' || s.tipo === 'duvida') {
      if (s.texto && s.texto !== s.rotulo) {
        aurora.trocas.push({ quem: 'voce', texto: s.rotuloBase ?? s.rotulo });
        aurora.trocas.push({ quem: 'aurora', resposta: s.texto, acao: s.acao, porque: s.porque });
        pintarAuroraFio();
        return;
      }
      await auroraEnviar(s.rotuloBase ?? s.rotulo);
      return;
    }
    aurora.trocas.push({ quem: 'aurora', resposta: s.texto, acao: s.acao, porque: s.porque, sugestao: s.id });
    pintarAuroraFio();
    return;
  }
  if (a === 'aurora-adiar') {
    const span = alvo.closest('.aurora-sug');
    const id = span?.dataset.id;
    const s = (aurora.painel?.sugestoes || []).find(x => x.id === id);
    span?.remove();
    if (aurora.painel) aurora.painel.sugestoes = aurora.painel.sugestoes.filter(x => x.id !== id);
    marcarUso(id, 'dispensada');
    // O produto não mente sobre o que o botão faz: item núcleo volta amanhã, e
    // a frase diz isso. Nunca existe "nunca mais me mostre".
    toast(s?.nucleo
      ? 'Tudo bem — hoje eu não trago mais. Amanhã eu trago de novo, porque é ponto que o instituto precisa ver.'
      : 'Tudo bem — eu guardo essa por umas duas semanas.');
    return;
  }
  if (a === 'aurora-aprender') {
    const liga = alvo.dataset.v === '1';
    document.getElementById('aurora-convite')?.remove();
    aurora.memoria = await post('/api/aurora/memoria', { aprender: liga, convidado: true })
      .then(() => api('/api/aurora/memoria')).catch(() => aurora.memoria);
    document.getElementById('aurora-memoria-link')?.remove();
    pintarRodapeMemoria();
    if (document.getElementById('aurora-memoria')) await abrirMemoria({ recarregar: true });
    toast(liga ? 'Combinado — vou reparar no que te serve.' : 'Tudo bem, sigo sem reparar em nada.');
    return;
  }
  if (a === 'aurora-memoria') { await abrirMemoria(); return; }
  if (a === 'aurora-fechar-memoria') { document.getElementById('aurora-memoria')?.remove(); return; }
  // Os dois controles que faltavam: o tipo que a pessoa prefere (a alavanca de
  // personalização que ela SENTE no primeiro dia, sem telemetria nenhuma) e o
  // resumo do dia. Antes existiam só no servidor, alcançáveis pela API.
  if (a === 'aurora-prefere') {
    const v = alvo.dataset.v || null;
    aurora.memoria = await post('/api/aurora/memoria', { prefere_tipo: v })
      .then(() => api('/api/aurora/memoria')).catch(() => aurora.memoria);
    await abrirMemoria({ recarregar: true });
    toast(v ? 'Combinado — trago esse tipo primeiro quando couber.' : 'Sem preferência: eu ordeno pelo que for mais urgente.');
    return;
  }
  if (a === 'aurora-resumo-dia') {
    const liga = alvo.dataset.v === '1';
    aurora.memoria = await post('/api/aurora/memoria', { resumo_do_dia: liga })
      .then(() => api('/api/aurora/memoria')).catch(() => aurora.memoria);
    await abrirMemoria({ recarregar: true });
    toast(liga ? 'Volto a abrir com o resumo do dia.' : 'Não abro mais com o resumo.');
    return;
  }
  if (a === 'aurora-esquecer') {
    const r = await api('/api/aurora/memoria', { method: 'DELETE' });
    aurora.memoria = await api('/api/aurora/memoria').catch(() => aurora.memoria);
    if (document.getElementById('aurora-memoria')) await abrirMemoria({ recarregar: true });
    toast(r.aviso || 'Apaguei o que eu sabia do seu uso.', 'bom');
    return;
  }
  if (a === 'aurora-cancelar') { aurora.ctl?.abort(); return; }
  if (a === 'aurora-ir') {
    // Defesa em profundidade (plano rev 2): o hash vem do servidor já filtrado
    // por papel, mas o clique revalida contra o mapa local antes de navegar.
    const destino = alvo.dataset.href;
    const permitidas = AURORA_ROTAS_POR_PAPEL[sessao?.papel] ?? [];
    // Compara o CAMINHO, não a string inteira. Com a fusão de telas (F2) um
    // destino legítimo passou a carregar query (`#/pessoas?aba=arquivo`), e
    // igualdade exata voltaria a engolir a sugestão com um `return` mudo — o
    // mesmo defeito que a nota acima registra ter acontecido com `#/consulta`.
    if (!permitidas.includes(destino.split('?')[0])) return;
    marcarUso(alvo.dataset.sug, 'aceita');
    fecharAurora({ foco: false });
    location.hash = destino;
    return;
  }
}));

const AURORA_ROTAS_POR_PAPEL = {
  educador: ['#/hoje', '#/chamada', '#/registrar', '#/sai-daqui', '#/turma', '#/crianca', '#/pensar'],
  profissional: ['#/hoje', '#/chamada', '#/registrar', '#/sai-daqui', '#/turma', '#/crianca', '#/pensar'],
  // '#/consulta' entrou em 03/09/2026: `exigeGestao` autoriza coordenação E
  // diretoria (src/api.js), e o painel dela já oferece o botão 'Perguntar à
  // base'. Sem a rota aqui, uma sugestão da Aurora para essa tela era engolida
  // com um `return` mudo — sem navegação e sem aviso.
  coordenacao: ['#/painel', '#/consentimentos', '#/pessoas', '#/crianca', '#/sai-daqui', '#/relatorio', '#/divulgar', '#/pensar'],
  diretoria: ['#/relatorio', '#/divulgar'],
};

// ======================================================================
// ACOES — delegacao unica de eventos
// ======================================================================
document.addEventListener('click', comErro(async (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const a = alvo.dataset.acao;

  if (a === 'ir')          { location.hash = alvo.dataset.href; return; }
  if (a === 'recarregar')  { navegar(); return; }
  if (a === 'imprimir')    { window.print(); return; }

  // AUTENTICAÇÃO (decisão 39). Antes, "entrar" era escolher um perfil e pronto.
  if (a === 'salvar-relato-grupo') {
    const f = ctx.folha;
    const erroEl = document.getElementById('relato-grupo-erro');
    if (erroEl) erroEl.textContent = '';
    alvo.disabled = true;
    try {
      await post('/api/relato-grupo', { turma_id: f.turma.id, data: f.data, texto: document.getElementById('relato-grupo').value });
      toast('Relato guardado com a folha.', 'bom');
    } catch (e) {
      // O erro fica NO BLOCO, não num toast que some: quem escreveu um nome
      // precisa da mensagem enquanto reescreve.
      if (erroEl) erroEl.textContent = e.message;
    } finally { alvo.disabled = false; }
    return;
  }

  if (a === 'salvar-relato-crianca') {
    const erroEl = document.getElementById('relato-crianca-erro');
    if (erroEl) erroEl.textContent = '';
    alvo.disabled = true;
    try {
      await post('/api/relato-crianca', { crianca_id: Number(alvo.dataset.id), texto: document.getElementById('relato-crianca').value });
      toast('Relato guardado na ficha.', 'bom');
      navegar();
    } catch (e) { if (erroEl) erroEl.textContent = e.message; }
    finally { alvo.disabled = false; }
    return;
  }

  if (a === 'apagar-relato-crianca') {
    if (!confirm('Apagar este relato? Não dá para desfazer.')) return;
    await api('/api/relato-crianca', { method: 'DELETE', body: JSON.stringify({ id: Number(alvo.dataset.id) }) });
    toast('Relato apagado.');
    navegar();
    return;
  }

  if (a === 'trocar-senha') { modalTrocarSenha(); return; }

  if (a === 'redefinir-senha') {
    // A coordenação devolve alguém ao primeiro acesso. É o caminho de
    // recuperação: não existe "esqueci a senha" num produto que não manda
    // e-mail — e inventar um seria inventar um servidor de e-mail.
    if (!confirm(`Devolver ${alvo.dataset.nome} ao primeiro acesso? A senha atual dela deixa de valer e ela cria uma nova ao entrar.`)) return;
    const r = await post('/api/senha/redefinir', { educador_id: Number(alvo.dataset.id) });
    toast(r.aviso, 'bom');
    navegar();
    return;
  }

  if (a === 'escolher-perfil') {
    const primeiro = alvo.dataset.primeiro === '1';
    const nome = alvo.dataset.nome;
    document.getElementById('lista-perfis').hidden = true;
    document.getElementById('form-senha').innerHTML = `
      <div class="linha"><button class="btn pequeno fantasma" data-acao="voltar-perfis">‹ Outra pessoa</button></div>
      <h2 style="margin-top:12px">${esc(nome)}</h2>
      <p class="sub">${primeiro
        ? `Primeiro acesso: crie a sua senha. Ela vale só neste Instituto — mínimo de 8 caracteres, e uma frase curta serve.`
        : 'Digite a sua senha.'}</p>
      <label class="rot-campo" for="senha">Senha</label>
      <input type="password" id="senha" autocomplete="${primeiro ? 'new-password' : 'current-password'}"
             data-acao="senha-campo" data-id="${alvo.dataset.id}" placeholder="${primeiro ? 'pelo menos 8 caracteres' : ''}">
      <p class="sub" id="senha-erro" role="alert" style="min-height:18px"></p>
      <button class="btn largo" data-acao="entrar" data-id="${alvo.dataset.id}">${primeiro ? 'Criar a senha e entrar' : 'Entrar'}</button>`;
    document.getElementById('senha').focus();
    return;
  }

  if (a === 'voltar-perfis') {
    document.getElementById('form-senha').innerHTML = '';
    document.getElementById('lista-perfis').hidden = false;
    return;
  }

  if (a === 'entrar') {
    const campo = document.getElementById('senha');
    const erroEl = document.getElementById('senha-erro');
    alvo.disabled = true;
    let usuario;
    try {
      ({ usuario } = await post('/api/sessao', { educador_id: Number(alvo.dataset.id), senha: campo?.value ?? '' }));
    } catch (e) {
      // O erro fica NO FORMULÁRIO, não num toast que some: quem errou a senha
      // precisa da mensagem enquanto digita de novo.
      if (erroEl) erroEl.textContent = e.message;
      campo?.select();
      return;
    } finally { alvo.disabled = false; }
    limparEstadoLocal();
    sessao = usuario;
    location.hash = usuario.papel === 'coordenacao' ? '#/painel'
                  : usuario.papel === 'diretoria' ? '#/relatorio' : '#/hoje';
    if (!location.hash) navegar();
    navegar();
    // A sessão pode ter expirado com registros na fila: sem isto eles ficavam
    // presos mostrando "N na fila" até um reload que ninguém sabe que precisa
    // dar, porque o evento `online` não dispara num aparelho já conectado.
    drenarFila();
    return;
  }

  if (a === 'sair') {
    pararDitado();
    cancelarFala();
    aurora.ctl?.abort();
    if (aurora.sessao) { try { await api('/api/assistente/sessao', { method: 'DELETE', body: JSON.stringify({ session_id: aurora.sessao }) }); } catch {} }
    if (copiloto.sessao) { try { await api('/api/copilot/sessao', { method: 'DELETE', body: JSON.stringify({ session_id: copiloto.sessao }) }); } catch {} }
    await post('/api/sair');
    limparEstadoLocal();
    sessao = null; location.hash = '#/entrar'; navegar();
    return;
  }

  // ---- chamada ----
  if (a === 'marcar') {
    const id = Number(alvo.dataset.id), v = alvo.dataset.v;
    ctx.chamada.marcas[id] = ctx.chamada.marcas[id] === v ? null : v;
    alvo.parentElement.querySelectorAll('button').forEach(b =>
      b.setAttribute('aria-pressed', String(ctx.chamada.marcas[id] === b.dataset.v)));
    atualizarContador();
    return;
  }

  if (a === 'todos') {
    Object.keys(ctx.chamada.marcas).forEach(k => { ctx.chamada.marcas[k] = 'P'; });
    document.querySelectorAll('#lista .pf button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.v === 'P')));
    atualizarContador();
    return;
  }

  if (a === 'salvar-chamada') {
    alvo.disabled = true;
    try {
      const c = ctx.chamada;
      const marcacoes = Object.entries(c.marcas).map(([id, status]) => ({ crianca_id: Number(id), status }));
      const duracao = Math.max(1, Math.round((performance.now() - c.inicio) / 1000));
      let r;
      try { r = await post('/api/chamada', { turma_id: c.turma.id, data: c.data, marcacoes, duracao_segundos: duracao }); }
      catch (e) {
        if (!e.rede) throw e;
        await postComFila('/api/chamada', { turma_id: c.turma.id, data: c.data, marcacoes, duracao_segundos: duracao }, 'Chamada');
        location.hash = '#/hoje'; navegar();
        return;
      }
      const presentes = marcacoes.filter(m => m.status === 'P').length;
      const dSeg = Math.round((performance.now() - c.inicio) / 1000);
      toast(`Chamada de ${dataBR(c.data)} salva · ${presentes} presentes · ${Math.floor(dSeg / 60)}m${String(dSeg % 60).padStart(2, '0')}s de registro.`, 'bom');
      // OFERECE, não navega (F3). Salvar a chamada e ser levada para OUTRA data
      // sem pedir é o sistema decidindo o próximo passo pela pessoa — e ela
      // acabou de terminar uma tarefa. A oferta fica no Hoje, onde ela já vai.
      location.hash = '#/hoje';
      if (r.abertas?.length) {
        toast(`Ainda há ${r.abertas.length} data(s) em aberto — estão no Hoje quando você quiser.`);
      }
    } finally { alvo.disabled = false; }
    return;
  }

  if (a === 'trocar-data') return;   // tratado no evento change

  // ---- observacao ----
  if (a === 'ancora') {
    const dim = Number(alvo.dataset.dim), nivel = Number(alvo.dataset.nivel);
    ctx.obs.marcas[dim] = ctx.obs.marcas[dim] === nivel ? undefined : nivel;
    if (ctx.obs.marcas[dim] === undefined) delete ctx.obs.marcas[dim];
    alvo.closest('.ancoras').querySelectorAll('.ancora').forEach(b =>
      b.setAttribute('aria-pressed', String(ctx.obs.marcas[dim] === Number(b.dataset.nivel))));
    atualizarObs();
    return;
  }

  if (a === 'salvar-obs') {
    const concluir = alvo.dataset.concluir === '1';
    const itens = Object.entries(ctx.obs.marcas).map(([d, n]) => ({ dimensao_id: Number(d), nivel: n }));
    alvo.disabled = true;
    try {
      const r = await post('/api/observacao', { crianca_id: ctx.obs.criancaId, itens, concluir });
      toast(concluir ? 'Observação concluída.' : 'Rascunho guardado — dá para voltar quando quiser.', 'bom');
      await depoisDaObservacao(r, concluir);
    } finally { alvo.disabled = false; }
    return;
  }

  if (a === 'fechar-festa') {
    pararFesta();
    location.hash = alvo.dataset.href;
    navegar();
    return;
  }

  if (a === 'magia-pular') { pularMagia(); return; }

  if (a === 'ditado') {
    const campo = document.getElementById(alvo.dataset.campo);
    const estadoEl = document.getElementById(alvo.dataset.estado);
    if (!campo) return;
    if (ditadoAtivo?.botao === alvo) { pararDitado(); return; }  // segundo toque = parar
    // Dois reconhecimentos ao mesmo tempo derrubam um ao outro no Chrome: com
    // a gravação de 40s da folha aberta, o ditado espera a pessoa decidir.
    if (ctx.voz?.gravando) { toast('A gravação do relato está aberta — pause-a antes de ditar em outro campo.'); return; }
    pararDitado();
    cancelarFala();   // a Aurora cala quando o microfone abre (anti-eco)
    iniciarDitado(alvo, campo, estadoEl);
    return;
  }

  // ---- alertas ----
  if (a === 'tratar-alerta') {
    const tratativa = alvo.dataset.status === 'em_acompanhamento'
      ? 'Coordenação avisada pela educadora; contato com a família em andamento.'
      : 'Situação resolvida pela equipe.';
    await post('/api/alerta', { id: Number(alvo.dataset.id), status: alvo.dataset.status, tratativa });
    toast(alvo.dataset.status === 'resolvido' ? 'Alerta encerrado.' : 'Coordenação avisada.', 'bom');
    navegar();
    return;
  }

  // ---- folha do dia / confirmacao (F2, F6) ----
  if (a === 'pill') {
    const g = alvo.dataset.grupo, cod = alvo.dataset.codigo, unico = alvo.dataset.unico === '1';
    const c = ctx.folha.campos;
    if (unico) {
      const neutro = g === 'atividade' ? 'nao_identificada' : g === 'procedimento' ? 'nao_identificado' : 'nenhuma';
      c[g] = c[g] === cod ? neutro : cod;
      alvo.parentElement.querySelectorAll('.p').forEach(b => {
        const on = c[g] === b.dataset.codigo;
        b.classList.toggle('on', on); b.classList.toggle('off', !on);
        b.setAttribute('aria-pressed', String(on));
      });
    } else {
      const i = c[g].indexOf(cod);
      if (i >= 0) c[g].splice(i, 1);
      else if (c[g].length >= ctx.folha.catalogos.max_marcadores) {
        toast(`Até ${ctx.folha.catalogos.max_marcadores} marcadores — tire um antes de pôr outro.`);
        return;
      } else c[g].push(cod);
      const on = c[g].includes(cod);
      alvo.classList.toggle('on', on); alvo.classList.toggle('off', !on);
      alvo.setAttribute('aria-pressed', String(on));
    }
    return;
  }

  if (a === 'ajuda' || a === 'ajuda-valor') {
    const c = ctx.folha.campos;
    c.pediram_ajuda = a === 'ajuda-valor'
      ? Number(alvo.dataset.v)
      : Math.max(0, Math.min(30, c.pediram_ajuda + Number(alvo.dataset.d)));
    repintarBlocosDaFolha();
    return;
  }

  if (a === 'checkin' || a === 'checkin-valor') {
    const ck = ctx.folha.campos.checkin, campo = alvo.dataset.campo;
    const max = ctx.folha.catalogos.checkin_max ?? 30;
    let v;
    if (a === 'checkin-valor') {
      v = alvo.dataset.v === '' ? null : Number(alvo.dataset.v);
    } else {
      const d = Number(alvo.dataset.d);
      // "—" (não informado) vira 0 no primeiro toque em "+", e volta a "—" no "−" abaixo de zero.
      v = ck[campo] == null ? (d > 0 ? 0 : null) : ck[campo] + d;
      if (v != null && v < 0) v = null;
    }
    if (v != null && v > max) v = max;
    // REGRA SIMÉTRICA (F3). Era assimétrica: baixar `conflitos` corrigia
    // `resolvidos` sozinho, mas subir `resolvidos` acima de `conflitos` era
    // RECUSADO com um toast — a mesma inconsistência resolvida de dois jeitos
    // diferentes conforme o lado por onde a pessoa chegasse. Agora os dois lados
    // se acomodam: quem resolveu N conversando teve pelo menos N conflitos.
    if (campo === 'conflitos_resolvidos_conversando' && v != null && ck.conflitos != null && v > ck.conflitos)
      ck.conflitos = v;
    if (campo === 'conflitos' && v != null && ck.conflitos_resolvidos_conversando != null && v < ck.conflitos_resolvidos_conversando)
      ck.conflitos_resolvidos_conversando = v;
    ck[campo] = v;
    repintarBlocosDaFolha();
    return;
  }

  if (a === 'salvar-folha') {
    const f = ctx.folha;
    alvo.disabled = true;
    try {
      const corpo = {
        turma_id: f.turma.id, data: f.data, campos: f.campos,
        origem: f.origem, sugestao: f.sugestao, fechar: alvo.dataset.fechar === '1',
      };
      const enviado = await postComFila('/api/folha', corpo, 'Folha do dia');
      // A transcricao morre aqui, junto com a sugestao do agente.
      if (ctx.voz) ctx.voz.transcricao = '';
      f.sugestao = null;
      // PASSO 05 DO TASK FLOW, corrigido (F8). Confirmar a folha devolvia para
      // o Hoje, e o relato — que é a DOR NOMEADA EM CAMPO, o relatório que ela
      // não consegue escrever à noite — ficava a mais dois toques de distância.
      // A tarefa do protocolo termina no relato liberado, não na folha.
      //
      // Só na Vivência: o relato no padrão do conselho é dela (decisão 31). Nas
      // turmas da rubrica não existe relato, e mandar para lá seria erro.
      // Vale para guardar E para fechar: nos dois casos o relato passa a existir,
      // e e' ele a dor nomeada em campo.
      const vaiParaORelato = enviado && f.vivencia;
      if (enviado) toast(vaiParaORelato ? 'Folha guardada. O relato já está aqui, esperando o seu ok.'
        : alvo.dataset.fechar === '1' ? 'Folha fechada.'
        : 'Folha guardada — a devolução do encontro está no Hoje.', 'bom');
      location.hash = vaiParaORelato ? `#/sai-daqui?aba=relato&data=${f.data}` : '#/hoje';
      navegar();
    } finally { alvo.disabled = false; }
    return;
  }

  if (a === 'liberar-relato') {
    alvo.disabled = true;
    try {
      await post('/api/relato/liberar', { turma_id: ctx.relato.turmaId, data: ctx.relato.data });
      toast('Relato liberado e folha fechada.', 'bom');
      navegar();
    } finally { alvo.disabled = false; }
    return;
  }
  if (a === 'consentir-parecer') {
    const responsavel = document.getElementById('par-resp')?.value || '';
    await post('/api/consentimento', { crianca_id: ctx.parecer.criancaId, campo: 'parecer_profissional', status: 'ativo', responsavel });
    toast('Consentimento registrado.', 'bom'); navegar(); return;
  }
  if (a === 'gerar-parecer') {
    const destinatario = document.getElementById('par-dest')?.value || '';
    alvo.disabled = true;
    try {
      const r = await post('/api/parecer/gerar', { crianca_id: ctx.parecer.criancaId, destinatario });
      location.hash = `#/crianca?ver=parecer&pid=${r.parecer.id}`; navegar();
    } finally { alvo.disabled = false; }
    return;
  }
  if (a === 'liberar-parecer') {
    alvo.disabled = true;
    try { await post('/api/parecer/liberar', { id: ctx.parecer.id }); toast('Parecer liberado.', 'bom'); navegar(); }
    finally { alvo.disabled = false; }
    return;
  }
  if (a === 'copiar-parecer') {
    const t = document.getElementById('parecer-texto')?.textContent ?? '';
    try { await navigator.clipboard.writeText(t); toast('Texto copiado.', 'bom'); }
    catch { toast('Não deu para copiar automaticamente — selecione o texto e copie.'); }
    return;
  }
  if (a === 'criar-turma') {
    const corpo = {
      nome: document.getElementById('t-nome').value,
      programa_id: document.getElementById('t-prog').value,
      turno: document.getElementById('t-turno').value,
      educador_id: document.getElementById('t-edu').value || null,
    };
    alvo.disabled = true;
    let r;
    try { r = await post('/api/turmas', corpo); }
    finally { alvo.disabled = false; }
    toast(`Turma ${r.turma.nome} criada. ${r.aviso}`, 'bom');
    navegar(); return;
  }
  if (a === 'editar-turma') {
    const id = alvo.dataset.id;
    const corpo = {
      id,
      nome: document.getElementById(`te-nome-${id}`).value,
      programa_id: document.getElementById(`te-prog-${id}`).value,
      turno: document.getElementById(`te-turno-${id}`).value,
      educador_id: document.getElementById(`te-edu-${id}`).value || null,
    };
    alvo.disabled = true;
    try { await post('/api/turmas/editar', corpo); toast('Turma atualizada.', 'bom'); navegar(); }
    finally { alvo.disabled = false; }
    return;
  }
  if (a === 'mudar-turma') {
    const id = alvo.dataset.id;
    alvo.disabled = true;
    try {
      const r = await post('/api/matricula/turma', {
        matricula_id: id, turma_id: document.getElementById(`mt-${id}`).value || null,
      });
      toast(r.aviso, 'bom'); navegar();
    } finally { alvo.disabled = false; }
    return;
  }
  if (a === 'matricular') {
    const corpo = {
      crianca_id: alvo.dataset.id,
      programa_id: document.getElementById('nm-prog').value,
      turma_id: document.getElementById('nm-turma').value || null,
      entrada: document.getElementById('nm-entrada').value || null,
    };
    if (!corpo.programa_id) { toast('Esta criança já está em todos os programas.'); return; }
    alvo.disabled = true;
    let r;
    try { r = await post('/api/matricula', corpo); }
    finally { alvo.disabled = false; }
    toast(`Matriculada em ${r.programa.nome}${r.turma ? ` · ${r.turma.nome}` : ''}.`, 'bom');
    navegar(); return;
  }
  if (a === 'salvar-responsavel') {
    const corpo = {
      crianca_id: alvo.dataset.id,
      responsavel: document.getElementById('resp-nome').value,
      contato: document.getElementById('resp-tel').value || null,
    };
    alvo.disabled = true;
    try { await post('/api/crianca/responsavel', corpo); toast('Responsável atualizado.', 'bom'); navegar(); }
    finally { alvo.disabled = false; }
    return;
  }
  // ---- Divulgar (decisões 47, 48 e 50) -------------------------------------
  if (a === 'div-conteudo') { await escolherCanais(alvo.dataset.chave); return; }
  if (a === 'div-copiar') {
    const f = ctx.divulgar?.fila;
    const ok = await copiarTexto(f?.texto_whatsapp || f?.texto || '');
    toast(ok ? 'Copiado.' : 'Não deu para copiar automaticamente — selecione o texto e copie.', ok ? 'bom' : '');
    return;
  }
  if (a === 'div-copiar-alt') {
    const ok = await copiarTexto(ctx.divulgar?.fila?.alt || '');
    toast(ok ? 'Texto alternativo copiado. No Instagram: Configurações avançadas → Escrever texto alternativo.' : 'Não deu para copiar.', ok ? 'bom' : '');
    return;
  }
  if (a === 'div-copiar-imagem') {
    const f = ctx.divulgar?.fila;
    if (!f?.imagem) return;
    try {
      const blob = await (await fetch(f.imagem)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Imagem copiada. Cole numa conversa ou no editor do post.', 'bom');
    } catch { toast('Este navegador não copia imagem — use "Baixar a imagem".'); }
    return;
  }
  if (a === 'div-baixar') {
    const f = ctx.divulgar?.fila;
    if (!f?.imagem) return;
    const link = document.createElement('a');
    link.href = f.imagem; link.download = `percurso-${f.periodo || 'card'}${f.formato === 'story' ? '-story' : ''}.png`;
    link.click();
    toast('Imagem baixada. Abra o Instagram e escolha ela.', 'bom');
    return;
  }
  if (a === 'div-compartilhar') { await compartilharDivulgacao(); return; }
  if (a === 'div-carrossel') { await compartilharDivulgacao({ carrossel: true }); return; }
  if (a === 'div-passe') { await passarParaCelular(); return; }
  if (a === 'div-imprimir') { window.print(); return; }
  if (a === 'div-abrir') {
    // NÃO impede a navegação: o <a> abre o destino, e aqui só marcamos que este
    // foi. Marcar no clique (e não "ao voltar") é o único caminho honesto — o
    // navegador não avisa quando ela volta do WhatsApp. No celular, o perfil do
    // Instagram abre no aplicativo, com o site como reserva se ele não estiver.
    marcarEnviado(Number(alvo.dataset.id));
    if (NO_CELULAR && alvo.dataset.instagram) {
      ev.preventDefault();
      const site = alvo.href;
      const t = setTimeout(() => window.open(site, '_blank', 'noopener'), 900);
      document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(t); }, { once: true });
      location.href = `instagram://user?username=${alvo.dataset.instagram}`;
    }
    return;
  }
  if (a === 'recado-grupo') {
    postComFila('/api/disparo', { canal_id: Number(alvo.dataset.id), conteudo: 'recado', referencia: ctx.recadoRef })
      .catch(() => { /* a fila offline reenvia */ });
    setTimeout(navegar, 400);
    return;
  }
  if (a === 'div-desfazer') {
    const f = ctx.divulgar.fila;
    const c = f.canais.find(x => x.id === Number(alvo.dataset.id));
    if (c) { c.feito = false; gravarDivulgacao(f); pintarDivulgar(); }
    return;
  }
  if (a === 'div-encerrar') {
    limparDivulgacao();
    ctx.divulgar.fila = null;
    ctx.divulgar = { ...ctx.divulgar, ...(await api('/api/divulgar')) };
    pintarDivulgar();
    return;
  }
  if (a === 'canal-editar') {
    const id = alvo.dataset.id;
    const v = (k) => document.getElementById(`ce-${k}-${id}`)?.value;
    alvo.disabled = true;
    let r;
    try { r = await post('/api/canais/editar', { id, nome: v('nome'), publico: v('pub'), turma_id: v('turma') || null, destino: v('dest'), observacao: v('obs') }); }
    finally { alvo.disabled = false; }
    toast(`${r.nome} atualizado.`, 'bom');
    navegar(); return;
  }
  if (a === 'canal-reativar') {
    await post('/api/canais/arquivar', { id: alvo.dataset.id, reativar: true });
    toast('Canal de volta à lista de envio.', 'bom');
    navegar(); return;
  }
  if (a === 'canal-criar') {
    const corpo = {
      tipo: document.getElementById('cn-tipo').value,
      nome: document.getElementById('cn-nome').value,
      publico: document.getElementById('cn-publico').value,
      turma_id: document.getElementById('cn-turma').value || null,
      destino: document.getElementById('cn-destino').value,
      observacao: document.getElementById('cn-obs')?.value || null,
    };
    alvo.disabled = true;
    let r;
    try { r = await post('/api/canais', corpo); }
    finally { alvo.disabled = false; }
    toast(`${r.nome} cadastrado.`, 'bom');
    navegar(); return;
  }
  if (a === 'canal-arquivar') {
    await post('/api/canais/arquivar', { id: alvo.dataset.id });
    toast('Canal arquivado — o histórico do que saiu continua.', 'bom');
    navegar(); return;
  }

  if (a === 'copiar-boletim') {
    const t = document.getElementById('boletim-texto')?.textContent ?? '';
    try { await navigator.clipboard.writeText(t); toast('Boletim copiado — cole na conversa com o responsável.', 'bom'); }
    catch { toast('Não deu para copiar automaticamente — selecione o texto e copie.'); }
    return;
  }
  if (a === 'copiar-recado') {
    const t = document.getElementById('recado-texto')?.textContent ?? '';
    try { await navigator.clipboard.writeText(t); toast('Recado copiado — cole no grupo da turma.', 'bom'); }
    catch { toast('Não deu para copiar automaticamente — selecione o texto e copie.'); }
    return;
  }
  if (a === 'copiar-relato') {
    const t = document.getElementById('relato-texto')?.textContent ?? '';
    try { await navigator.clipboard.writeText(t); toast('Texto copiado.', 'bom'); }
    catch { toast('Não deu para copiar automaticamente — selecione o texto e copie.'); }
    return;
  }

  if (a === 'reabrir-folha') {
    await post('/api/folha/reabrir', { turma_id: ctx.folha.turma.id, data: ctx.folha.data });
    toast('Folha reaberta.', 'bom');
    navegar();
    return;
  }

  if (a === 'descartar-folha') {
    // Nada a apagar: nada foi gravado. E' o ponto da tela.
    if (ctx.voz) ctx.voz.transcricao = '';
    ctx.folha.sugestao = null;
    toast('Descartado. Nada tinha sido gravado.');
    location.hash = '#/hoje'; navegar();
    return;
  }

  // ---- as tres portas longas (F1) ----
  if (a === 'porta')        { if (!ctx.voz) return; pararVoz(); abrirPorta(alvo.dataset.porta); return; }
  if (a === 'porta-fechar') { pararPortaLonga(); if (ctx.voz) ctx.voz.longa = null; pintarPortas(); return; }
  if (a === 'porta-ligar-sala') {
    // A porta B liga por ESCOLHA EXPLICITA, e a escolha vale para este
    // aparelho. O campo chamou gravar crianca de "perigoso" — ligar por padrao
    // seria decidir isso no lugar de quem responde pela sala.
    try { localStorage.setItem(CHAVE_SALA, '1'); } catch {}
    pintarBotoesDasPortas();
    pintarPortas();
    return;
  }
  if (a === 'porta-gravar')  { await iniciarPortaLonga(alvo.dataset.porta); return; }
  if (a === 'porta-parar')   { pararPortaLonga(); return; }
  if (a === 'porta-arquivo') { document.getElementById('arq-audio')?.click(); return; }
  if (a === 'porta-retentar') {
    const L = ctx.voz?.longa;
    if (!L) return;
    L.fila.push(...L.pendentes.splice(0));
    bombearBlocos();
    return;
  }

  // ---- captura por voz (F3) ----
  if (a === 'voz-toggle') {
    const v = ctx.voz;
    if (v.gravando) { pararVoz(); document.getElementById('voz-estado').textContent = 'Pausado'; return; }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) { toast('Este navegador não transcreve voz. Escreva no campo abaixo.'); return; }
    const rec = new Rec();
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = false;
    // Pede transcricao NO APARELHO quando o navegador souber faze-la. Sem isto,
    // o padrao permite processamento remoto — e a tela mentia.
    if (ctx.voz?.onde === 'aparelho') { try { rec.processLocally = true; } catch {} }
    rec.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++)
        if (ev.results[i].isFinal) v.transcricao += ev.results[i][0].transcript + ' ';
    };
    rec.onerror = (ev) => {
      pararVoz();
      const el = document.getElementById('voz-estado');
      if (el) el.textContent = ev.error === 'not-allowed' ? 'Microfone bloqueado' : 'Deu problema';
      toast(ev.error === 'not-allowed'
        ? 'O navegador bloqueou o microfone. Dá para escrever — o resto é igual.'
        : 'A transcrição falhou. O registro manual continua funcionando.', 'ruim');
    };
    // O RELIGAMENTO, que aqui faltava. O iOS/Safari encerra o reconhecimento
    // sozinho depois de uma pausa; enquanto a captura tinha teto de 40 s isso
    // quase nunca aparecia. Sem teto, aparece SEMPRE — tirar o limite sem pôr o
    // religamento seria prometer "fale sem pressa" e desligar o microfone na
    // primeira respirada. Mesmo desenho do ditado de campo: respiro de 250 ms,
    // teto de 12, e nem tenta com o app em segundo plano.
    v.religadas = 0;
    rec.onend = () => {
      if (!v.gravando || document.hidden || v.religadas >= 12) return;
      v.religadas++;
      setTimeout(() => { if (v.gravando && !document.hidden) { try { rec.start(); } catch {} } }, 250);
    };
    v.rec = rec; v.gravando = true; v.decorridos = 0;
    try { rec.start(); } catch {}
    alvo.classList.add('gravando');
    alvo.setAttribute('aria-pressed', 'true');
    alvo.setAttribute('aria-label', 'Parar de gravar');
    document.getElementById('onda').classList.add('ativa');
    document.getElementById('voz-estado').textContent = 'Gravando';
    v.timer = setInterval(() => {
      v.decorridos++;
      animarOnda();
      // O relogio CONTA PARA CIMA e nao interrompe ninguem. A sugestao vira uma
      // frase quando passa, nunca um desligamento.
      const sug = ctx.folha.catalogos.voz_sugestao_segundos;
      const dec = document.getElementById('contagem');
      if (dec) dec.textContent = `${Math.floor(v.decorridos / 60)}:${String(v.decorridos % 60).padStart(2, '0')}`;
      if (v.decorridos === sug) {
        const el = document.getElementById('voz-estado');
        if (el) el.textContent = 'Já dá para tocar em Terminei — ou siga falando';
      }
    }, 1000);
    return;
  }

  if (a === 'cal-marcar' || a === 'cal-desmarcar') {
    const turmaId = ctx.calendario?.turmaId;
    if (!turmaId) return;
    const data = alvo.dataset.data || document.getElementById('cal-data')?.value;
    if (!data) { toast('Escolha a data primeiro.'); return; }
    if (a === 'cal-desmarcar') {
      await api('/api/calendario', { method: 'DELETE', body: JSON.stringify({ turma_id: turmaId, data }) });
      toast('Desfeito. O calendário volta ao padrão da turma.');
    } else {
      const tipo = alvo.dataset.tipo;
      const motivo = tipo === 'sem_encontro'
        ? prompt(`Por que não vai ter encontro em ${dataBR(data)}? (opcional)`) ?? ''
        : '';
      await post('/api/calendario', { turma_id: turmaId, data, tipo, motivo });
      toast(tipo === 'extra' ? `Encontro extra em ${dataBR(data)}.` : `${dataBR(data)} sai do calendário desta turma.`, 'bom');
    }
    navegar();
    return;
  }

  if (a === 'ir-para-crianca') {
    const linha = document.getElementById(`linha-${alvo.dataset.id}`);
    if (!linha) return;
    linha.scrollIntoView({ behavior: REDUZ.matches ? 'auto' : 'smooth', block: 'center' });
    // Pisca só se a pessoa não pediu para reduzir movimento; o foco vai para o
    // botão P, que é o que ela vai tocar em seguida.
    linha.querySelector('[data-acao="marcar"]')?.focus({ preventScroll: true });
    return;
  }

  if (a === 'igual-ao-anterior') {
    const f = ctx.folha;
    if (!f?.anterior) return;
    // Preenche o DESENHO da atividade e nada mais. As contagens de hoje ficam
    // com ela — copiar "quantas ajudaram sem pedir" de três semanas atrás seria
    // o produto inventando observação, que é a única coisa que ele não pode
    // fazer. Nada é gravado aqui: o botão de guardar continua sendo o dela.
    Object.assign(f.campos, {
      atividade: f.anterior.campos.atividade ?? f.campos.atividade,
      area_tematica: f.anterior.campos.area_tematica ?? f.campos.area_tematica,
      marcadores_turma: [...(f.anterior.campos.marcadores_turma ?? [])],
      procedimento: f.anterior.campos.procedimento ?? f.campos.procedimento,
      objetivo: f.anterior.campos.objetivo ?? f.campos.objetivo,
    });
    f.anterior = null;   // consumido: o botão sai e a tela para de oferecer
    repintarBlocosDaFolha();
    toast('Preenchi como no encontro anterior. Confira e ajuste — nada foi gravado.', 'bom');
    return;
  }

  if (a === 'voz-terminei') {
    const v = ctx.voz;
    pararVoz();
    const ditado = document.getElementById('ditado')?.value || '';
    const texto = (v.transcricao + ' ' + ditado).trim();
    if (!texto) {
      toast('Não ouvi nada. Grave de novo ou toque em "Prefiro escrever".');
      return;
    }
    alvo.disabled = true;
    try {
      // A encenação (magia) embrulha o MESMO POST — começa junto com ele e só
      // mostra o que ele devolveu. Reduced-motion: fluxo direto, sem overlay.
      const promessa = post('/api/voz/extrair', { turma_id: ctx.folha.turma.id, transcricao: texto });
      let r, encerrarMagia = null, magiaCancelada = false;
      if (REDUZ.matches) {
        r = await promessa;
      } else {
        const m = await magiaExtracao(texto, promessa, ctx.folha.catalogos);
        r = m.r;
        encerrarMagia = m.encerrar;
        magiaCancelada = m.cancelada();
      }
      // A transcricao sai de cena aqui: nao foi gravada e nao volta para a tela.
      v.transcricao = '';
      const el = document.getElementById('ditado'); if (el) el.value = '';
      const f = ctx.folha;
      f.origem = 'voz';
      f.sugestao = r.extracao;
      f.excluido = r.excluido;
      f.trechos = r.trechos;
      f.baixaConfianca = r.baixa_confianca;
      f.nomesSubstituidos = r.nomes_substituidos ?? 0;
      f.faltasSugeridas = r.faltas_sugeridas ?? [];
      f.campos = {
        atividade: r.extracao.atividade,
        area_tematica: r.extracao.area_tematica,
        marcadores_turma: [...r.extracao.marcadores_turma],
        pediram_ajuda: r.extracao.pediram_ajuda,
        conteudo_excluido: r.extracao.conteudo_excluido,
        procedimento: r.extracao.procedimento ?? (f.vivencia ? 'nao_identificado' : null),
        objetivo: r.extracao.objetivo ?? (f.vivencia ? 'nenhum' : null),
        checkin: { ...(r.extracao.checkin ?? {}) },
      };
      // Se o usuário navegou no MEIO da magia (Back, link), não sequestrar: o
      // resultado fica em ctx.folha (a tela #/confirmar mostra quando ela
      // voltar por vontade própria) e nada é forçado.
      if (magiaCancelada) return;
      // Navega ANTES do modal de encaminhamento: o foco cai no modal por cima
      // da tela pronta (e o véu da magia se desfaz sobre ela). O await importa:
      // o render limpa .veu esquecidos — o modal só pode abrir DEPOIS dele.
      location.hash = '#/registrar?passo=confirmar';
      await navegar();
      encerrarMagia?.();
      if (r.excluido) modalEncaminhamento(r.trechos);
    } catch (e) {
      if (e.rede) {
        toast('Sem internet. O registro manual continua funcionando.', 'ruim');
        location.hash = '#/registrar?passo=mao'; navegar();
        return;
      }
      throw e;
    } finally { alvo.disabled = false; }
    return;
  }

  // ---- pauta de segunda (F11) ----
  if (a === 'pauta') {
    alvo.disabled = true;
    try {
      const r = await post('/api/pauta/decidir', { turma_id: ctx.pautaTurma, decisao: alvo.dataset.decisao });
      toast(alvo.dataset.decisao === 'aceita'
        ? 'Anotado no sábado.'
        : `Registrado como descarte — taxa atual de ${r.descarte.pct}%. É assim que a sugestão melhora.`, 'bom');
      navegar();
    } finally { alvo.disabled = false; }
    return;
  }

  // ---- relatorio do doador (F13/F14) ----
  if (a === 'rel-tipo')    { location.hash = `#/relatorio?tipo=${alvo.dataset.tipo}${ctx.rel?.periodo ? `&periodo=${ctx.rel.periodo}` : ''}`; navegar(); return; }
  if (a === 'rel-periodo') { location.hash = `#/relatorio?tipo=${ctx.rel?.tipo || 'ciclo'}&periodo=${alvo.dataset.periodo}`; navegar(); return; }

  if (a === 'gerar-relatorio') {
    const [inicio, fim] = (ctx.rel.periodo || '').split('..');
    if (!inicio) { toast('Escolha o período primeiro.'); return; }
    alvo.disabled = true;
    try {
      const custo = document.getElementById('custo')?.value;
      await post('/api/relatorio/gerar', { tipo: ctx.rel.tipo, inicio, fim, custo });
      toast('Rascunho gerado a partir dos números do período.', 'bom');
      navegar();
    } finally { alvo.disabled = false; }
    return;
  }

  if (a === 'publicar-relatorio') {
    await post('/api/relatorio/publicar', { tipo: ctx.rel.tipo, periodo: ctx.rel.periodo });
    toast('Publicado. É este artefato que vai para quem financia.', 'bom');
    navegar();
    return;
  }

  if (a === 'baixar-rascunho') {
    const d = await api(`/api/relatorio?tipo=${ctx.rel.tipo}&periodo=${ctx.rel.periodo}`);
    if (!d.relatorio) { toast('Gere o rascunho antes de baixar.'); return; }
    const r = d.relatorio;
    const txt = [
      `INSTITUTO SOCIAL EBENÉZER`,
      r.tipo === 'ciclo' ? 'Relatório do Ciclo' : 'Carta do trimestre',
      `Período: ${r.periodo_inicio} a ${r.periodo_fim}`,
      `Gerado em ${r.gerado_em} · status: ${r.status} · revisor: ${r.revisor_status}`,
      '', ...r.blocos.map(b => `## ${b.titulo}\n${b.destaque ? b.destaque + '\n' : ''}${b.texto}`),
      '', `Supressão: mínimo de ${r.supressoes.minimo} crianças por recorte.`,
      'Todos os dados desta demonstração são sintéticos.',
    ].join('\n\n');
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `percurso-${r.tipo}-${r.periodo_inicio}-a-${r.periodo_fim}.txt`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  // ---- consulta agregada (F15) ----
  if (a === 'perguntar') {
    pararDitado();
    const campo = document.getElementById('pergunta');
    const q = campo?.value.trim();
    if (!q) { toast('Escreva ou fale a pergunta.'); return; }
    alvo.disabled = true;
    try {
      const r = await post('/api/consulta', { pergunta: q });
      const alvoEl = document.getElementById('resposta');
      alvoEl.innerHTML = `
        <div class="cartao">
          <div class="lbl">${r.reconhecida ? esc(r.intencao) : 'não reconhecida'}</div>
          <p style="font-size:14.5px;line-height:1.55">${esc(r.resposta)}</p>
          ${r.fonte ? `<p class="sub" style="margin-top:8px">Fonte: ${esc(r.fonte)}.</p>` : ''}
          ${r.sugestoes ? `<div style="margin-top:10px">${r.sugestoes.map(x =>
            `<button class="p off" data-acao="sugestao" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
          <p class="sub" style="margin-top:10px">${esc(r.doutrina)}</p>
        </div>` + alvoEl.innerHTML;
    } finally { alvo.disabled = false; }
    return;
  }

  if (a === 'sugestao') {
    const campo = document.getElementById('pergunta');
    campo.value = alvo.dataset.q;
    document.querySelector('[data-acao="perguntar"]')?.click();
    return;
  }

  // ---- ingestão retroativa (F7) ----
  if (a === 'importar') {
    const csv = document.getElementById('csv')?.value || '';
    const turmaId = Number(document.getElementById('turma-imp')?.value);
    if (!csv.trim()) { toast('Cole o conteúdo da planilha primeiro.'); return; }
    const simular = alvo.dataset.simular === '1';
    alvo.disabled = true;
    try {
      const r = await post('/api/importar', { csv, turma_id: turmaId, origem: 'planilha-colada.csv', simular });
      document.getElementById('resultado-import').innerHTML = `
        <div class="cartao" style="margin-top:14px">
          <div class="linha"><h2 class="cresce">${simular ? 'Simulação' : 'Importado'}</h2>
            <span class="selo ${simular ? 'pend' : 'ok'}">${simular ? 'nada gravado' : 'gravado'}</span></div>
          <div class="dado" style="margin-top:10px"><span class="k">Formato reconhecido</span><b>${esc(r.formato)}</b></div>
          <div class="dado"><span class="k">Linhas lidas</span><b>${r.linhas}</b></div>
          <div class="dado"><span class="k">Crianças no arquivo</span><b>${r.criancas_no_arquivo}</b></div>
          ${simular ? '' : `<div class="dado"><span class="k">Crianças novas</span><b>${r.criancas_novas}</b></div>
          <div class="dado"><span class="k">Já existiam</span><b>${r.reconhecidas}</b></div>
          <div class="dado"><span class="k">Encontros e presenças criados</span><b>${r.encontros} · ${r.presencas}</b></div>`}
          ${r.periodo ? `<div class="dado"><span class="k">Período reconstruído</span><b>${dataBR(r.periodo.inicio)} a ${dataBR(r.periodo.fim)}</b></div>` : ''}
          ${r.duplicatas_resolvidas.length ? `
            <div class="lbl" style="margin-top:14px">Grafias unificadas</div>
            ${r.duplicatas_resolvidas.map(d => `<div class="trecho"><b>${esc(d.nome)}</b>${esc(d.grafias.join('  ·  '))}</div>`).join('')}` : ''}
          ${r.sem_nascimento.length ? `<div class="aviso" style="margin-top:12px">
            <h3>${r.sem_nascimento.length} criança(s) sem data de nascimento</h3>
            <p>A chave de deduplicação fica fraca sem a data. Confira à mão: ${esc(r.sem_nascimento.join(', '))}.</p></div>` : ''}
          ${r.descartadas.length ? `
            <div class="lbl" style="margin-top:14px">Linhas descartadas</div>
            <div class="rolagem"><table><thead><tr><th>Linha</th><th>Motivo</th></tr></thead>
              <tbody>${r.descartadas.map(x => `<tr><td>${x.linha}</td><td>${esc(x.motivo)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        </div>`;
      toast(simular ? 'Simulação pronta — nada foi gravado.' : `Importado: ${r.presencas} presenças reconstruídas.`, 'bom');
    } finally { alvo.disabled = false; }
    return;
  }

  // ---- fecho de ciclo (retenção declarada) ----
  if (a === 'fechar-ciclo') {
    const r = await post('/api/ciclo/fechar', { ciclo_id: Number(alvo.dataset.id), abrir_proximo: true });
    toast(`Ciclo fechado. ${r.notas_descartadas} anotação(ões) legada(s) descartada(s).`, 'bom');
    navegar();
    return;
  }

  // ---- coordenacao ----
  if (a === 'gerar-sintese') {
    alvo.disabled = true;
    try {
      await post('/api/sintese/gerar', { programa_id: alvo.dataset.prog || null });
      toast('Síntese gerada a partir dos números do ciclo.', 'bom');
      navegar();
    } finally { alvo.disabled = false; }
    return;
  }

  if (a === 'aprovar-sintese') {
    await post('/api/sintese/aprovar', { programa_id: alvo.dataset.prog || null });
    toast('Síntese aprovada e liberada.', 'bom');
    navegar();
    return;
  }

  if (a === 'consentir') {
    modalConsentimento({ id: Number(alvo.dataset.id), nome: alvo.dataset.nome });
    return;
  }
}));

async function depoisDaObservacao(r, concluir) {
  if (concluir && r.agenda && r.agenda.pendentes === 0) {
    await celebrar(r.agenda);
    return;
  }
  location.hash = '#/hoje?detalhe=ciclo';
  navegar();
}

document.addEventListener('change', comErro(async (ev) => {
  const a = ev.target.dataset.acao;
  if (a === 'trocar-data')     { location.hash = `#/chamada?data=${ev.target.value}`; navegar(); }
  if (a === 'trocar-programa') { location.hash = `#/sintese${ev.target.value ? `?programa_id=${ev.target.value}` : ''}`; navegar(); }
  if (a === 'arquivo-audio') {
    const arq = ev.target.files?.[0];
    ev.target.value = '';   // escolher o MESMO arquivo de novo tem que disparar
    await receberArquivo(arq);
  }
}));

let buscaTimer;
document.addEventListener('input', (ev) => {
  if (ev.target.dataset.acao !== 'buscar') return;
  clearTimeout(buscaTimer);
  const termo = ev.target.value;
  buscaTimer = setTimeout(comErro(async () => {
    const r = await api(`/api/criancas?q=${encodeURIComponent(termo)}`);
    const alvo = document.getElementById('resultado');
    if (alvo) alvo.innerHTML = listaCriancas(r);
  }), 220);
});

document.addEventListener('keydown', (ev) => {
  // Enter no campo de senha entra. Sem isto, o teclado do celular mostra "ir" e
  // o "ir" não faz nada — a pessoa toca, não acontece nada, e ela desconfia da
  // senha em vez do formulário.
  if (ev.key === 'Enter' && ev.target?.dataset?.acao === 'senha-campo') {
    ev.preventDefault();
    document.querySelector('[data-acao="entrar"]')?.click();
    return;
  }
  if (ev.key !== 'Escape') return;
  const veu = document.querySelector('.veu');
  if (veu) {
    if (veu.classList.contains('aurora-veu')) fecharAurora();
    else veu.remove();
    return;
  }
  if (document.querySelector('.magia')) { pularMagia(); return; }
  pararFesta();
});

// ======================================================================
// BOOT
// ======================================================================
window.addEventListener('hashchange', navegar);

(async () => {
  try {
    const s = await api('/api/sessao');
    sessao = s.usuario;
  } catch {
    app.innerHTML = `<div class="cartao"><h2>Servidor fora do ar</h2>
      <p class="sub" style="margin-top:6px">Rode <code>node server.js</code> na pasta do projeto e recarregue esta página.</p></div>`;
    return;
  }
  if (!sessao && location.hash !== '#/entrar') location.hash = '#/entrar';
  // Reabertura sem hash: normaliza para a rota real — senão chips, "tela
  // atual" da Aurora e a checagem de oferta trabalham com '' a sessão inteira.
  else if (sessao && !location.hash) location.hash = '#/hoje';
  navegar();
  if (sessao) drenarFila();
})();
