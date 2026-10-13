// Percurso — capturas de tela numeradas para a documentacao de handover
// (docs/capturas/). O que a aula de handover pede: tela inicial, fluxo
// principal passo a passo, dado salvo e listado, e o que acontece quando algo
// da' errado — sempre com dados sinteticos.
//
// Mesmo desenho do video/gravar.mjs: um Chrome headless com perfil TEMPORARIO,
// pilotado por CDP. Nao toca no Chrome do dia a dia nem em data/percurso.db.
//
// Antes de rodar (banco isolado, recem-semeado, com o sabado da Vivencia em aberto):
//   export PERCURSO_DB=/tmp/percurso-capturas.db PERCURSO_AURORA_DB=/tmp/percurso-capturas-aurora.db
//   node scripts/reset.mjs --limpar && node scripts/preparar-sessao.mjs
//   PORT=3921 HOST=127.0.0.1 node server.js &
//   BASE=http://localhost:3921 node video/capturas.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { conectar, esperar } from './cdp.mjs';

const BASE   = process.env.BASE || 'http://localhost:3921';
const SAIDA  = process.env.SAIDA || join(import.meta.dirname, '..', 'docs', 'capturas');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PERFIL = '/tmp/percurso-chrome-capturas';
// Porta propria: nem a 9222 (Chrome do dia a dia em depuracao) nem a 9232 (video).
const PORTA  = Number(process.env.CDP_PORTA) || 9233;

try {
  await fetch(`http://127.0.0.1:${PORTA}/json/version`);
  console.error(`A porta ${PORTA} ja' tem um navegador em depuracao. Feche-o ou use CDP_PORTA=<outra>.`);
  process.exit(1);
} catch { /* porta livre: e' o esperado */ }

rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${PERFIL}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none',
  BASE,
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

let pronto = false;
for (let i = 0; i < 40 && !pronto; i++) {
  await esperar(500);
  try { await (await fetch(`http://127.0.0.1:${PORTA}/json/version`)).json(); pronto = true; } catch {}
}
if (!pronto) { console.error(`Chrome nao abriu a porta ${PORTA}.`); process.exit(1); }

const p = await conectar(PORTA);
await p.enviar('Page.enable');
await p.enviar('Runtime.enable');

// ---------------------------------------------------------------- utilidades
const MOBILE  = { width: 430, height: 880, escala: 2, mobile: true };
const DESKTOP = { width: 1320, height: 830, escala: 1, mobile: false };
const J = JSON.stringify;
const avisos = [];

const ir = async (hash, ms = 1500) => { await p.avaliar(`location.hash=${J(hash)};`); await esperar(ms); };
const clicar = async (sel, ms = 900) => {
  await p.avaliar(`const e=document.querySelector(${J(sel)}); if(!e) throw new Error('nao achei ${sel.replace(/'/g, '')}'); e.click();`);
  await esperar(ms);
};
const clicarTexto = async (sel, re, ms = 900) => {
  await p.avaliar(`const e=[...document.querySelectorAll(${J(sel)})].find(x=>new RegExp(${J(re)}, 'i').test(x.textContent));
    if(!e) throw new Error('nao achei ' + ${J(sel + ' ~ ' + re)}); e.click();`);
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
const limpar = () => p.avaliar(`document.getElementById('aurora-bolha')?.remove();
  document.querySelectorAll('#toasts .toast').forEach(t=>t.remove());`);

async function entrarComo(id) {
  await p.avaliar(`document.querySelector('[data-acao="sair"]')?.click();`);
  await esperarQue(`location.hash==='#/entrar' && document.querySelector('[data-acao="entrar"][data-id="${id}"]')`);
  await esperar(500);
  await clicar(`[data-acao="entrar"][data-id="${id}"]`, 400);
  await esperarQue(`!location.hash.startsWith('#/entrar') && document.querySelector('#app h1')`);
  await esperar(1400);
  await limpar();
}

// O que nao pode ir para uma captura: "Carregando…", toast de erro, tela de erro inesperada.
async function tirar(arquivo, { erroEsperado = false } = {}) {
  const r = await p.avaliar(`
    const t = document.body.innerText;
    return {
      ruim: [...document.querySelectorAll('.toast.ruim')].map(x => x.textContent),
      carregando: !!document.querySelector('.carregando'),
      erroTela: /Não deu para abrir esta tela|Tela não encontrada/.test(t),
      hash: location.hash,
    };`);
  const prob = [];
  if (r.ruim.length) prob.push(`toast de erro: ${r.ruim.join(' | ')}`);
  if (r.carregando) prob.push('tela em "Carregando…"');
  if (r.erroTela && !erroEsperado) prob.push('tela de erro');
  if (prob.length) { avisos.push(`[${arquivo} · ${r.hash}] ${prob.join('; ')}`); console.warn('AVISO', avisos.at(-1)); }
  writeFileSync(join(SAIDA, arquivo), await p.foto());
  console.log(`  ${arquivo}  ${r.hash}`);
}

// ======================================================================
// CELULAR · quem atende
// ======================================================================
await p.viewport(MOBILE);
await p.enviar('Page.navigate', { url: BASE });
await esperar(1500);
await p.avaliar(`await fetch('/api/sair',{method:'POST'}); location.hash='#/entrar';`);
await esperar(1800);

// 01 · tela inicial
await tirar('01-entrar.png');

// 02 · o Hoje da educadora
await clicar('[data-acao="entrar"][data-id="1"]', 400);
await esperarQue(`location.hash.startsWith('#/hoje') && document.querySelector('#app h1')`);
await esperar(1500);
await limpar();
await tirar('02-hoje-educadora.png');

// 03 · fluxo principal, passo 1: a chamada
await clicarTexto('#app [data-acao="ir"]', '^\\s*Retomar por', 1600);
await limpar();
await clicar('[data-acao="todos"]', 500);
await p.avaliar(`document.querySelectorAll('#lista .pf button[data-v="F"]')[2].click();`);
await esperar(600);
await tirar('03-chamada.png');

// 04 · dado salvo: a data sai das pendentes e a proxima abre
await clicar('[data-acao="salvar-chamada"]', 400);
await esperarQue(`location.hash.startsWith('#/hoje') && /Retomar por/.test(document.querySelector('#app').innerText)`);
await esperar(1100);
await limpar();
await tirar('04-chamada-salva.png');

// 05 · fluxo principal, passo 2: a observacao pela rubrica
await ir('#/hoje?detalhe=ciclo', 1800);
await limpar();
await clicarTexto('#app [data-acao="ir"]', 'a fazer', 1800);
await topo();
await tirar('05-observacao.png');

// 06 · a psicologa: o sabado da Vivencia em aberto
await entrarComo(5);
await topo();
await tirar('06-hoje-psicologa.png');

// ======================================================================
// COMPUTADOR · quem gere e quem presta contas
// ======================================================================
await p.viewport(DESKTOP);
await esperar(600);

// 07 · dado salvo e listado: o painel da coordenacao
await entrarComo(2);
await topo(700);
await tirar('07-painel-coordenacao.png');

// 08 · consentimentos: o campo nasce bloqueado
await ir('#/consentimentos', 1800);
await limpar();
await topo();
await tirar('08-consentimentos.png');

// 09 · o relatorio do ciclo, gerado pela diretoria
await entrarComo(4);
await clicar('[data-acao="gerar-relatorio"]', 400);
await esperarQue(`document.querySelector('[data-acao="publicar-relatorio"]')`, 15000, 'rascunho do relatorio');
await esperar(900);
await topo();
await limpar();
await tirar('09-relatorio-do-ciclo.png');

// 10 · quando algo da' errado: a diretoria tenta abrir a ficha de uma crianca
const status = await p.avaliar(`return (await fetch('/api/crianca?id=2')).status;`);
await ir('#/crianca/2', 1800);
await limpar();
await tirar('10-acesso-negado.png', { erroEsperado: status === 403 });
if (status !== 403) avisos.push(`esperava 403 em /api/crianca?id=2 para a diretoria; veio ${status}`);

p.fechar();
chrome.kill();
console.log(avisos.length ? `\n${avisos.length} aviso(s):\n- ${avisos.join('\n- ')}` : '\n10 capturas, nenhum aviso.');
process.exit(avisos.length ? 1 : 0);
