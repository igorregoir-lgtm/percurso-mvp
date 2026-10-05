// Percurso — captura os quadros do video demonstrativo (roteiro v3,
// docs/ROTEIRO-DO-VIDEO.md: 18 cenas em 5 blocos).
//
// Pilota um Chrome headless com perfil TEMPORARIO (nao toca no Chrome do usuario,
// nao grava a area de trabalho: os quadros vem da propria aba, via CDP).
//
// Antes de rodar (ver video/README.md):
//   - servidor no ar com AI_ENABLED=1 e PERCURSO_AUDIO=1 (as tres portas longas
//     so' aparecem com o transcritor ligado);
//   - banco recem-semeado e `node scripts/preparar-sessao.mjs` (cena 6/7 precisam
//     do sabado da Vivencia em aberto).
//   BASE=http://localhost:3920 node video/gravar.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { conectar, esperar } from './cdp.mjs';

const BASE   = process.env.BASE || 'http://localhost:3000';
const SAIDA  = join(import.meta.dirname, 'quadros');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PERFIL = '/tmp/percurso-chrome-video';
// A porta de depuracao NAO e' a 9222: nesta maquina ela pode estar com o Chrome
// do dia a dia aberto em modo de depuracao, e `conectar()` pegaria a primeira aba
// DELE — o roteiro sairia clicando no navegador de outra pessoa.
const PORTA  = Number(process.env.CDP_PORTA) || 9232;

// Totais das baterias mostrados no fecho tecnico (cena 18). CONFERIR ANTES DE
// GRAVAR: mudam a cada bateria nova (o roteiro anterior mandava ler 242 e 63).
// Execucao final de 05/10/2026.
const BATERIAS = [
  ['npm run test:unit',         '224 passaram · 0 falharam', 'unidade (node:test)'],
  ['npm test',                  '515 passaram · 0 falharam', 'smoke — fluxo principal'],
  ['npm run test:persistencia', '9 passaram · 0 falharam',   'dado sobrevive ao reinício'],
  ['npm run test:quebra',       '17 passaram · 0 falharam',  'entrada inválida, de propósito'],
  ['npm run test:ia',           '24 passaram · 0 falharam',  'camada de IA, com stub'],
  ['npm run test:audio',        '19 passaram · 0 falharam',  'transcrição, com stub'],
  ['npm run test:rag',          '6 passaram · 0 falharam',   'corpus e busca'],
];

try {
  await fetch(`http://127.0.0.1:${PORTA}/json/version`);
  console.error(`A porta ${PORTA} ja' tem um navegador em depuracao. Feche-o ou use CDP_PORTA=<outra>.`);
  process.exit(1);
} catch { /* porta livre: e' o esperado */ }

rmSync(SAIDA, { recursive: true, force: true });
rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${PERFIL}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none',
  BASE,
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

// Espera a porta de depuracao subir (o Chrome leva alguns segundos no primeiro arranque).
let pronto = false;
for (let i = 0; i < 40 && !pronto; i++) {
  await esperar(500);
  try { await (await fetch(`http://127.0.0.1:${PORTA}/json/version`)).json(); pronto = true; } catch {}
}
if (!pronto) { console.error(`Chrome nao abriu a porta ${PORTA}.`); process.exit(1); }
await esperar(800);

const p = await conectar(PORTA);
await p.enviar('Page.enable');
await p.enviar('Runtime.enable');

// ---------------------------------------------------------------- utilidades
let n = 0;
const roteiro = [];
let atual = null;
const avisos = [];

/** Uma legenda no ar. `passo` = segundos de cada quadro intermediario (montar.mjs). */
const cena = (legenda, { modo = 'mobile', passo } = {}) => {
  atual = { legenda, modo, quadros: [] };
  if (passo) atual.passo = passo;
  roteiro.push(atual);
};

// Vigia o que NAO pode ir para o video: tela de erro, "Carregando…", toast de erro.
async function vigiar(erroEsperado = false) {
  const r = await p.avaliar(`
    const t = document.body.innerText;
    return {
      ruim: [...document.querySelectorAll('.toast.ruim')].map(x => x.textContent),
      carregando: !!document.querySelector('.carregando'),
      erroTela: /Não deu para abrir esta tela|Tela não encontrada/.test(t),
      vaza: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      hash: location.hash,
    };`);
  const prob = [];
  if (r.ruim.length) prob.push(`toast de erro: ${r.ruim.join(' | ')}`);
  if (r.carregando) prob.push('tela em "Carregando…"');
  if (r.erroTela && !erroEsperado) prob.push('tela de erro');
  if (r.vaza) prob.push('pagina mais larga que a tela (transbordo horizontal)');
  if (prob.length) {
    const msg = `[quadro ${n + 1} · ${r.hash}] ${prob.join('; ')} — legenda: "${(atual?.legenda || '').slice(0, 60)}"`;
    avisos.push(msg);
    console.warn('AVISO', msg);
  }
}

async function tirar(qtd = 1, intervalo = 260, { erroEsperado = false } = {}) {
  for (let i = 0; i < qtd; i++) {
    if (i === 0) await vigiar(erroEsperado);
    const arq = `q${String(++n).padStart(4, '0')}.png`;
    writeFileSync(join(SAIDA, arq), await p.foto());
    atual.quadros.push(arq);
    if (i < qtd - 1) await esperar(intervalo);
  }
}

const MOBILE  = { width: 430, height: 880, escala: 2, mobile: true };
const DESKTOP = { width: 1320, height: 830, escala: 1.5, mobile: false };

const J = JSON.stringify;
const ir = async (hash, ms = 1500) => { await p.avaliar(`location.hash=${J(hash)};`); await esperar(ms); };
const clicar = async (sel, ms = 900) => {
  await p.avaliar(`const e=document.querySelector(${J(sel)}); if(!e) throw new Error('nao achei ${sel.replace(/'/g, '')}'); e.click();`);
  await esperar(ms);
};
/** Clica no primeiro elemento `sel` cujo texto casa com `re` (fonte de RegExp). */
const clicarTexto = async (sel, re, ms = 900) => {
  await p.avaliar(`const e=[...document.querySelectorAll(${J(sel)})].find(x=>new RegExp(${J(re)}, 'i').test(x.textContent));
    if(!e) throw new Error('nao achei ' + ${J(sel + ' ~ ' + re)}); e.click();`);
  await esperar(ms);
};
/** Rola ate o elemento (seletor + texto opcional) ficar a `margem` px do topo. */
const rolarAte = async (sel, re = null, margem = 90, ms = 900) => {
  await p.avaliar(`const e=[...document.querySelectorAll(${J(sel)})].find(x=>${re ? `new RegExp(${J(re)}, 'i').test(x.textContent)` : 'true'});
    if(!e) throw new Error('nao achei para rolar ' + ${J(sel + ' ~ ' + (re || ''))});
    window.scrollTo({top: e.getBoundingClientRect().top + scrollY - ${margem}, behavior:'instant'});`);
  await esperar(ms);
};
const topo = async (ms = 500) => { await p.avaliar(`window.scrollTo({top:0,behavior:'instant'});`); await esperar(ms); };
const esperarQue = async (cond, limite = 15000, rotulo = cond) => {
  const t0 = Date.now();
  while (Date.now() - t0 < limite) {
    if (await p.avaliar(`return !!(${cond});`)) return true;
    await esperar(250);
  }
  throw new Error(`tempo esgotado esperando: ${rotulo}`);
};
const semBolha = () => p.avaliar(`document.getElementById('aurora-bolha')?.remove();`);
const semToasts = () => p.avaliar(`document.querySelectorAll('#toasts .toast').forEach(t=>t.remove());`);

/** Entra como uma pessoa da lista — o caminho da tela, sem senha (decisao 51). */
async function entrarComo(id) {
  await p.avaliar(`document.querySelector('[data-acao="sair"]')?.click();`);
  await esperarQue(`location.hash==='#/entrar' && document.querySelector('[data-acao="entrar"][data-id="${id}"]')`);
  await esperar(500);
  await clicar(`[data-acao="entrar"][data-id="${id}"]`, 400);
  await esperarQue(`!location.hash.startsWith('#/entrar') && document.querySelector('#app h1')`);
  await esperar(1400);
  await semBolha();
  await semToasts();
}

// Marca a ancora que falta em cada dimensao (nivel variado, nunca o 1).
const completarAncoras = (base) => p.avaliar(`
  document.querySelectorAll('.ancoras').forEach((g,i)=>{
    const m=[...g.querySelectorAll('.ancora')].some(a=>a.getAttribute('aria-pressed')==='true');
    if(!m) g.querySelectorAll('.ancora')[1 + ((i + ${base}) % 3)].click();
  });`);

// ======================================================================
// BLOCO 1 · A EDUCADORA (celular)
// ======================================================================
await p.viewport(MOBILE);
await p.enviar('Page.navigate', { url: BASE });
await esperar(1500);
await p.avaliar(`await fetch('/api/sair',{method:'POST'}); location.hash='#/entrar';`);
await esperar(1800);

// ---- 0 · abertura
cena('Percurso · Desafio B, Monitoramento de Impacto · Instituto Ebenézer. Todos os dados são sintéticos: nenhum dado real de criança foi usado.');
await tirar(1);

// ---- 1 · entrar
await clicar('[data-acao="entrar"][data-id="1"]', 400);
await esperarQue(`location.hash.startsWith('#/hoje') && document.querySelector('#app h1')`);
await esperar(1500);
await semBolha();
cena('Maria Silvia, educadora: “Não consigo transformar em dados os resultados do meu trabalho.” Foi a frase que originou o produto.');
await tirar(1);

// ---- 2 · chamada (pela retomada: a data em aberto mais antiga)
await clicarTexto('#app [data-acao="ir"]', '^\\s*Retomar por', 1600);
await semToasts();
cena('Chamada: um toque por criança. “Todos presentes” resolve a turma; marca-se só a exceção — meta de menos de 2 minutos.', { passo: 3.6 });
await tirar(1);
await clicar('[data-acao="todos"]', 500);
await p.avaliar(`document.querySelectorAll('#lista .pf button[data-v="F"]')[2].click();`);
await esperar(600);
await tirar(1);

await clicar('[data-acao="salvar-chamada"]', 400);
await esperarQue(`location.hash.startsWith('#/hoje') && /Retomar por/.test(document.querySelector('#app').innerText)`);
await esperar(1100);
await semBolha();
cena('Ao salvar, o Hoje já oferece a próxima data em aberto. Em ONG o registro morre por lapso, não por rejeição.');
await tirar(1);

// ---- 3 · agenda do ciclo
await ir('#/hoje?detalhe=ciclo', 1800);
await semToasts();
cena('Ciclo: 16 de 18. Duas bloqueadas, com o motivo escrito: sem consentimento do responsável (LGPD art. 14), sem janela mínima de convívio.');
await tirar(1);

// ---- 4 · o olhar: ancoras + calibracao
await clicarTexto('#app [data-acao="ir"]', 'a fazer', 1800);
await topo();
cena('O olhar: seis dimensões — os indicadores da planilha socioemocional que o Instituto já usa —, com âncoras de comportamento.');
await tirar(1);

await p.avaliar(`const s=[...document.querySelectorAll('details')].find(x=>/Como calibrar/.test(x.textContent)); s.open=true;`);
await rolarAte('details', 'Como calibrar', 110);
cena('Calibrar: marque o comportamento predominante, não o episódio; na dúvida entre dois níveis, o menor.');
await tirar(1);

await rolarAte('#app h2, #app h3, #app .lbl, #app b', '^\\s*Não há campo de opinião', 260);
cena('E o que não existe nesta tela: campo de opinião sobre a criança.');
await tirar(1);

await completarAncoras(1);
await esperar(400);
await clicar('[data-acao="salvar-obs"][data-concluir="1"]', 400);
await esperarQue(`location.hash.startsWith('#/hoje?detalhe=ciclo')`);
await esperar(1400);

// ---- 5 · o fecho do ciclo: a ultima observacao pendente
await clicarTexto('#app [data-acao="ir"]', 'começada|a fazer', 1800);
await completarAncoras(2);
await esperar(400);
await clicar('[data-acao="salvar-obs"][data-concluir="1"]', 500);
await esperarQue(`document.querySelector('.festa')`, 10000);
// A festa poe o foco no botao do rodape, e o foco rola a caixa ate o fim: sem
// voltar ao topo, a contagem 0 -> 18 e as barras nem apareceriam.
await esperar(120);
await semToasts();
await p.avaliar(`document.activeElement?.blur(); document.querySelector('.festa').scrollTo({top:0,behavior:'instant'});`);
await esperar(250);
cena('');                                   // a revelacao aparece sem fala por cima
await tirar(4, 330);
await esperar(500);
await p.avaliar(`document.querySelector('.festa').scrollTo({top:520,behavior:'smooth'});`);
await esperar(1100);
await tirar(2, 450);

await p.avaliar(`const f=document.querySelector('.festa'); const fr=f.querySelector('.frase');
  f.scrollTo({top: fr.getBoundingClientRect().top - f.getBoundingClientRect().top + f.scrollTop - 140, behavior:'smooth'});`);
await esperar(1300);
cena('É esta frase — e não o número de presenças — que o Instituto não conseguia dizer a quem financia.');
await tirar(1);

// ======================================================================
// BLOCO 2 · A PSICOLOGA (celular)
// ======================================================================
await p.avaliar(`document.querySelector('[data-acao="fechar-festa"][data-href="#/hoje"]')?.click();`);
await esperar(1200);
await entrarComo(5);

// ---- 6 · quem realmente escreve o relatorio
cena('Carolina Duarte, psicóloga, na visita de 29/08: “o maior desafio aqui é registrar o que você fez (…) é o registro.”');
await tirar(1);

await clicarTexto('#app [data-acao="ir"]', '^\\s*Chamada de \\d', 1700);
await semToasts();
cena('A turma dela fica fora da rubrica: o olhar clínico não vira dado. Entra presença — a chamada do sábado em aberto —, procedimento e check-in.', { passo: 3.6 });
await tirar(1);
await clicar('[data-acao="todos"]', 700);
await tirar(1);
await clicar('[data-acao="salvar-chamada"]', 400);
await esperarQue(`location.hash.startsWith('#/hoje') && /pendente/.test(document.querySelector('#app').innerText)`);
await esperar(1200);
await semToasts();

// ---- 7 · contar como foi — voz + filtro de perimetro
await clicarTexto('#app [data-acao="ir"]', '^\\s*Falar agora', 1900);
await esperarQue(`document.getElementById('mic') && document.getElementById('portas')`, 8000, 'tela de voz com as portas longas');
await topo();
cena('“Contar como foi”. Antes do toque, a tela diz o que grava e o que não: nenhuma criança é gravada; nome falado vira código.');
await tirar(1);

await rolarAte('#portas', null, 120);
cena('Três portas longas — a de gravar o encontro vem desligada. Nelas o áudio vai ao computador do Instituto e é apagado ao virar texto.', { passo: 4 });
await tirar(1);
await clicar('[data-acao="porta"][data-porta="A"]', 600);
await rolarAte('#porta-painel', null, 140);
await tirar(1);
await clicar('[data-acao="porta-fechar"]', 500);

// O Chrome headless nao tem microfone. A transcricao entra pelo MESMO caminho do
// reconhecimento do navegador (SpeechRecognition.onresult -> ctx.voz.transcricao),
// e a legenda diz que e' simulada. Nada e' gravado antes de "Confirmar e guardar".
await p.avaliar(`
  window.__falaVideo = [
    'Hoje a gente fez a roda das emoções, para eles nomearem o que sentem.',
    'Duas crianças ajudaram sem ninguém pedir, seis participaram do começo ao fim.',
    'Teve um conflito e resolveram conversando.',
    'A mãe da Ana contou que ela começou terapia esta semana.',
  ];
  class ReconhecimentoSimulado {
    constructor() { this.lang = 'pt-BR'; this.continuous = true; this.interimResults = false; }
    start() {
      if (this._iniciado) return; this._iniciado = true;
      window.__falaVideo.forEach((f, i) => setTimeout(() => {
        if (this._parado) return;
        const lista = [[{ transcript: f, confidence: 0.95 }]]; lista[0].isFinal = true;
        this.onresult?.({ resultIndex: 0, results: lista });
      }, 700 + i * 900));
    }
    stop() { this._parado = true; }
    abort() { this._parado = true; }
  }
  window.SpeechRecognition = ReconhecimentoSimulado;
  window.webkitSpeechRecognition = ReconhecimentoSimulado;`);
await topo();
await clicar('#mic', 1100);
cena('Microfone, onda e relógio contando para cima: 40 s é sugestão, não teto. Transcrição simulada para o vídeo — o Chrome da gravação não tem microfone.', { passo: 1 });
await tirar(5, 1000);

// A magia segura "Lendo o que você contou…" por no minimo 650 ms (o piso do
// POST); 430 ms depois do toque as palavras ja' entraram e o estado ainda nao virou.
await clicar('#btn-terminei', 430);
cena('Terminei. A fala — roda das emoções, contagens do grupo e “a mãe da Ana contou que ela começou terapia” — aparece uma vez e esmaece.', { passo: 6.5 });
await tirar(1);
await esperar(550);
await tirar(1);

await esperarQue(`location.hash.includes('passo=confirmar') && document.querySelector('.veu [data-acao="encaminhamento-ok"]')`, 10000, 'modal de encaminhamento');
await esperar(700);
cena('O filtro de perímetro isola a frase da terapia e devolve encaminhamento humano. Não grava o trecho nem a transcrição.');
await tirar(1);

await clicar('[data-acao="encaminhamento-ok"]', 600);
await topo();
cena('O extrator escolhe em listas fixas, nunca texto livre: roda de emoções; check-in 2 · 6 · 1 · 1 — contagens da turma, nunca de uma criança.', { passo: 4.5 });
await tirar(1);
await rolarAte('#blocos-folha .lbl, #blocos-folha h3, #blocos-folha div', '^\\s*Quantas, no grupo', 150);
await tirar(1);

await clicar('[data-acao="pill"][data-grupo="objetivo"][data-codigo="expressao"]', 500);
await p.avaliar(`const b=document.querySelector('[data-acao="pill"][data-grupo="objetivo"][data-codigo="expressao"]').closest('.cartao');
  window.scrollTo({top: b.getBoundingClientRect().top + scrollY - 150, behavior:'instant'});`);
await esperar(700);
cena('Nada foi gravado ainda. O objetivo veio em branco: ela marca e só então confirma. O campo que o extrator erra é o que ela corrige.', { passo: 5 });
await tirar(1);
await rolarAte('[data-acao="salvar-folha"]', null, 420);
await tirar(1);

// ---- 8 · o relato no padrao do conselho (abre sozinho ao confirmar)
await clicar('[data-acao="salvar-folha"]', 400);
await esperarQue(`location.hash.startsWith('#/sai-daqui') && document.querySelector('[data-acao="liberar-relato"]')`, 10000, 'relato');
await esperar(1000);
cena('Confirmar abre o relato do conselho, feito dos campos fechados — não há onde escrever nome de criança. Só vale depois do OK dela.', { passo: 5 });
await tirar(1);
await semToasts();
await clicar('[data-acao="liberar-relato"]', 400);
await esperarQue(`/· liberado/.test(document.querySelector('#app').innerText)`, 8000, 'relato liberado');
await esperar(900);
await topo();
await tirar(1);

// ---- 9 · recado aos responsaveis + a regua de 75% (pelo botao do cartao, na tela Hoje)
await semToasts();
await clicar('#nav a[href="#/hoje"]', 1800);
await rolarAte('#app [data-acao="ir"]', 'Recado para os responsáveis', 260);
cena('Recado aos responsáveis pelo botão da turma da manhã — ela tem duas. Pronto para o WhatsApp, com a presença do mês contra a régua de 75%.', { passo: 3.6 });
await tirar(1);
await clicarTexto('#app [data-acao="ir"]', 'Recado para os responsáveis.*manhã', 1800);
await topo();
await tirar(1);

await rolarAte('#app h2, #app h3', 'Para o grupo da turma', 300);
cena('Recado e régua já existiam, feitos à mão. O produto absorveu o que acontecia — e o recado é da turma, nunca de uma criança.');
await tirar(1);

// ---- 10 · parecer a profissional parceiro
await clicar('#nav a[href="#/crianca"]', 1800);
await clicarTexto('#app [data-acao="ir"]', 'Bruno F\\.', 1900);
await rolarAte('#app h2', 'Parecer a profissional parceiro', 150);
cena('Parecer a profissional parceiro: o único dado individual que sai — por código, sem conteúdo clínico. Sem consentimento específico, não sai; quem registra é a coordenação.');
await tirar(1);

// ======================================================================
// BLOCO 3 · A COORDENACAO (desktop)
// ======================================================================
await p.viewport(DESKTOP);
await esperar(600);
await entrarComo(2);
await topo(700);
cena('Coordenação. 106 crianças únicas para 120 matrículas: “120” era matrícula, não criança.', { modo: 'desktop' });
await tirar(1);

await rolarAte('#app p, #app div', '^\\s*Vivência terapêutica — Fora da rubrica', 420);
cena('A Vivência aparece fora da rubrica, com o motivo declarado na tela — não é ausência silenciosa.', { modo: 'desktop' });
await tirar(1);

await rolarAte('#app h2, #app h3', 'Calibração do olhar entre educadoras', 110);
cena('Calibração entre educadoras: convite a calibrar juntas com as âncoras — pauta de reunião, nunca avaliação. Só células com 5+ observações.', { modo: 'desktop' });
await tirar(1);

// ---- 12 · scores
await clicarTexto('#app [data-acao="ir"]', '^\\s*Três scores', 1900);
await topo();
cena('Nenhum score pontua a criança. Evasão compara a criança com a linha de base dela; a cobertura mede o sistema, não a professora.', { modo: 'desktop' });
await tirar(1);

// ---- 13 · sintese com revisor
await clicarTexto('#app [data-acao="ir"]', '^\\s*Síntese do ciclo', 1900);
await clicar('[data-acao="gerar-sintese"]', 400);
await esperarQue(`document.querySelector('[data-acao="aprovar-sintese"]')`, 10000, 'sintese gerada');
await esperar(800);
await semToasts();
await rolarAte('#app h2, #app h3', '^\\s*Texto gerado', 150);
cena('Síntese: números do banco, template fechado. Revisor de sobre-alegação: aprovado. Aprovação humana: pendente — até uma pessoa aprovar.', { modo: 'desktop', passo: 5 });
await tirar(1);
await clicar('[data-acao="aprovar-sintese"]', 400);
await esperarQue(`/aprovação humana: feita/.test(document.querySelector('#app').innerText)`, 8000, 'sintese aprovada');
await esperar(800);
await rolarAte('#app h2, #app h3', '^\\s*Texto gerado', 150);
await tirar(1);

// ======================================================================
// BLOCO 4 · A DIRETORIA (desktop)
// ======================================================================
await semToasts();
await entrarComo(4);
await clicar('[data-acao="gerar-relatorio"]', 400);
await esperarQue(`document.querySelector('[data-acao="publicar-relatorio"]')`, 15000, 'rascunho do relatorio');
await esperar(900);
await topo();
cena('Diretoria. Regra zero: o doador não entra no sistema — ele recebe este relatório, gerado e revisado aqui.', { modo: 'desktop' });
await tirar(1);
await semToasts();

await rolarAte('#app h3, #app h2', '^\\s*Quem você ajudou a receber', 190);
cena('Na ordem em que um financiador lê: crianças únicas e matrículas lado a lado, cada criança contada uma vez.', { modo: 'desktop' });
await tirar(1);

await rolarAte('#app .suprimido', null, 330);
cena('E a caixa de supressão: recorte com menos de 5 crianças é agrupado ou fica de fora.', { modo: 'desktop' });
await tirar(1);

const status403 = await p.avaliar(`return (await fetch('/api/crianca?id=2')).status;`);
await ir('#/crianca/2', 1800);
cena(`Prova: neste perfil, a ficha de uma criança não abre — a API responde ${status403}.`, { modo: 'desktop' });
await tirar(1, 260, { erroEsperado: status403 === 403 });

// ---- 15 · perguntar a base
await clicar('#nav a[href="#/relatorio?aba=consulta"]', 1800);
const perguntar = async (q) => {
  await p.avaliar(`const c=document.getElementById('pergunta'); c.value=${J(q)}; c.dispatchEvent(new Event('input',{bubbles:true}));`);
  await esperar(300);
  await clicar('[data-acao="perguntar"]', 300);
  await esperarQue(`document.querySelector('#resposta .cartao') && !document.querySelector('[data-acao="perguntar"]').disabled`, 10000, 'resposta da consulta');
  await esperar(500);
  await p.avaliar(`document.activeElement?.blur();`);
};
await perguntar('Quantas crianças o instituto atende hoje?');
await rolarAte('#pergunta', null, 85);
cena('Perguntar à base: “Quantas crianças o instituto atende hoje?” → contagem, vinda de SQL, com a fonte citada.', { modo: 'desktop' });
await tirar(1);

await perguntar('Quantas crianças estão em risco de sair?');
await perguntar('Como está o Diego na escola?');
await rolarAte('#resposta', null, 120);
cena('“…estão em risco de sair?” começa igual e responde evasão, com o limiar. Sobre uma criança, ela não responde.', { modo: 'desktop' });
await tirar(1);

// ---- 16 · impacto — SROI exploratorio
await clicarTexto('#app [data-acao="ir"]', '^\\s*Impacto potencial', 1900);
await topo();
cena('Impacto (SROI): “associação compatível, não causalidade comprovada”. Sempre faixa, nunca número único — e a faixa depende de números que só o Instituto tem.', { modo: 'desktop', passo: 5 });
await tirar(1);
await rolarAte('[data-acao="sroi-calcular"]', null, 520);
await tirar(1);

// ======================================================================
// BLOCO 5 · A CAMADA OPCIONAL (celular, com a educadora) E O FECHO (desktop)
// ======================================================================
await p.viewport(MOBILE);
await esperar(600);
await entrarComo(1);
const ia = await p.avaliar(`return await (await fetch('/api/ia/status')).json();`);
const iaPronta = !!(ia?.habilitada && ia?.papeis?.reflexivo?.pronto);
await ir('#/pensar', 2000);
await topo();
cena(iaPronta
  ? 'Camada opcional, por último de propósito. Descreva a situação, não a criança. Modelo local: nada sai da máquina, R$ 0 por conversa.'
  : 'Camada opcional, por último de propósito. O modelo local não respondeu agora — e a tela diz isso: nada do registro depende dele.');
await tirar(1);

if (iaPronta) {
  // O modelo local e' compartilhado (outras abas, o painel da Aurora em segundo
  // plano). Mandar a reflexao com os dois slots ocupados estoura o teto de 75 s
  // do cliente — espera o llama-server ficar ocioso, e tenta de novo uma vez.
  const LLAMA = process.env.AI_URL_REFLEXIVO || 'http://127.0.0.1:8081';
  const esperarModeloOcioso = async (limite = 150000) => {
    const t0 = Date.now(); let ocioso = 0;
    while (Date.now() - t0 < limite) {
      try {
        const slots = await (await fetch(`${LLAMA}/slots`)).json();
        ocioso = slots.some(s => s.is_processing) ? 0 : ocioso + 1;
      } catch { return; }                       // sem /slots: segue sem esperar
      if (ocioso >= 6) return;                  // ~3 s seguidos sem processar
      await esperar(500);
    }
  };
  let respondeu = false;
  for (let tentativa = 1; tentativa <= 2 && !respondeu; tentativa++) {
    await esperarModeloOcioso();
    await p.avaliar(`document.getElementById('copilot-texto').value = ${J('Metade da turma se dispersa na roda de leitura depois de uns dez minutos. O que posso tentar na próxima semana?')};`);
    await clicar('[data-acao="copilot-enviar"]', 1500);
    await esperarQue(`!document.querySelector('[data-acao="copilot-cancelar"]') && (document.querySelector('#copilot-fio .cartao') || document.querySelector('.toast.ruim'))`, 100000, 'resposta do copilot');
    await esperar(1200);
    respondeu = await p.avaliar(`return /Fontes do corpus aprovado/i.test(document.getElementById('copilot-fio').innerText);`);
    if (!respondeu) console.warn(`copilot sem resposta na tentativa ${tentativa}`);
  }
  await semToasts();
  if (respondeu) await rolarAte('#copilot-fio .cartao', null, 150); else await topo();
  cena(respondeu
    ? 'Uma situação de prática; a reflexão volta com as fontes do corpus aprovado, citadas como [fonte:ID].'
    : 'Uma situação de prática. O modelo não respondeu a tempo — a tela devolve a pergunta ao campo e nada se perde.',
    { passo: 4.5 });
  await tirar(1);
  if (respondeu) {
    await rolarAte('#copilot-fio .kicker', 'Próximo passo seguro', 150);
    await tirar(1);
  }

  await p.avaliar(`document.getElementById('copilot-texto').value = 'Que diagnóstico o João tem?';`);
  await clicar('[data-acao="copilot-enviar"]', 1200);
  await esperarQue(`!document.querySelector('[data-acao="copilot-cancelar"]')
    && /Que diagnóstico o João tem\\?[\\s\\S]*(não entra no sistema|não faz)/.test(document.getElementById('copilot-fio').innerText)`,
    30000, 'recusa do copilot');
  await esperar(1200);
  await rolarAte('#copilot-fio .cartao', 'Que diagnóstico o João tem', 200);
  cena('“Que diagnóstico o João tem?” é barrado antes do modelo: diagnóstico é ato clínico, e a recusa é determinística.');
  await tirar(1);
}

// ---- 18 · fecho tecnico (moldura de terminal)
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const terminal = `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#f3efe6;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  .jan{width:1180px;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(30,25,45,.25);background:#1f1d29}
  .barra{background:#2c2937;padding:12px 16px;display:flex;align-items:center;gap:8px;color:#a7a1b8;font-size:13px}
  .barra i{width:12px;height:12px;border-radius:50%;display:inline-block}
  .barra span{margin-left:14px}
  pre{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:17.5px;line-height:1.62;color:#e9e5f2;padding:22px 28px 26px}
  .p{color:#8f89a3}.c{color:#f3efe6;font-weight:600}.ok{color:#8fd19e;font-weight:600}.n{color:#f0c674}.d{color:#7d7790}
  .rodape{background:#26232f;color:#e9e5f2;font-size:17px;padding:14px 28px;border-top:1px solid #34303f}
  .rodape b{color:#f0c674}
</style>
<div class="jan">
  <div class="barra"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i>
    <span>2 - MVP Funcional — zsh</span></div>
<pre><span class="p">$</span> <span class="c">node server.js</span>
  ${'Percurso rodando em  http://localhost:3000'.padEnd(53)} <span class="d"># sem npm install, sem build</span>
<span class="p">$</span> <span class="c">ls data/</span>
  <span class="n">${'percurso.db'.padEnd(53)}</span> <span class="d"># o banco é um arquivo: backup é copiar</span>
${BATERIAS.map(([cmd, res, nota]) =>
  `<span class="p">$</span> <span class="c">${esc(cmd.padEnd(26))}</span> <span class="ok">${esc(res.padEnd(26))}</span> <span class="d"># ${esc(nota)}</span>`).join('\n')}</pre>
  <div class="rodape">Node <b>≥ 22.13</b> · sem <b>npm install</b> · <b>R$ 0</b> de licença · <b>AI_ENABLED=false</b> por padrão — o produto inteiro roda sem modelo</div>
</div>`;
await p.viewport(DESKTOP);
await p.enviar('Page.navigate', { url: 'about:blank' });
await esperar(800);
await p.avaliar(`document.open(); document.write(${J(terminal)}); document.close();`);
await esperar(700);
cena('Fecho técnico: node server.js, sem npm install, sem build, sem mensalidade. O banco é um arquivo — backup é copiar.', { modo: 'desktop' });
await tirar(1);
cena('Tudo antes do copilot roda com a IA desligada, que é o padrão. A solução precisa sobreviver à semana 10 — por isso tem esta forma.', { modo: 'desktop' });
await tirar(1);

writeFileSync(join(SAIDA, 'roteiro.json'), JSON.stringify(roteiro, null, 1));
console.log(`${n} quadros capturados em ${roteiro.length} legendas.`);
if (avisos.length) console.log(`\n${avisos.length} aviso(s):\n  ${avisos.join('\n  ')}`);
p.fechar();
chrome.kill();
process.exit(0);
