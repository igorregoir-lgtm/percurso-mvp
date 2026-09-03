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
// Uso: node scripts/preparar-sessao.mjs [--turma N] [--lapso [dias]]
import { getDb, closeDb, get, all, run, tx } from '../src/db.js';
import { hoje, addDias, diaLetivo, recalcularAlertas, criancasDaTurma } from '../src/domain.js';

const argv = process.argv.slice(2);
const iTurma = argv.indexOf('--turma');
const TURMA = iTurma >= 0 ? Number(argv[iTurma + 1]) : null;
const iLapso = argv.indexOf('--lapso');
const LAPSO = iLapso < 0 ? null : (Number(argv[iLapso + 1]) || 9);

getDb();

const turma = TURMA
  ? get(`SELECT t.*, p.nome AS programa, p.no_escopo, e.nome AS educador
           FROM turma t JOIN programa p ON p.id = t.programa_id
           LEFT JOIN educador e ON e.id = t.educador_id WHERE t.id = ?`, TURMA)
  // Sem --turma: a turma da Vivencia (fora da rubrica) conduzida pelo papel
  // `profissional` — a da psicologa, que e' a participante do protocolo.
  : get(`SELECT t.*, p.nome AS programa, p.no_escopo, e.nome AS educador
           FROM turma t JOIN programa p ON p.id = t.programa_id
           JOIN educador e ON e.id = t.educador_id
          WHERE p.no_escopo = 0 AND e.papel = 'profissional' ORDER BY t.id LIMIT 1`);

if (!turma) { console.error('Turma não encontrada. Rode `node scripts/reset.mjs` antes.'); process.exit(1); }

const enc = get(`SELECT * FROM encontro WHERE turma_id = ? ORDER BY data DESC LIMIT 1`, turma.id);
if (!enc) { console.error(`A turma ${turma.nome} não tem encontro.`); process.exit(1); }

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
if (daTurma.length) {
  run(`DELETE FROM alerta WHERE tipo = 'ausencia' AND status <> 'resolvido'
        AND crianca_id IN (${daTurma.map(() => '?').join(',')})`, ...daTurma);
}
const alertas = recalcularAlertas(turma.id);

const anterior = get(`SELECT data FROM encontro WHERE turma_id = ? ORDER BY data DESC LIMIT 1`, turma.id);

// Provocacao Longa do Protocolo do Lapso: a retomada sem culpa em `#/hoje` le
// a tabela `atividade` (src/domain.js:936), nao os encontros. Empurrar a ultima
// atividade para tras e' o unico jeito de a tela abrir em lapso.
let lapsoData = null;
if (LAPSO != null && turma.educador_id) {
  // addDias/hoje do dominio: assim o N pedido aqui e' exatamente o N que a
  // tela mostra (`diasEntre`), sem deslocamento de fuso.
  const d = addDias(hoje(), -LAPSO);
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
if (lapsoData) console.log(`  Lapso forçado ....... última atividade em ${lapsoData} (${LAPSO} dias) — a tela Hoje abre com a retomada`);

if (!diaLetivo(turma.turno, hoje())) {
  console.log(`\nAVISO — hoje não é dia de encontro desta turma (turno "${turma.turno}").`);
  console.log('  As tarefas 1 a 6 funcionam: a tela Hoje oferece a data em aberto, e o botão');
  console.log('  do recado aponta para o último encontro registrado (data_folha), não para');
  console.log('  a "chamada de hoje". Preferir o dia de encontro da turma quando der —');
  console.log('  a chamada recria o encontro e a sequência fica a real do sábado.');
}

console.log('\nNa tela Hoje a data acima aparece em "Datas ainda sem chamada".');
console.log('A sequência da sessão é a real: chamada (recria o encontro) → registro por voz → relato → recado.');
console.log('A participante entra por "Entrar" e escolhe o perfil da psicóloga.');
console.log('Para desfazer: node scripts/reset.mjs');

closeDb();
