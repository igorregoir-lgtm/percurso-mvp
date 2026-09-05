// Prepara o banco sintetico para a sessao de validacao com a psicologa
// (docs/VALIDACAO-USUARIO.md). Roda DEPOIS de `node scripts/reset.mjs`.
//
// POR QUE ISTO EXISTE. A semente entrega o ultimo encontro da Vivencia ja
// registrado (folha por voz, relato em rascunho) — bom para demonstrar, ruim
// para cronometrar: a tarefa 2 (chamada) e a tarefa 3 (registrar falando)
// pedem o estado PENDENTE, que e' onde a usuaria realmente comeca.
//
// O que faz: apaga o ENCONTRO mais recente da turma da psicologa — e com ele a
// chamada, a folha e o relato daquele dia. O encontro e' apagado inteiro, e nao
// so' as presencas, porque `chamada.registrada` e `chamadasEmAberto` sao
// derivadas da EXISTENCIA da linha de encontro (src/domain.js:213): apagar so'
// as presencas deixaria o dia "registrado" com todo mundo sem status.
// Apagado o encontro, a sequencia da sessao volta a ser a real — a chamada
// recria o encontro (src/domain.js:190), o encontro abre a folha, a folha gera
// o relato. Nada mais e' tocado. Para desfazer, resemeie:
//   node scripts/reset.mjs
//
// --lapso [N]: alem disso, empurra a ultima atividade do educador da turma para
// N dias atras (padrao 9, acima do gatilho de 5 de PARAMS.DIAS_LAPSO) para que
// `#/hoje` abra com a retomada sem culpa. E' o que a Provocacao Longa do
// Protocolo do Lapso pede (METODOLOGIA-VALIDACAO-PERCURSO.md, 5.5) e o que ate
// agora estava escrito la como "ajustar a semente", sem como.
//
// GUARDAS (auditoria OPAR de 03/09/2026). Este script APAGA linhas do banco, e
// tres defeitos reais foram medidos antes de existirem estas guardas:
//   1. `--turma abc` caia SILENCIOSAMENTE na turma padrao (Number('abc') = NaN,
//      falsy no ternario) — quem errasse o argumento destruia a turma errada.
//   2. Rodar duas vezes comia o encontro SEGUINTE: a 2a execucao levou junto uma
//      folha com relato ja liberado. Nao havia idempotencia nem aviso.
//   3. `--lapso 3` imprimia "a tela Hoje abre com a retomada" e nao abria: o
//      gatilho e' PARAMS.DIAS_LAPSO = 5. O facilitador preparava a Provocacao
//      Longa confiando na linha.
// Por isso: todo argumento e' validado ANTES de abrir o banco, o preparo e'
// idempotente por deteccao de estado, e `--dry-run` mostra sem apagar.
//
// Uso: node scripts/preparar-sessao.mjs [--turma N] [--lapso [dias]] [--dry-run] [--forcar]
import { getDb, closeDb, get, all, run, tx } from '../src/db.js';
import { hoje, addDias, diaLetivo, recalcularAlertas, criancasDaTurma,
         chamadasEmAberto, PARAMS } from '../src/domain.js';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const FORCAR = argv.includes('--forcar');

// Validacao ANTES do getDb(): argumento ruim nao pode chegar perto de um DELETE.
const morre = (msg) => { console.error(`preparar-sessao: ${msg}`); process.exit(2); };
const inteiro = (v, rotulo, { min = 0, max = 3650 } = {}) => {
  if (v === undefined || v.startsWith('--')) morre(`${rotulo} exige um número.`);
  if (!/^\d+$/.test(v)) morre(`${rotulo} exige um inteiro; recebi "${v}".`);
  const n = Number(v);
  if (n < min || n > max) morre(`${rotulo} fora da faixa (${min}–${max}); recebi ${n}.`);
  return n;
};

const iTurma = argv.indexOf('--turma');
const TURMA = iTurma < 0 ? null : inteiro(argv[iTurma + 1], '--turma', { min: 1, max: 1e6 });
const iLapso = argv.indexOf('--lapso');
// `--lapso` sozinho = 9 (padrao). `--lapso 0` e' pedido legitimo de "sem lapso"
// e nao pode virar 9, como virava com `Number(x) || 9`.
const LAPSO = iLapso < 0 ? null
  : (argv[iLapso + 1] === undefined || argv[iLapso + 1].startsWith('--')) ? 9
  : inteiro(argv[iLapso + 1], '--lapso');

getDb();

const turma = TURMA != null
  ? get(`SELECT t.*, p.nome AS programa, p.no_escopo, e.nome AS educador
           FROM turma t JOIN programa p ON p.id = t.programa_id
           LEFT JOIN educador e ON e.id = t.educador_id WHERE t.id = ?`, TURMA)
  // Sem --turma: a turma da Vivencia (fora da rubrica) conduzida pelo papel
  // `profissional` — a da psicologa, que e' a participante do protocolo.
  : get(`SELECT t.*, p.nome AS programa, p.no_escopo, e.nome AS educador
           FROM turma t JOIN programa p ON p.id = t.programa_id
           JOIN educador e ON e.id = t.educador_id
          WHERE p.no_escopo = 0 AND e.papel = 'profissional' ORDER BY t.id LIMIT 1`);

if (!turma) { closeDb(); console.error('Turma não encontrada. Rode `node scripts/reset.mjs` antes.'); process.exit(1); }

const enc = get(`SELECT * FROM encontro WHERE turma_id = ? ORDER BY data DESC LIMIT 1`, turma.id);
if (!enc) { closeDb(); console.error(`A turma ${turma.nome} não tem encontro.`); process.exit(1); }

// Idempotencia por deteccao de estado: depois de preparado, a data do encontro
// apagado passa a constar em `chamadasEmAberto`. Se ja ha data em aberto, o
// preparo ja rodou — e rodar de novo comeria o encontro SEGUINTE, com a folha e
// o relato liberado dele.
const abertas = chamadasEmAberto(turma.id);
if (abertas.length && !FORCAR) {
  console.log(`Já preparado: ${turma.nome} tem ${abertas.length} data(s) sem chamada (${abertas.join(', ')}).`);
  console.log('Nada foi apagado. Para começar do zero: node scripts/reset.mjs && node scripts/preparar-sessao.mjs');
  console.log('Para apagar MAIS um encontro mesmo assim: --forcar');
  closeDb(); process.exit(0);
}

if (DRY) {
  console.log(`[dry-run] APAGARIA de ${turma.nome}:`);
  console.log(`  encontro ${enc.data} (id ${enc.id})`);
  console.log(`  presenças: ${get(`SELECT COUNT(*) n FROM presenca WHERE encontro_id = ?`, enc.id).n}`);
  const f = get(`SELECT id, relato_liberado_em FROM folha WHERE encontro_id = ?`, enc.id);
  console.log(`  folha: ${f ? `id ${f.id}${f.relato_liberado_em ? ' — COM RELATO LIBERADO' : ''}` : 'não havia'}`);
  if (LAPSO != null) console.log(`  atividades do educador ${turma.educador_id} posteriores a ${addDias(hoje(), -LAPSO)}`);
  closeDb(); process.exit(0);
}

const folha = get(`SELECT id, relato_liberado_em FROM folha WHERE encontro_id = ?`, enc.id);
const presencas = get(`SELECT COUNT(*) n FROM presenca WHERE encontro_id = ?`, enc.id).n;

tx(() => {
  if (folha) {
    run(`DELETE FROM folha_marcador WHERE folha_id = ?`, folha.id);
    run(`DELETE FROM folha WHERE id = ?`, folha.id);
  }
  run(`DELETE FROM presenca WHERE encontro_id = ?`, enc.id);
  run(`DELETE FROM encontro WHERE id = ?`, enc.id);
});

// Os alertas de falta sao derivados dos encontros e foram calculados pela
// semente COM o encontro que acabou de sair. Sem recalcular, a tela Hoje mostra
// uma contagem que os dados nao sustentam mais — incoerencia que nao e' do
// produto, e' do preparo, bem na tela que a sessao vai medir.
//
// Recalcular sozinho NAO basta. `recalcularAlertas` (src/domain.js:246) reescreve
// o detalhe quando as faltas seguem em 2+ e so' RESOLVE quando caem a ZERO: quem
// estava em 2 faltas e caiu para 1 por causa do encontro apagado nao entra em
// nenhum dos dois ramos e fica com o alerta aberto dizendo "faltou nos 2 ultimos
// encontros". Medido na semente: EBZ-0006 e EBZ-0011 caem para n=1 e ficam assim.
//
// A correcao e' aqui, no preparo, e nao na regra do produto: em operacao normal
// o 2->1 com alerta aberto nao acontece, porque quem comparece ao encontro mais
// recente cai direto para n=0 (ausenciasConsecutivas para no primeiro 'P') e o
// alerta se resolve. O estado so' existe porque apagamos um encontro. Entao
// zeramos os alertas de ausencia EM ABERTO das criancas da turma e deixamos
// recalcularAlertas reconstruir do zero, a partir do dado que sobrou.
const daTurma = criancasDaTurma(turma.id).map(c => c.id);
// `status` e `tratativa` sao trabalho HUMANO ("liguei para a mae"), nao dado
// derivado: apagar e recalcular zerava os dois. Guardamos antes e reaplicamos
// aos alertas que voltarem a existir.
const humano = !daTurma.length ? [] : all(
  `SELECT crianca_id, status, tratativa FROM alerta
    WHERE tipo = 'ausencia' AND status <> 'resolvido'
      AND (tratativa IS NOT NULL OR status <> 'aberto')
      AND crianca_id IN (${daTurma.map(() => '?').join(',')})`, ...daTurma);
let alertas;
tx(() => {
  if (daTurma.length) {
    run(`DELETE FROM alerta WHERE tipo = 'ausencia' AND status <> 'resolvido'
          AND crianca_id IN (${daTurma.map(() => '?').join(',')})`, ...daTurma);
  }
  alertas = recalcularAlertas(turma.id);
  for (const h of humano) {
    run(`UPDATE alerta SET status = ?, tratativa = ?
          WHERE crianca_id = ? AND tipo = 'ausencia' AND status <> 'resolvido'`,
        h.status, h.tratativa, h.crianca_id);
  }
});

const anterior = get(`SELECT data FROM encontro WHERE turma_id = ? ORDER BY data DESC LIMIT 1`, turma.id);

// Provocacao Longa do Protocolo do Lapso: a retomada sem culpa em `#/hoje` le
// a tabela `atividade` (src/domain.js:936), nao os encontros. Empurrar a ultima
// atividade para tras e' o unico jeito de a tela abrir em lapso.
let lapsoData = null, lapsoApagadas = 0;
if (LAPSO != null && !turma.educador_id) {
  console.log('  Lapso NÃO aplicado .. a turma não tem educador responsável.');
} else if (LAPSO != null) {
  // addDias/hoje do dominio: assim o N pedido aqui e' exatamente o N que a
  // tela mostra (`diasEntre`), sem deslocamento de fuso.
  const d = addDias(hoje(), -LAPSO);
  lapsoApagadas = get(`SELECT COUNT(*) n FROM atividade WHERE educador_id = ? AND data > ?`,
                      turma.educador_id, d).n;
  tx(() => {
    run(`DELETE FROM atividade WHERE educador_id = ? AND data > ?`, turma.educador_id, d);
    run(`INSERT INTO atividade (educador_id, data, tipo) VALUES (?,?,?)`, turma.educador_id, d, 'chamada');
  });
  lapsoData = d;
}

const DOW = ['dom','seg','ter','qua','qui','sex','sáb'][new Date(enc.data + 'T12:00:00Z').getUTCDay()];

console.log(`Sessão preparada — ${turma.nome} (${turma.programa}${turma.no_escopo ? '' : ', fora da rubrica'})`);
console.log(`  Responsável ......... ${turma.educador ?? '—'}`);
console.log(`  Encontro zerado ..... ${enc.data} (${DOW})`);
console.log(`  Chamada apagada ..... ${presencas ? `sim (${presencas} presenças)` : 'não havia'}`);
console.log(`  Folha apagada ....... ${folha ? `sim${folha.relato_liberado_em ? ' — o relato liberado foi junto' : ''}` : 'não havia'}`);
console.log(`  Encontro anterior ... ${anterior?.data ?? '—'} (segue registrado — é a base de comparação da devolução)`);
console.log(`  Alertas recalculados  ${alertas.alertasAbertos} em aberto`);
if (lapsoData) {
  const abre = LAPSO >= PARAMS.DIAS_LAPSO;
  console.log(`  Lapso forçado ....... última atividade em ${lapsoData} (${LAPSO} dias)`
            + `${lapsoApagadas ? `, ${lapsoApagadas} atividade(s) posterior(es) apagada(s)` : ''}`);
  console.log(abre
    ? `                        a tela Hoje ABRE com a retomada (gatilho: ${PARAMS.DIAS_LAPSO} dias)`
    : `                        ATENÇÃO: ${LAPSO} < ${PARAMS.DIAS_LAPSO} — a tela Hoje NÃO abre com a retomada.`
      + `\n                        A Provocação Longa precisa de --lapso ${PARAMS.DIAS_LAPSO} ou mais.`);
}

if (!diaLetivo(turma.turno, hoje())) {
  console.log(`\nHoje não é dia de encontro desta turma (turno "${turma.turno}") — e tudo bem.`);
  console.log('  As seis tarefas funcionam assim: a tela Hoje oferece a data em aberto, que é o');
  console.log('  caminho do "nunca é tarde para registrar" da jornada v2.');
  console.log('  (Até 03/09/2026 a tarefa 6 era exceção — o botão do recado sumia em dia não');
  console.log('   letivo. Corrigido em 48ec1dd: ele segue o encontro da folha, como o resto do');
  console.log('   cartão. Se a tarefa 6 falhar agora, é achado de verdade.)');
}

console.log('\nNa tela Hoje a data acima aparece em "Datas ainda sem chamada".');
console.log('A sequência da sessão é a real: chamada (recria o encontro) → registro por voz → relato → recado.');
console.log('A participante entra por "Entrar" e escolhe o perfil da psicóloga.');
console.log('Para desfazer: node scripts/reset.mjs');
console.log('O smoke test NÃO roda sobre um banco preparado: rode `node scripts/reset.mjs` antes de `npm test`.');

closeDb();
