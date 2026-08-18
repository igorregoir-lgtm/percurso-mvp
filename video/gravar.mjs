// Percurso — captura os quadros do video demonstrativo.
// Pilota um Chrome headless com perfil TEMPORARIO (nao toca no Chrome do usuario,
// nao grava a area de trabalho: os quadros vem da propria aba, via CDP).
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { conectar, esperar } from './cdp.mjs';

const BASE   = process.env.BASE || 'http://localhost:3000';
const SAIDA  = join(import.meta.dirname, 'quadros');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PERFIL = '/tmp/percurso-chrome-video';

rmSync(SAIDA, { recursive: true, force: true });
rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9222', `--user-data-dir=${PERFIL}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none',
  BASE,
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

// Espera a porta de depuracao subir (o Chrome leva alguns segundos no primeiro arranque).
let pronto = false;
for (let i = 0; i < 40 && !pronto; i++) {
  await esperar(500);
  try { await (await fetch('http://127.0.0.1:9222/json/version')).json(); pronto = true; } catch {}
}
if (!pronto) { console.error('Chrome nao abriu a porta 9222.'); process.exit(1); }
await esperar(800);

const p = await conectar(9222);
await p.enviar('Page.enable');
await p.enviar('Runtime.enable');

// ---------------------------------------------------------------- utilidades
let n = 0;
const roteiro = [];
let atual = null;

const cena = (legenda, { modo = 'mobile' } = {}) => {
  atual = { legenda, modo, quadros: [] };
  roteiro.push(atual);
};

async function tirar(qtd = 1, intervalo = 260) {
  for (let i = 0; i < qtd; i++) {
    const arq = `q${String(++n).padStart(4, '0')}.png`;
    writeFileSync(join(SAIDA, arq), await p.foto());
    atual.quadros.push(arq);
    if (i < qtd - 1) await esperar(intervalo);
  }
}

const MOBILE  = { width: 430, height: 880, escala: 2, mobile: true };
const DESKTOP = { width: 1320, height: 830, escala: 1.5, mobile: false };

const ir = async (hash) => { await p.avaliar(`location.hash='${hash}';`); await esperar(700); };
const rolar = (y) => p.avaliar(`window.scrollTo({top:${y},behavior:'smooth'});`);

// ======================================================================
// ROTEIRO
// ======================================================================
await p.viewport(MOBILE);
await p.avaliar(`await fetch('/api/sair',{method:'POST'}); location.hash='#/entrar';`);
await p.enviar('Page.navigate', { url: BASE });
await esperar(1800);

cena('Percurso — MVP funcional  ·  Instituto Ebenézer  ·  Desafio B: Monitoramento de Impacto');
await tirar(1);

cena('Todos os dados são sintéticos. Nenhum dado real de criança foi usado — regra 1 do bloco 6 do dossiê.');
await tirar(1);

cena('A persona: Maria Silvia, pedagoga do reforço. "Não consigo transformar em dados os resultados do meu trabalho."');
await tirar(1);

// ---- 2 · anti-abandono
await p.avaliar(`document.querySelector('[data-acao="entrar"]').click();`);
await esperar(1400);
cena('O produto não morre por rejeição — morre por lapso. Sete dias sem registrar, e nada se perdeu.');
await tirar(2, 400);

cena('Nenhuma data expira. Cinco chamadas em aberto continuam disponíveis, sem cobrança.');
await tirar(1);

await rolar(520); await esperar(900);
cena('Alerta de ausência: duas crianças faltaram nos cinco últimos encontros — agir antes que vire evasão.');
await tirar(2, 400);

// ---- 3 · chamada (F2)
await ir('#/chamada'); await esperar(900);
cena('F2 · Presença em um toque. A educadora registra em pé, dentro da sala.');
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="todos"]').click();`); await esperar(600);
cena('"Todos presentes" resolve a turma inteira; a exceção é que se marca.');
await tirar(1);

await p.avaliar(`document.querySelectorAll('.pf button[data-v="F"]')[2].click();`); await esperar(500);
cena('Uma falta marcada. O botão Salvar só habilita quando as 20 crianças estão marcadas.');
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="salvar-chamada"]').click();`); await esperar(1800);
cena('Ao salvar, o sistema abre sozinho a próxima data pendente. Recuperação encadeada, sem culpa.');
await tirar(2, 500);

// ---- 4 · agenda do ciclo (F4)
await ir('#/ciclo'); await esperar(900);
cena('F4 · Agenda do ciclo: 16 de 18 observadas. A janela vai até 12 de setembro.');
await tirar(1);

await rolar(430); await esperar(900);
cena('Duas crianças bloqueadas — e o motivo aparece escrito. Bloqueio explicado nunca é erro da usuária.');
await tirar(2, 400);

cena('Uma por janela mínima de convívio não cumprida. Outra por falta do consentimento do responsável (LGPD Art. 14).');
await tirar(1);

// ---- 5 · rubrica (F3)
await p.avaliar(`
  const b=[...document.querySelectorAll('[data-acao="ir"]')].find(x=>/a fazer/.test(x.textContent));
  b.click();`);
await esperar(1200);
await rolar(0); await esperar(500);
cena('F3 · A rubrica. Cinco dimensões, cada uma com quatro âncoras de comportamento observável.');
await tirar(1);

await rolar(560); await esperar(900);
cena('"Marque o que você observou neste ciclo — não o que acha que a criança é."');
await tirar(1);

await p.avaliar(`
  document.querySelectorAll('.ancoras').forEach((g,i)=>{
    const m=[...g.querySelectorAll('.ancora')].some(a=>a.getAttribute('aria-pressed')==='true');
    if(!m) g.querySelectorAll('.ancora')[(i%3)+1].click();
  });`);
await esperar(700);
cena('Cerca de três minutos por criança. É o orçamento de tempo que a equipe do Instituto tem.');
await tirar(1);

// ---- 6 · filtro de perimetro
await p.avaliar(`
  const t=document.getElementById('nota');
  t.value='Puxou conversa na roda de leitura. A mãe contou que ele foi diagnosticado com depressão. Terminou a tarefa sozinho.';
  t.scrollIntoView({block:'center'});`);
await esperar(900);
cena('No campo livre, de propósito, uma frase que não pode ser guardada.');
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="salvar-obs"][data-concluir="1"]').click();`);
await esperar(1600);
cena('O filtro de perímetro intercepta antes de gravar. Isola só a frase clínica e nomeia a categoria.');
await tirar(2, 500);

cena('O conteúdo bloqueado não é apagado depois — ele nunca chega ao banco. É o bloco 6 do dossiê em ato.');
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="filtro-ok"]').click();`);
await esperar(1800);
cena('Salvo sem o trecho. O que ela marcou na rubrica foi preservado integralmente.');
await tirar(1);

// ---- 7 · o momento
await p.avaliar(`
  const b=[...document.querySelectorAll('[data-acao="ir"]')].find(x=>/a fazer|começada/.test(x.textContent));
  b.click();`);
await esperar(1300);
await p.avaliar(`
  document.querySelectorAll('.ancoras').forEach((g,i)=>{
    const m=[...g.querySelectorAll('.ancora')].some(a=>a.getAttribute('aria-pressed')==='true');
    if(!m) g.querySelectorAll('.ancora')[(i%2)+2].click();
  });`);
await esperar(600);
cena('A última observação pendente da turma.');
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="salvar-obs"][data-concluir="1"]').click();`);
await esperar(900);
cena('');
await tirar(5, 260);

await esperar(600);
cena('Dezoito de dezoito. O ciclo da turma fechado.');
await tirar(2, 500);

await p.avaliar(`document.querySelector('.festa').scrollTo({top:340,behavior:'smooth'});`);
await esperar(1100);
cena('Cinquenta e quatro minutos no ciclo inteiro viraram cinco dimensões comparáveis entre ciclos.');
await tirar(2, 450);

await p.avaliar(`document.querySelector('.festa').scrollTo({top:900,behavior:'smooth'});`);
await esperar(1100);
cena('As médias da turma, ciclo 1 contra ciclo 2, aparecendo na frente dela.');
await tirar(2, 450);

await p.avaliar(`document.querySelector('.festa').scrollTo({top:1500,behavior:'smooth'});`);
await esperar(1100);
cena('É esta frase — e não o número de presenças — que o Instituto não conseguia dizer a quem financia.');
await tirar(3, 700);

// ---- 8 · coordenacao
await p.viewport(DESKTOP);
await p.avaliar(`
  document.querySelector('.festa')?.remove();
  await fetch('/api/sair',{method:'POST'});
  await fetch('/api/sessao',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({educador_id:2})});
  location.hash='#/painel';`);
// Recarga de verdade: navegar so trocando o fragmento nao reinicia a aplicacao,
// e o cabecalho continuaria mostrando a sessao anterior.
await p.enviar('Page.reload', { ignoreCache: true });
await esperar(2600);
cena('A coordenação. Painel agregado — nenhum dado individual.', { modo: 'desktop' });
await tirar(1);

cena('106 crianças únicas para 120 matrículas: 14 estão em dois programas.', { modo: 'desktop' });
await tirar(1);

cena('É a pergunta 1 do bloco 7 respondida: "120" era matrícula, não criança.', { modo: 'desktop' });
await tirar(1);

await rolar(330); await esperar(1000);
cena('A Vivência terapêutica aparece declarada fora do sistema — o titular do registro é a psicóloga.', { modo: 'desktop' });
await tirar(1);

await ir('#/safras'); await esperar(1100);
cena('F6 · Safras e permanência, saindo da planilha de presença que já existe. Sem coleta nova.', { modo: 'desktop' });
await tirar(1);

cena('Permanência é proxy de vínculo — e está declarada como proxy, não como impacto.', { modo: 'desktop' });
await tirar(1);

await rolar(420); await esperar(1000);
cena('Evasão e tempo médio de permanência por programa.', { modo: 'desktop' });
await tirar(1);

await ir('#/sintese'); await esperar(1100);
cena('F7 · O fecho do ciclo. Os números vêm de consulta ao banco, nunca de geração livre de texto.', { modo: 'desktop' });
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="gerar-sintese"]').click();`);
await esperar(1900);
await rolar(250); await esperar(900);
cena('Texto montado em template fechado.', { modo: 'desktop' });
await tirar(1);

cena('"Revisor de sobre-alegação: aprovado" — verbo causal forte é barrado, e a ressalva é obrigatória.', { modo: 'desktop' });
await tirar(1);

cena('"Aprovação humana: pendente". Nenhum texto sai sem que uma pessoa assine embaixo.', { modo: 'desktop' });
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="aprovar-sintese"]')?.click();`);
await esperar(1800);
cena('Aprovada e liberada — pronta para alimentar o relatório ao financiador.', { modo: 'desktop' });
await tirar(1);

await ir('#/consentimentos'); await esperar(1100);
cena('F1 · Consentimentos. Campo sem consentimento nasce bloqueado — a proteção é regra do sistema.', { modo: 'desktop' });
await tirar(1);

await p.avaliar(`document.querySelector('[data-acao="consentir"]').click();`);
await esperar(900);
cena('Registrar exige nomear quem consentiu. E pode ser revogado — a revogação volta a bloquear.', { modo: 'desktop' });
await tirar(1);

await p.avaliar(`
  document.querySelector('#campo-modal').value='Responsável 2';
  document.querySelector('[data-acao="campo-ok"]').click();`);
await esperar(1800);
cena('Consentimento registrado: a criança sai da lista e o campo é desbloqueado.', { modo: 'desktop' });
await tirar(1);

// ---- 9 · fecho tecnico
await p.avaliar(`
  document.body.innerHTML = \`
   <div style="min-height:100vh;display:grid;place-items:center;padding:60px 40px;background:var(--bg)">
    <div style="max-width:760px;text-align:center">
      <p class="kicker">Fecho técnico</p>
      <h1 style="font-size:40px;margin:14px 0 20px">Sem instalação. Sem build. Sem mensalidade.</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:left;margin-top:26px">
        <div class="cartao"><b style="font-family:var(--serif);font-size:22px">node server.js</b>
          <p class="sub" style="margin-top:6px">Node puro. Nenhuma dependência externa, nenhuma conta em plataforma.</p></div>
        <div class="cartao"><b style="font-family:var(--serif);font-size:22px">data/percurso.db</b>
          <p class="sub" style="margin-top:6px">O banco é um arquivo. Backup é copiar; restaurar é copiar de volta.</p></div>
        <div class="cartao"><b style="font-family:var(--serif);font-size:22px">73 passaram · 0 falharam</b>
          <p class="sub" style="margin-top:6px">Bateria do fluxo principal, reproduzível com um comando.</p></div>
        <div class="cartao"><b style="font-family:var(--serif);font-size:22px">106 crianças · 120 matrículas</b>
          <p class="sub" style="margin-top:6px">Dados 100% sintéticos, gerados com semente fixa.</p></div>
      </div>
      <p style="font-family:var(--serif);font-style:italic;font-size:19px;margin-top:34px;line-height:1.5">
        "A solução precisa sobreviver à semana 10."<br>
        <span style="font-size:14px;font-style:normal;color:var(--muted)">Bloco 5 do dossiê — e é por isso que ela tem esta forma.</span>
      </p>
    </div>
   </div>\`;
  document.getElementById('nav')?.remove();`);
await esperar(900);
cena('A restrição que determinou a arquitetura inteira.', { modo: 'desktop' });
await tirar(1);

writeFileSync(join(SAIDA, 'roteiro.json'), JSON.stringify(roteiro, null, 1));
console.log(`${n} quadros capturados em ${roteiro.length} cenas.`);
p.fechar();
chrome.kill();
process.exit(0);
