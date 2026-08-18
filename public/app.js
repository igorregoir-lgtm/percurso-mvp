// Percurso — aplicacao. Sem framework: DOM + hash routing.
// A ordem das telas segue a jornada da persona: hoje -> chamada -> ciclo -> turma.

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
  ['#/hoje', '☀', 'Hoje'], ['#/chamada', '✓', 'Chamada'], ['#/ciclo', '◔', 'Ciclo'],
  ['#/turma', '▥', 'Turma'], ['#/criancas', '☺', 'Crianças'],
];
const NAV_COORDENACAO = [
  ['#/painel', '▦', 'Painel'], ['#/safras', '↝', 'Safras'], ['#/sintese', '✎', 'Síntese'],
  ['#/consentimentos', '🔒', 'Consent.'], ['#/criancas', '☺', 'Crianças'],
];

function pintarNav(rotaAtual) {
  if (!sessao) { navEl.hidden = true; return; }
  const itens = sessao.papel === 'coordenacao' ? NAV_COORDENACAO : NAV_EDUCADOR;
  navEl.hidden = false;
  navEl.innerHTML = itens.map(([href, ic, rot]) =>
    `<a href="${href}" ${rotaAtual.startsWith(href) ? 'aria-current="page"' : ''}>
       <em aria-hidden="true">${ic}</em>${rot}</a>`).join('');
  quemEl.innerHTML =
    `<span class="sintetico">dados sintéticos</span>
     <b>${esc(sessao.apelido)}</b>
     <button class="btn pequeno fantasma" data-acao="sair" style="min-height:32px;padding:5px 10px">sair</button>`;
}

// ------------------------------------------------------------------ roteador
const rotas = [];
const rota = (re, tela) => rotas.push([re, tela]);

async function navegar() {
  const hash = location.hash || '#/hoje';
  if (!sessao && hash !== '#/entrar') { location.hash = '#/entrar'; return; }
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
      <h2>Quem está usando?</h2>
      <p class="sub">Escolha o perfil para entrar. O MVP não guarda senha: o controle de acesso real fica com a coordenação.</p>
      <div class="pilha" style="margin-top:14px">
        ${usuarios.map(u => `
          <button class="item" data-acao="entrar" data-id="${u.id}">
            <div><div class="nome">${esc(u.nome)}</div>
              <div class="meta">${u.papel === 'coordenacao' ? 'Coordenação' : 'Educadora · turma da tarde'}</div></div>
            <span class="seta" aria-hidden="true">›</span>
          </button>`).join('')}
      </div>
    </div>
    <p class="rodape">Todos os dados desta aplicação são sintéticos (regra 1 do bloco 6 do dossiê).<br>
      Nenhum dado real de criança atendida foi usado, em nenhuma etapa.</p>`;
});

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
  const cartaoChamada = !ch ? '' : ch.registrada ? `
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
          : `<button class="btn largo secundario" data-acao="ir" data-href="#/turma">Ver o que a turma mostrou</button>`}
      </div>
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
      ${retomada}${alertas}${cartaoChamada}${cartaoCiclo}${abertas}
    </div>
    <p class="rodape">O Percurso funciona em três gestos: chamada em um toque, observação em minutos —<br>e o resto ele organiza para você.</p>`;
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
    <p class="sub">${esc(d.crianca.codigo)} · ${d.observacao?.status === 'rascunho'
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

      <div class="dim">
        <h3>Quer anotar algo mais? <span style="font-weight:400;color:var(--muted)">(opcional)</span></h3>
        <p class="desc">Filtro de proteção ativo: assuntos da vida íntima ou da família da criança não são gravados aqui — isso protege ela e protege você.</p>
        <p class="desc">Prefere falar? Use o microfone do teclado do celular para ditar — o filtro de proteção vale do mesmo jeito.</p>
        <textarea id="nota" placeholder="Ex.: começou a puxar conversa na roda de leitura."
          ${d.campo_livre.status !== 'ativo' ? 'disabled' : ''}>${esc(ctx.obs.nota)}</textarea>
        ${d.campo_livre.status !== 'ativo'
          ? '<p class="desc" style="margin-top:6px">Campo livre bloqueado: falta o consentimento específico do responsável para este campo.</p>' : ''}
      </div>
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
  const p = await api(`/api/turma/painel?turma_id=${d.turma.id}`);
  app.innerHTML = `
    <p class="kicker">Agregado · sem dado individual</p>
    <h1>Painel da turma</h1>
    <p class="sub">${esc(p.turma.nome)} · médias por dimensão, escala de 1 a 4</p>
    <div class="cartao" style="margin-top:16px">
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
  const { alertas } = await api('/api/alertas');
  app.innerHTML = `
    <p class="kicker">Agir antes da evasão</p>
    <h1>Alertas de ausência</h1>
    <p class="sub">Disparam com 3 faltas consecutivas — antes de virar evasão.</p>
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
  const cores = ['#8a6d3b', '#cd4433', '#3e6b4f'];
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
      <p style="font-family:var(--serif);font-size:16.5px;line-height:1.6;margin-top:12px">${esc(s.texto)}</p>
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
    <p class="rodape">Verbos causais controlados: "contribuiu para", nunca "gerou".<br>A linguagem também é artefato metodológico.</p>
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
        Os programas contribuíram para os avanços observados; fatores externos não foram isolados.”
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

function modalFiltro(dados, aoConfirmar) {
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Filtro de proteção</h2>
      <p>Um trecho da sua anotação parece falar da vida íntima ou da família da criança.
         O Percurso não guarda esse tipo de conteúdo — isso protege a criança e protege você.</p>
      ${dados.filtro.trechos.map(t => `<div class="trecho"><b>${esc(t.categoria)}</b>${esc(t.trecho)}</div>`).join('')}
      <p>Se for algo sério, procure a psicóloga do Instituto — é o canal certo, com o sigilo certo.
         O que você marcou na rubrica será salvo normalmente.</p>
      <div class="linha" style="margin-top:16px">
        <button class="btn cresce" data-acao="filtro-ok">Salvar sem esse trecho</button>
        <button class="btn secundario cresce" data-acao="filtro-voltar">Voltar e editar</button>
      </div>
    </div>`;
  document.body.appendChild(veu);
  veu.querySelector('[data-acao="filtro-ok"]').focus();
  veu.addEventListener('click', (e) => {
    if (e.target.dataset.acao === 'filtro-ok') { veu.remove(); aoConfirmar(); }
    if (e.target.dataset.acao === 'filtro-voltar' || e.target === veu) veu.remove();
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
    location.hash = usuario.papel === 'coordenacao' ? '#/painel' : '#/hoje';
    if (!location.hash) navegar();
    navegar();
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
      const r = await post('/api/chamada', { turma_id: c.turma.id, data: c.data, marcacoes, duracao_segundos: duracao });
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
    const nota = document.getElementById('nota')?.value || '';
    const itens = Object.entries(ctx.obs.marcas).map(([d, n]) => ({ dimensao_id: Number(d), nivel: n }));
    const enviar = async (forcar) => post('/api/observacao', {
      crianca_id: ctx.obs.criancaId, itens, nota_livre: nota, concluir, forcar_limpeza: forcar,
    });
    alvo.disabled = true;
    try {
      let r;
      try { r = await enviar(false); }
      catch (e) {
        if (e.status === 409 && e.dados?.filtro) {
          alvo.disabled = false;
          modalFiltro(e.dados, comErro(async () => {
            const r2 = await enviar(true);
            toast('Observação salva sem o trecho bloqueado.', 'bom');
            await depoisDaObservacao(r2, concluir);
          }));
          return;
        }
        throw e;
      }
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
  document.querySelector('.veu')?.remove();
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
})();
