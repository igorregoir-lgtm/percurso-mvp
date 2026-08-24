// Percurso — aplicacao. Sem framework: DOM + hash routing.
// A ordem das telas segue a jornada da persona: hoje -> chamada -> ciclo -> turma.
import { criarFila } from './fila.js';

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

function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.setAttribute('role', tipo === 'ruim' ? 'alert' : 'status');
  el.textContent = msg;
  toastEl.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'ruim' ? 6000 : 3500);
}

async function api(caminho, opcoes = {}) {
  let r;
  try {
    r = await fetch(caminho, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    });
  } catch {
    const e = new Error('Sem conexao com o servidor. Verifique se o Percurso esta rodando.');
    e.rede = true; throw e;
  }
  let corpo = {};
  try { corpo = await r.json(); } catch { /* resposta sem corpo */ }
  if (!r.ok) {
    const e = new Error(corpo.erro || `Erro ${r.status}.`);
    e.status = r.status; e.dados = corpo;
    throw e;
  }
  return corpo;
}
const post = (c, dados) => api(c, { method: 'POST', body: JSON.stringify(dados || {}) });

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
const NAV_EDUCADOR = [
  ['#/hoje', '☀', 'Hoje'], ['#/chamada', '✓', 'Chamada'], ['#/pauta', '◈', 'Pauta'],
  ['#/turma', '▥', 'Turma'], ['#/criancas', '☺', 'Crianças'],
];
const NAV_COORDENACAO = [
  ['#/painel', '▦', 'Painel'], ['#/scores', '◑', 'Scores'], ['#/safras', '↝', 'Safras'],
  ['#/sintese', '✎', 'Síntese'], ['#/consentimentos', '⚿', 'Consent.'],
];
const NAV_DIRETORIA = [
  ['#/relatorio', '▤', 'Relatório'], ['#/consulta', '?', 'Perguntar'],
];

function pintarNav(rotaAtual) {
  if (!sessao) { navEl.hidden = true; return; }
  const itens = sessao.papel === 'coordenacao' ? NAV_COORDENACAO
              : sessao.papel === 'diretoria' ? NAV_DIRETORIA : NAV_EDUCADOR;
  navEl.hidden = false;
  navEl.innerHTML = itens.map(([href, ic, rot]) =>
    `<a href="${href}" ${rotaAtual.startsWith(href) ? 'aria-current="page"' : ''}>
       <em aria-hidden="true">${ic}</em>${rot}</a>`).join('');
  setTimeout(pintarFila, 0);
  quemEl.innerHTML =
    `<span class="sintetico" id="fila"></span>
     <span class="sintetico">dados sintéticos</span>
     <b>${esc(sessao.apelido)}</b>
     <button class="btn pequeno fantasma" data-acao="sair" style="min-height:32px;padding:5px 10px">sair</button>`;
}

// ------------------------------------------------------------------ roteador
const rotas = [];
const rota = (re, tela) => rotas.push([re, tela]);

async function navegar() {
  const hash = location.hash || '#/hoje';
  if (!sessao && hash !== '#/entrar') { location.hash = '#/entrar'; return; }
  // Servidor fora do ar com rede ativa também enfileira, e nesse caso `online`
  // nunca dispara. Tentar a cada navegação custa nada quando a fila está vazia.
  if (sessao && lerFila().length) drenarFila();
  for (const [re, tela] of rotas) {
    const m = hash.match(re);
    if (m) {
      app.innerHTML = '<div class="carregando">Carregando…</div>';
      pintarNav(hash);
      try { await tela(...m.slice(1)); }
      catch (e) {
        if (e.status === 401) { sessao = null; location.hash = '#/entrar'; return; }
        app.innerHTML = `<div class="cartao"><h2>Não deu para abrir esta tela</h2>
          <p class="sub" style="margin-top:6px">${esc(e.message)}</p>
          <div class="linha" style="margin-top:14px">
            <a class="btn secundario" href="#/hoje">Voltar ao início</a>
            <button class="btn fantasma" data-acao="recarregar">Tentar de novo</button>
          </div></div>`;
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  app.innerHTML = `<div class="cartao"><h2>Tela não encontrada</h2>
    <p class="sub">A rota <code>${esc(hash)}</code> não existe.</p>
    <div class="linha" style="margin-top:14px"><a class="btn" href="#/hoje">Ir para o início</a></div></div>`;
}

// ======================================================================
// ENTRAR
// ======================================================================
rota(/^#\/entrar/, async () => {
  const { usuarios } = await api('/api/sessao');
  navEl.hidden = true; quemEl.innerHTML = '';
  app.innerHTML = `
    <p class="kicker">Instituto Ebenézer · Desafio B</p>
    <h1>Percurso</h1>
    <p class="sub">Transforma a observação de minutos do educador em evidência de evolução — sem que dado de criança saia da organização.</p>
    <div class="cartao" style="margin-top:20px">
      <h2>Quem está registrando hoje?</h2>
      <p class="sub">Escolha o perfil para entrar. O MVP não guarda senha: o controle de acesso real fica com a coordenação.</p>
      <div class="pilha" style="margin-top:14px">
        ${usuarios.map(u => `
          <button class="item" data-acao="entrar" data-id="${u.id}">
            <div><div class="nome">${esc(u.nome)}</div>
              <div class="meta">${PAPEL[u.papel] ?? 'Educadora'}</div></div>
            <span class="seta" aria-hidden="true">›</span>
          </button>`).join('')}
      </div>
    </div>
    <p class="rodape">Cada pessoa entra com a própria conta. O registro fica no instituto.<br>
      Todos os dados desta aplicação são sintéticos (regra 1 do bloco 6 do dossiê):<br>
      nenhum dado real de criança atendida foi usado, em nenhuma etapa.</p>`;
});

const PAPEL = { coordenacao: 'Coordenação', diretoria: 'Diretoria', educador: 'Professora' };

// ======================================================================
// HOJE — a tela que a persona abre primeiro
// ======================================================================
rota(/^#\/hoje/, async () => {
  const d = await api('/api/hoje');
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
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/alertas">Todos os alertas</button>
      </div>
    </div>` : '';

  const ch = d.chamada;
  // Sabado numa turma de semana, feriado, recesso: nao ha encontro hoje. Oferecer
  // "chamada de hoje" nesse dia seria convidar a registrar um encontro que nao
  // aconteceu — o cartao passa a apontar a data em aberto mais recente.
  const cartaoChamada = !ch ? '' : !d.dia_letivo && !ch.registrada ? `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">Hoje não tem encontro</h2><span class="selo bloq">${esc(diaSemana(d.hoje))}</span></div>
      <p class="sub">${esc(d.turma?.nome || '')} não tem encontro ${esc(diaSemana(d.hoje))}.
        ${d.chamadas_abertas.length ? 'Dá para fechar o que ficou em aberto.' : 'Nada pendente.'}</p>
      ${d.chamadas_abertas.length ? `<div class="linha" style="margin-top:12px">
        <button class="btn largo secundario" data-acao="ir" data-href="#/chamada?data=${d.chamadas_abertas.at(-1)}">
          Chamada de ${dataBR(d.chamadas_abertas.at(-1))}</button></div>` : ''}
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
          ? `<button class="btn largo" data-acao="ir" data-href="#/ciclo">Continuar observações · faltam ${ag.pendentes}</button>`
          : `<button class="btn largo secundario" data-acao="ir" data-href="#/turma">Ver o que a turma mostrou</button>
             <button class="btn largo fantasma" data-acao="ir" data-href="#/ciclo">Rever os olhares do ciclo</button>`}
      </div>
    </div>`;

  // "Contar como foi": a porta de entrada da voz. Fica acima de tudo o que
  // e' tarefa — o sistema pede a fala, nao o preenchimento.
  const folhaFeita = !!d.folha;
  // A folha e' do ENCONTRO: existe enquanto houver um encontro registrado,
  // mesmo que ele tenha sido no ultimo dia letivo e nao hoje.
  const cartaoFolha = !d.data_folha ? '' : `
    <div class="cartao compacto">
      <div class="linha"><h2 class="cresce">Folha ${d.data_folha === d.hoje ? 'do dia' : `de ${dataBR(d.data_folha)}`}</h2>
        <span class="selo ${folhaFeita ? 'ok' : 'pend'}">${folhaFeita ? (d.folha.origem === 'voz' ? 'por voz' : 'manual') : 'pendente'}</span></div>
      <p class="sub">${folhaFeita
        ? 'Registrada. Dá para ajustar enquanto o dia não fecha.'
        : 'Fale por 40 segundos enquanto arruma a sala — o resto o Percurso monta.'}</p>
      <div class="linha" style="margin-top:12px">
        <button class="btn largo" data-acao="ir" data-href="#/voz">${folhaFeita ? 'Contar de novo' : 'Contar como foi'}</button>
        <button class="btn largo secundario" data-acao="ir" data-href="#/folha">Preencher à mão</button>
      </div>
    </div>`;

  // "Para esta semana" — o bloco que substituiu "Falta completar neste ciclo".
  // O sistema deixa de cobrar e passa a devolver.
  const pt = d.pauta;
  const linhasSemana = [];
  if (pt?.risco?.n) linhasSemana.push([
    `${pt.risco.n} ${pt.risco.n === 1 ? 'criança em risco de sair' : 'crianças em risco de sair'}`,
    'Duas ou mais faltas seguidas', '#/pauta', true]);
  if (pt?.exposicao?.area) linhasSemana.push([
    `${esc(pt.exposicao.area)} sem atividade`,
    `${pt.exposicao.criancas} interessada(s), nada no período`, '#/pauta', true]);
  if (d.agenda?.pendentes) linhasSemana.push([
    `${d.agenda.pendentes} olhar(es) em aberto no ciclo`,
    'Opcional — a folha já registrou a turma', '#/ciclo', false]);
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

  app.innerHTML = `
    <p class="kicker">${esc(d.turma?.programa || 'Instituto Ebenézer')}</p>
    <h1>${saudacao}, ${esc(sessao.apelido.split(' ')[0])}</h1>
    <p class="sub">${esc(d.turma ? d.turma.nome : 'Sem turma atribuída')} · ${esc(porExtenso(d.hoje))}</p>
    <div class="pilha">
      ${retomada}${cartaoChamada}${cartaoFolha}${paraEstaSemana}${alertas}${cartaoCiclo}${abertas}
    </div>
    <p class="rodape">Chamada em um toque, 40 segundos de voz — e o resto o Percurso organiza para você.</p>`;
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
  ctx.chamada = {
    turma, data,
    marcas: Object.fromEntries(ch.criancas.map(c => [c.id, c.status])),
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
      <div class="chamada-lista" id="lista">
        ${ch.criancas.map(c => `
          <div class="chamada-item">
            <div class="cresce"><span class="nome">${esc(c.nome)}</span><span class="cod">${esc(c.codigo)}</span></div>
            <div class="pf" role="group" aria-label="Presença de ${esc(c.nome)}">
              <button data-acao="marcar" data-id="${c.id}" data-v="P" aria-pressed="${c.status === 'P'}" aria-label="Presente">P</button>
              <button data-acao="marcar" data-id="${c.id}" data-v="F" aria-pressed="${c.status === 'F'}" aria-label="Faltou">F</button>
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
}

// ======================================================================
// CICLO — agenda de observacao (F4)
// ======================================================================
const SELO = {
  concluida: ['ok', 'feita'], rascunho: ['pend', 'começada'],
  pendente: ['pend', 'a fazer'], bloqueada: ['bloq', 'bloqueada'],
};

rota(/^#\/ciclo$/, async () => {
  const d = await api('/api/hoje');
  if (!d.turma || !d.agenda) { app.innerHTML = `<div class="cartao"><h2>Sem ciclo aberto</h2><p class="sub">Não há ciclo de observação em andamento.</p></div>`; return; }
  const ag = d.agenda;
  const ordem = { rascunho: 0, pendente: 1, bloqueada: 2, concluida: 3 };
  const itens = [...ag.itens].sort((a, b) => ordem[a.estado] - ordem[b.estado] || a.nome.localeCompare(b.nome));

  app.innerHTML = `
    <p class="kicker">${esc(ag.ciclo.nome)} · observação por criança</p>
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
        return `<button class="item" ${clicavel ? `data-acao="ir" data-href="#/observacao/${i.crianca_id}"` : 'disabled style="opacity:.72"'}>
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
});

// ======================================================================
// OBSERVACAO — a rubrica (F3)
// ======================================================================
rota(/^#\/observacao\/(\d+)/, async (id) => {
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
        <div class="linha"><button class="btn pequeno secundario" data-acao="ir" data-href="#/ciclo">Voltar ao ciclo</button></div>
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
});

function atualizarObs() {
  const o = ctx.obs; if (!o) return;
  const feitos = Object.keys(o.marcas).length;
  const el = document.getElementById('faltam');
  if (el) el.textContent = feitos === o.total
    ? 'Tudo marcado. Pode concluir.'
    : `${feitos} de ${o.total} dimensões marcadas — o rascunho guarda o que você já fez.`;
}

const MUDANCA = { avancou: ['↑', 'var(--ok)'], estavel: ['→', 'var(--muted)'], recuou: ['↓', 'var(--red)'], sem_par: ['·', 'var(--muted)'] };

function tabelaTrajetoria(t) {
  if (!t.ciclos.length) return '<p class="vazio">Sem observação concluída ainda.</p>';
  return `<div class="rolagem"><table>
    <thead><tr><th>Dimensão</th>${t.ciclos.map(c => `<th>${esc(c.nome)}</th>`).join('')}<th>Entre ciclos</th></tr></thead>
    <tbody>${t.dimensoes.map(d => {
      const [seta, cor] = MUDANCA[d.mudanca];
      return `<tr><td>${esc(d.dimensao)}</td>
        ${d.niveis.map(n => `<td><b>${n ?? '—'}</b><span style="color:var(--muted)">${n ? '/4' : ''}</span></td>`).join('')}
        <td style="color:${cor};font-weight:700">${seta} ${d.mudanca === 'sem_par' ? '' : d.mudanca}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

// ======================================================================
// PAINEL DA TURMA (F5 agregado)
// ======================================================================
rota(/^#\/turma/, async () => {
  const d = await api('/api/hoje');
  if (!d.turma) { app.innerHTML = `<div class="cartao"><h2>Sem turma atribuída</h2></div>`; return; }
  const [p, est, risco] = await Promise.all([
    api(`/api/turma/painel?turma_id=${d.turma.id}`),
    api(`/api/turma/estado?turma_id=${d.turma.id}`),
    api(`/api/turma/risco?turma_id=${d.turma.id}`),
  ]);
  const emRisco = new Set(risco.linhas.map(l => l.crianca_id));
  app.innerHTML = `
    <p class="kicker">Agregado · sem dado individual</p>
    <h1>Painel da turma</h1>
    <p class="sub">${esc(p.turma.nome)} · médias por dimensão, escala de 1 a 4</p>
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
rota(/^#\/criancas/, async () => {
  const { criancas } = await api('/api/criancas');
  app.innerHTML = `
    <p class="kicker">Ficha viva · criança é entidade, matrícula é relação</p>
    <h1>Crianças</h1>
    <div class="cartao" style="margin-top:16px">
      <input type="text" id="busca" data-acao="buscar" placeholder="Buscar por nome ou código…" autocomplete="off">
      <div class="pilha" id="resultado" style="margin-top:12px">${listaCriancas(criancas)}</div>
    </div>`;
});

const listaCriancas = (cs) => cs.length ? cs.map(c => `
  <button class="item" data-acao="ir" data-href="#/crianca/${c.id}">
    <div class="cresce"><div class="nome">${esc(c.nome)}</div>
      <div class="meta">${esc(c.codigo)} · ${esc(c.programas || '')}</div></div>
    <span class="seta" aria-hidden="true">›</span>
  </button>`).join('') : '<p class="vazio">Nenhuma criança encontrada.</p>';

rota(/^#\/crianca\/(\d+)/, async (id) => {
  const f = await api(`/api/crianca?id=${id}`);
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
      <h2>Matrículas</h2>
      <p class="sub">A criança é única; cada matrícula é uma relação com um programa.</p>
      <div class="pilha" style="margin-top:10px">
        ${f.matriculas.map(m => `<div class="item" style="cursor:default">
          <div class="cresce"><div class="nome">${esc(m.programa)}</div>
            <div class="meta">${esc(m.turma || 'sem turma')} · desde ${dataBR(m.entrada)}${m.saida ? ` · saiu em ${dataBR(m.saida)}` : ''}</div></div>
          <span class="selo ${m.status === 'ativa' ? 'ok' : 'bloq'}">${m.status}</span>
        </div>`).join('')}
      </div>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Presença</h2><span class="sub">${f.presenca_pct ?? '—'}% no histórico</span></div>
      <p class="sub">Últimos ${f.presencas.length} encontros</p>
      <div style="margin-top:10px">${pres || '<span class="sub">sem registro</span>'}</div>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>Trajetória socioemocional</h2>
      <p class="sub">Uso interno da equipe. Para fora, só agregado.</p>
      <div style="margin-top:10px">${tabelaTrajetoria(f.trajetoria)}</div>
    </div>

    <div class="cartao compacto" style="margin-top:14px">
      <h2>Governança dos campos</h2>
      <p class="sub">Regra 3 do bloco 6: cada campo declara base legal, titular, acesso e retenção.</p>
      <div class="rolagem" style="margin-top:10px"><table>
        <thead><tr><th>Campo</th><th>Base legal</th><th>Acesso</th><th>Retenção</th><th>Situação</th></tr></thead>
        <tbody>${f.consentimentos.map(c => `<tr>
          <td>${esc(c.rotulo)}</td><td>${esc(c.base_legal)}</td><td>${esc(c.acesso)}</td><td>${esc(c.retencao)}</td>
          <td><span class="selo ${c.status === 'ativo' ? 'ok' : 'bloq'}">${c.dispensado ? 'dispensa consent.' : esc(c.status)}</span></td>
        </tr>`).join('')}</tbody></table></div>
    </div>`;
});

// ======================================================================
// ALERTAS (F6)
// ======================================================================
rota(/^#\/alertas/, async () => {
  const { alertas, faltas_para_lista } = await api('/api/alertas');
  app.innerHTML = `
    <p class="kicker">Agir antes da evasão</p>
    <h1>Alertas de ausência</h1>
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
});

// ======================================================================
// PAINEL DA COORDENACAO (F1 + F5 + F6)
// ======================================================================
rota(/^#\/painel/, async () => {
  const d = await api('/api/painel');
  const inv = d.inventario;
  app.innerHTML = `
    <p class="kicker">Instituto Ebenézer · ${esc(d.ciclo.nome)}</p>
    <h1>Painel da coordenação</h1>
    <p class="sub">O que o Instituto tem hoje, medido — não estimado.</p>

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
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/scores">Ver os três scores</button>
        <button class="btn pequeno fantasma" data-acao="ir" data-href="#/consulta">Perguntar à base</button>
        <button class="btn pequeno fantasma" data-acao="ir" data-href="#/criancas">Buscar criança</button>
        <button class="btn pequeno fantasma" data-acao="ir" data-href="#/importar">Importar planilha antiga</button>
      </div>
    </div>

    ${d.alertas.length ? `<div class="cartao compacto" style="margin-top:14px">
      <div class="linha"><h2 class="cresce">Alertas abertos</h2>
        <button class="btn pequeno secundario" data-acao="ir" data-href="#/alertas">Tratar</button></div>
      <div class="pilha" style="margin-top:10px">
        ${d.alertas.slice(0, 5).map(a => `<div class="item" style="cursor:default">
          <div class="cresce"><div class="nome">${esc(a.nome)}</div><div class="meta">${esc(a.detalhe)}</div></div>
          <span class="selo ${a.status === 'aberto' ? 'alerta' : 'pend'}">${a.status.replace('_', ' ')}</span>
        </div>`).join('')}
      </div></div>` : ''}

    <p class="rodape">Dados de cobertura desde ${dataBR(inv.cobertura.desde)} · ${inv.cobertura.encontros} encontros · ${inv.cobertura.presencas} registros de presença.</p>`;
});

// ======================================================================
// SAFRAS E PERMANENCIA (F6)
// ======================================================================
rota(/^#\/safras/, async () => {
  const s = await api('/api/safras');
  app.innerHTML = `
    <p class="kicker">Coorte sobre o dado que já existe</p>
    <h1>Safras e permanência</h1>
    <p class="sub">% de matrículas que permanecem, por safra de entrada. Permanência é <b>proxy de vínculo</b> — declarado como proxy, não como impacto.</p>
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
});

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
rota(/^#\/sintese/, async () => {
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const prog = params.get('programa_id') || '';
  const d = await api(`/api/sintese${prog ? `?programa_id=${prog}` : ''}`);
  const s = d.sintese;

  app.innerHTML = `
    <p class="kicker">${esc(d.ciclo.nome)} · fecho do ciclo</p>
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
      <p style="font-size:15.5px;line-height:1.65;margin-top:12px">${esc(s.texto)}</p>
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
});

// ======================================================================
// CONSENTIMENTOS (F1 · governanca)
// ======================================================================
rota(/^#\/consentimentos/, async () => {
  const d = await api('/api/consentimentos');
  app.innerHTML = `
    <p class="kicker">LGPD Art. 14 · consentimento específico do responsável</p>
    <h1>Consentimentos</h1>
    <p class="sub">Campo sem consentimento nasce bloqueado — a proteção é regra do sistema, não lembrete de processo.</p>

    <div class="kpis" style="margin-top:16px;grid-template-columns:1fr 1fr">
      <div class="kpi"><b>${d.ativos}</b><span>Ativos</span></div>
      <div class="kpi"><b>${d.pendentes}</b><span>Pendentes</span><small>campos bloqueados por padrão</small></div>
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
    </div>

    <div class="cartao" style="margin-top:14px">
      <h2>Governança por campo</h2>
      <p class="sub">Regra 3 do bloco 6: campo sem estas quatro respostas não entra no sistema.</p>
      <div class="rolagem" style="margin-top:10px"><table>
        <thead><tr><th>Campo</th><th>Base legal</th><th>Titular</th><th>Acesso</th><th>Retenção</th></tr></thead>
        <tbody>${d.governanca.map(g => `<tr>
          <td><b>${esc(g.rotulo)}</b></td><td>${esc(g.base_legal)}</td><td>${esc(g.titular)}</td>
          <td>${esc(g.acesso)}</td><td>${esc(g.retencao)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
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
      <div class="contagem entra" style="animation-delay:.15s">${agenda.concluidas} de ${agenda.observaveis}</div>
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

function blocosDaFolha() {
  const f = ctx.folha, c = f.catalogos;
  return `
    <div class="cartao">
      <div class="lbl" id="lbl-atividade">O que a turma fez</div>
      <div role="group" aria-labelledby="lbl-atividade">${pills(c.atividades, [f.campos.atividade], 'atividade', true)}</div>
    </div>
    <div class="cartao">
      <div class="lbl" id="lbl-area">Área do encontro</div>
      <div role="group" aria-labelledby="lbl-area">${pills(c.areas, [f.campos.area_tematica], 'area_tematica', true)}</div>
    </div>
    <div class="cartao">
      <div class="lbl" id="lbl-marcadores">Como foi o grupo</div>
      <div role="group" aria-labelledby="lbl-marcadores">${pills(c.marcadores, f.campos.marcadores_turma, 'marcadores_turma', false)}</div>
      <p class="sub" style="margin-top:4px">Até ${c.max_marcadores} marcadores. Descrevem o grupo, nunca uma criança.</p>
    </div>
    <div class="cartao">
      <div class="dado">
        <span class="k">Pediram ajuda</span>
        <span class="step">
          <button type="button" data-acao="ajuda" data-d="-1" aria-label="Menos um">−</button>
          <b id="ajuda">${f.campos.pediram_ajuda}</b>
          <button type="button" data-acao="ajuda" data-d="1" aria-label="Mais um">+</button>
        </span>
      </div>
      <div class="dado">
        <span class="k">Faltaram</span>
        <span>${f.faltas.length
          ? f.faltas.map(n => `<span class="p redsoft" style="margin:0 4px 0 0">${esc(n)}</span>`).join('')
          : '<span class="sub">ninguém</span>'}</span>
      </div>
    </div>`;
}

async function carregarFolha(turmaId, data) {
  const d = await api(`/api/folha?turma_id=${turmaId}&data=${data || ''}`);
  ctx.folha = {
    turma: d.turma, data: d.data, catalogos: d.catalogos,
    encontro: d.encontro, existente: d.folha,
    faltas: d.chamada.criancas.filter(c => c.status === 'F').map(c => c.nome),
    // Editar a mao uma folha que veio da voz e' edicao MANUAL: manter 'voz' aqui
    // sujaria a taxa de correcao do agente com correcao que nao foi dele.
    origem: 'manual',
    sugestao: null, excluido: !!d.folha?.conteudo_excluido, trechos: [], baixaConfianca: false,
    campos: {
      atividade: d.folha?.atividade ?? 'nao_identificada',
      area_tematica: d.folha?.area_tematica ?? 'nenhuma',
      marcadores_turma: d.folha?.marcadores ?? [],
      pediram_ajuda: d.folha?.pediram_ajuda ?? 0,
      conteudo_excluido: !!d.folha?.conteudo_excluido,
    },
  };
  return d;
}

rota(/^#\/folha/, async () => {
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
    <h1>Folha do dia</h1>
    <p class="sub">${esc(d.turma.nome)} · ${esc(porExtenso(d.data))}</p>
    <div class="pilha">
      ${blocosDaFolha()}
      <div class="aviso neutro">O que cada criança fez não entra aqui. Esta folha é da turma.</div>
      ${fechada ? `
        <div class="aviso"><h3>Folha fechada</h3>
          <p>Esta folha foi fechada em ${dataBR(d.folha.confirmado_em)} e não aceita mais alteração.
             Se ficou errada, a coordenação reabre.</p>
          ${sessao.papel === 'coordenacao'
            ? `<div class="linha"><button class="btn pequeno" data-acao="reabrir-folha">Reabrir a folha</button></div>` : ''}
        </div>`
        : `
        <button class="btn largo" data-acao="ir" data-href="#/voz">Contar como foi</button>
        <button class="btn largo secundario" data-acao="salvar-folha" data-fechar="1">Fechar a folha</button>`}
      <button class="btn largo fantasma" data-acao="imprimir">Imprimir a folha</button>
    </div>
    <p class="rodape">Registro da turma. Base legal: legítimo interesse — execução do programa.</p>`;
  if (fechada) document.querySelectorAll('[data-acao="pill"],[data-acao="ajuda"]')
    .forEach(b => { b.disabled = true; b.style.opacity = '.55'; });
});

// ======================================================================
// REGISTRAR POR VOZ (F3) — 40 s, áudio descartado na transcrição.
// ======================================================================
const temReconhecimento = () =>
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

rota(/^#\/voz/, async () => {
  const h = await api('/api/hoje');
  if (!h.turma) { app.innerHTML = `<div class="cartao"><h2>Sem turma atribuída</h2></div>`; return; }
  const d = await carregarFolha(h.turma.id, h.data_folha);
  if (!d.encontro) { location.hash = '#/folha'; navegar(); return; }

  const nativo = !!temReconhecimento();
  ctx.voz = { transcricao: '', gravando: false, restante: d.catalogos.voz_segundos, rec: null, timer: null };

  app.innerHTML = `
    <p class="kicker">Folha do dia · turma</p>
    <h1>Contar como foi</h1>
    <p class="sub">${esc(d.turma.nome)} · ${esc(porExtenso(d.data))}</p>

    <div class="cartao voz" style="margin-top:16px">
      <div class="lbl" id="voz-estado" role="status" aria-live="polite" style="margin:0">${nativo ? 'Pronto' : 'Ditado do teclado'}</div>
      <button class="mic" id="mic" data-acao="voz-toggle" aria-pressed="false"
              aria-label="Começar a gravar" ${nativo ? '' : 'disabled'}><i aria-hidden="true"></i></button>
      <div class="onda" id="onda" aria-hidden="true">${Array.from({ length: 15 }, () => '<i style="height:5px"></i>').join('')}</div>
      <div class="contagem-voz" id="contagem" role="status" aria-live="polite">0:00 de 0:${String(d.catalogos.voz_segundos).padStart(2, '0')}</div>
    </div>

    <div class="cartao compacto" style="margin-top:10px">
      <p class="sub">Fale enquanto arruma a sala. Diga como foi a turma, o que fizeram e quem faltou.</p>
    </div>

    <div class="cartao" style="margin-top:10px">
      <div class="lbl">${nativo ? 'Ou escreva o que você contaria' : 'Este navegador não transcreve voz — escreva aqui'}</div>
      <p class="sub" style="margin-bottom:10px">${nativo
        ? 'Se o microfone não pegar, ou se você preferir, digite aqui — ou use o microfone do teclado do celular para ditar neste campo.'
        : 'Digite aqui, ou use o microfone do teclado do celular para ditar neste campo.'}
        O resto é idêntico: o Percurso extrai os campos e você confirma.</p>
      <textarea id="ditado" placeholder="Ex.: hoje a gente fez uma roda de conversa sobre saúde, a turma participou bastante e três pediram ajuda."></textarea>
    </div>

    <div class="pilha">
      <button class="btn largo" data-acao="voz-terminei" id="btn-terminei">Terminei</button>
      <button class="btn largo secundario" data-acao="ir" data-href="#/folha">Prefiro escrever</button>
    </div>
    <p class="rodape">O áudio é apagado assim que o texto é extraído.<br>
      A transcrição acontece no seu aparelho e não é gravada em lugar nenhum.</p>`;
});

function pararVoz() {
  const v = ctx.voz; if (!v) return;
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
// CONFIRMAR REGISTRO (F6) — nada é gravado antes de confirmar.
// ======================================================================
rota(/^#\/confirmar/, async () => {
  if (!ctx.folha || !ctx.folha.sugestao) { location.hash = '#/voz'; navegar(); return; }
  const f = ctx.folha;
  app.innerHTML = `
    <p class="kicker">Nada foi gravado ainda</p>
    <h1>O que entendi</h1>
    <p class="sub">Confira e ajuste antes de guardar</p>

    ${f.baixaConfianca ? `
      <div class="aviso" style="margin-top:14px">
        <h3>Não consegui entender direito</h3>
        <p>Marque você mesma. Não pré-marquei nada — falhar em branco é melhor que falhar preenchido.</p>
      </div>` : ''}

    <div class="pilha">
      ${blocosDaFolha()}
      ${f.excluido ? `
        <div class="aviso" role="alert">
          <h3>Tem algo aqui que não entra no sistema</h3>
          <p>Fale com a coordenação — esse caminho é fora daqui.
             ${f.trechos.length ? `O trecho era de <b>${esc(f.trechos.map(t => t.categoria).join(', '))}</b>.` : ''}
             Ele não foi extraído, não foi gravado e não fica em lugar nenhum.</p>
        </div>` : ''}
      <button class="btn largo" data-acao="salvar-folha" data-fechar="0">Confirmar e guardar</button>
      <button class="btn largo secundario" data-acao="descartar-folha">Descartar</button>
      <button class="btn largo fantasma" data-acao="ir" data-href="#/voz">Regravar</button>
    </div>
    <p class="rodape">Áudio e transcrição são apagados ao confirmar.<br>
      Confiança do extrator nesta fala: ${f.sugestao.confianca != null ? String(f.sugestao.confianca).replace('.', ',') : '—'}.</p>`;
});

// ======================================================================
// PAUTA DE SEGUNDA (F11) — o laço de devolução.
// ======================================================================
rota(/^#\/pauta/, async () => {
  const h = await api('/api/hoje');
  if (!h.turma) { app.innerHTML = `<div class="cartao"><h2>Sem turma atribuída</h2></div>`; return; }
  const p = await api(`/api/pauta?turma_id=${h.turma.id}`);
  ctx.pautaTurma = h.turma.id;

  app.innerHTML = `
    <p class="kicker">Segunda-feira · gerado sozinho</p>
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
});

// ======================================================================
// SCORES (F8/F9/F10) — coordenação e diretoria. Nunca em tela de professora.
// ======================================================================
rota(/^#\/scores/, async () => {
  const d = await api('/api/scores');
  const e = d.evasao, c = d.cobertura, x = d.exposicao;
  app.innerHTML = `
    <p class="kicker">Três scores · nenhum pontua a criança</p>
    <h1>Scores</h1>
    <p class="sub">${esc(d.doutrina)}</p>

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
});

// ======================================================================
// RELATÓRIO DO CICLO (F13/F14) — diretoria.
// ======================================================================
rota(/^#\/relatorio/, async () => {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const tipo = params.get('tipo') || 'ciclo';
  const periodo = params.get('periodo') || '';
  const d = await api(`/api/relatorio?tipo=${tipo}${periodo ? `&periodo=${periodo}` : ''}`);
  ctx.rel = { tipo, periodo, periodos: d.periodos };
  const r = d.relatorio, n = d.previa;

  app.innerHTML = `
    <p class="kicker">Diretoria · saída para quem financia</p>
    <h1>Boa tarde, ${esc(sessao.apelido.split(' ')[0])}.</h1>
    <p class="sub">O doador não entra no sistema. Ele recebe este artefato, gerado e revisado aqui.</p>

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
          <p>${esc(b.texto)}</p>
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
});

// ======================================================================
// CONSULTA EM LINGUAGEM NATURAL (F15) — só a camada agregada.
// ======================================================================
rota(/^#\/consulta/, async () => {
  app.innerHTML = `
    <p class="kicker">Camada agregada · nunca dado individual</p>
    <h1>Perguntar à base</h1>
    <p class="sub">Escreva a pergunta. A resposta é montada com número vindo do banco — se eu não souber, eu digo que não sei.</p>
    <div class="cartao" style="margin-top:16px">
      <input type="text" id="pergunta" placeholder="Ex.: quantas crianças estão em risco de sair?" autocomplete="off">
      <div class="linha" style="margin-top:12px"><button class="btn largo" data-acao="perguntar">Perguntar</button></div>
    </div>
    <div id="resposta" class="pilha"></div>
    <p class="rodape">Dado individual de criança não é respondido aqui, em nenhuma formulação.</p>`;
  document.getElementById('pergunta')?.focus();
});

// ======================================================================
// INGESTÃO RETROATIVA (F7) — coordenação.
// ======================================================================
rota(/^#\/importar/, async () => {
  const [{ importacoes }, { turmas }] = await Promise.all([api('/api/importacoes'), api('/api/turmas')]);
  app.innerHTML = `
    <p class="kicker">Camada 1 · a série histórica que um sistema novo só teria em 2029</p>
    <h1>Importar planilha antiga</h1>
    <p class="sub">Colunas escritas de qualquer jeito, nomes em três grafias, presença como P/F, 1/0 ou sim/não.
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
});

// ======================================================================
// MODAL DO FILTRO DE PROTECAO
// ======================================================================
// Modal com um campo — usado no registro de consentimento.
// Substitui o prompt() nativo: mesma linguagem visual, foco gerenciado e Esc funciona.
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
  veu.querySelector('[data-acao="encaminhamento-ok"]').focus();
  veu.addEventListener('click', (e) => {
    if (e.target.dataset.acao === 'encaminhamento-ok' || e.target === veu) veu.remove();
  });
}

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

  if (a === 'entrar') {
    const { usuario } = await post('/api/sessao', { educador_id: Number(alvo.dataset.id) });
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
    await post('/api/sair');
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
      if (r.abertas?.length) {
        location.hash = `#/chamada?data=${r.abertas[r.abertas.length - 1]}`;
        toast(`Ainda há ${r.abertas.length} data(s) em aberto — abri a próxima para você.`);
        navegar();
      } else {
        location.hash = '#/hoje';
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
    document.querySelector('.festa')?.remove();
    location.hash = alvo.dataset.href;
    navegar();
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
      const neutro = g === 'atividade' ? 'nao_identificada' : 'nenhuma';
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

  if (a === 'ajuda') {
    const c = ctx.folha.campos;
    c.pediram_ajuda = Math.max(0, Math.min(30, c.pediram_ajuda + Number(alvo.dataset.d)));
    document.getElementById('ajuda').textContent = c.pediram_ajuda;
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
      if (enviado) toast(alvo.dataset.fechar === '1' ? 'Folha fechada.' : 'Folha guardada.', 'bom');
      location.hash = '#/hoje'; navegar();
    } finally { alvo.disabled = false; }
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

  // ---- captura por voz (F3) ----
  if (a === 'voz-toggle') {
    const v = ctx.voz;
    if (v.gravando) { pararVoz(); document.getElementById('voz-estado').textContent = 'Pausado'; return; }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) { toast('Este navegador não transcreve voz. Escreva no campo abaixo.'); return; }
    const rec = new Rec();
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = false;
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
    v.rec = rec; v.gravando = true; v.restante = ctx.folha.catalogos.voz_segundos;
    try { rec.start(); } catch {}
    alvo.classList.add('gravando');
    alvo.setAttribute('aria-pressed', 'true');
    alvo.setAttribute('aria-label', 'Parar de gravar');
    document.getElementById('onda').classList.add('ativa');
    document.getElementById('voz-estado').textContent = 'Gravando';
    v.timer = setInterval(() => {
      v.restante--;
      animarOnda();
      const total = ctx.folha.catalogos.voz_segundos;
      const dec = document.getElementById('contagem');
      if (dec) {
        const usado = total - v.restante;
        dec.textContent = `0:${String(Math.max(0, usado)).padStart(2, '0')} de 0:${total}`;
        dec.classList.toggle('acabando', v.restante <= 8);
      }
      if (v.restante <= 0) {
        pararVoz();
        const el = document.getElementById('voz-estado');
        if (el) el.textContent = 'Quarenta segundos — pode tocar em Terminei';
      }
    }, 1000);
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
      const r = await post('/api/voz/extrair', { turma_id: ctx.folha.turma.id, transcricao: texto });
      // A transcricao sai de cena aqui: nao foi gravada e nao volta para a tela.
      v.transcricao = '';
      const el = document.getElementById('ditado'); if (el) el.value = '';
      const f = ctx.folha;
      f.origem = 'voz';
      f.sugestao = r.extracao;
      f.excluido = r.excluido;
      f.trechos = r.trechos;
      f.baixaConfianca = r.baixa_confianca;
      f.campos = {
        atividade: r.extracao.atividade,
        area_tematica: r.extracao.area_tematica,
        marcadores_turma: [...r.extracao.marcadores_turma],
        pediram_ajuda: r.extracao.pediram_ajuda,
        conteudo_excluido: r.extracao.conteudo_excluido,
      };
      if (r.excluido) modalEncaminhamento(r.trechos);
      location.hash = '#/confirmar'; navegar();
    } catch (e) {
      if (e.rede) {
        toast('Sem internet. O registro manual continua funcionando.', 'ruim');
        location.hash = '#/folha'; navegar();
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
    const campo = document.getElementById('pergunta');
    const q = campo?.value.trim();
    if (!q) { toast('Escreva a pergunta.'); return; }
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
    const nome = alvo.dataset.nome;
    const id = Number(alvo.dataset.id);
    modalCampo({
      titulo: 'Registrar consentimento',
      texto: `Consentimento específico do responsável (LGPD Art. 14) para o registro socioemocional de ${nome}. `
           + 'O registro fica gravado com o nome de quem consentiu e pode ser revogado a qualquer momento.',
      rotulo: 'Quem é o responsável que consentiu?',
      dica: 'Nome do responsável',
      confirmar: 'Registrar e desbloquear',
    }, comErro(async (responsavel) => {
      for (const campo of ['rubrica_socioemocional', 'campo_livre']) {
        await post('/api/consentimento', { crianca_id: id, campo, status: 'ativo', responsavel });
      }
      toast(`Consentimento registrado. O campo de ${nome} foi desbloqueado.`, 'bom');
      navegar();
    }));
    return;
  }
}));

async function depoisDaObservacao(r, concluir) {
  if (concluir && r.agenda && r.agenda.pendentes === 0) {
    await celebrar(r.agenda);
    return;
  }
  location.hash = '#/ciclo';
  navegar();
}

document.addEventListener('change', comErro(async (ev) => {
  const a = ev.target.dataset.acao;
  if (a === 'trocar-data')     { location.hash = `#/chamada?data=${ev.target.value}`; navegar(); }
  if (a === 'trocar-programa') { location.hash = `#/sintese${ev.target.value ? `?programa_id=${ev.target.value}` : ''}`; navegar(); }
}));

let buscaTimer;
document.addEventListener('input', (ev) => {
  if (ev.target.dataset.acao !== 'buscar') return;
  clearTimeout(buscaTimer);
  const termo = ev.target.value;
  buscaTimer = setTimeout(comErro(async () => {
    const { criancas } = await api(`/api/criancas?q=${encodeURIComponent(termo)}`);
    const alvo = document.getElementById('resultado');
    if (alvo) alvo.innerHTML = listaCriancas(criancas);
  }), 220);
});

document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  const veu = document.querySelector('.veu');
  if (veu) { veu.remove(); return; }
  document.querySelector('.festa')?.remove();
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
  navegar();
  if (sessao) drenarFila();
})();
