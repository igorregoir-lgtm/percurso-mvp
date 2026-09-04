// Percurso — o campo livre de relato (decisao 40).
//
// O QUE ISTO REVERTE, e a reversao precisa ser explicita: a decisao 15 tirou o
// campo livre da observacao ("um filtro e' mitigacao, nao ausencia de risco") e
// a decisao 31 disse que "nao ha campo livre em nenhuma tela nova". O que mudou
// nao foi a analise de risco — foi o PEDIDO vir da propria usuaria, em campo,
// com um caso concreto (Grav. 84, 12:00):
//
//   "existem coisas muito especificas que acontecem dentro do grupo que aqui eu
//    nao conseguiria relatar e la' eu conseguiria."
//
// E os tres pre-requisitos ficarem pagos: HTTPS (dec. 35), log de acesso
// (dec. 38) e autenticacao (dec. 39). O plano poe a F7 depois das tres, e nao
// antes.
//
// DOIS CAMPOS, NAO UM. Base legal, retencao e leitores diferentes:
//   - relato do GRUPO  -> na folha. Legitimo interesse, 5 anos, equipe do
//     programa. NAO PODE conter nome de crianca: e' registro de turma.
//   - relato da CRIANCA -> tabela propria. Consentimento especifico, descarte
//     ao fim do ciclo, so' quem convive com ela. Aqui o nome nao e' risco — a
//     crianca ja' e' o assunto; o risco e' conteudo clinico.
import { get, all, run } from './db.js';
import { erro, agora, filtrarPerimetro, criancasDaTurma, consentimentoDe } from './domain.js';

export const TETO = 2000;

/** O texto NUNCA passa por modelo e NUNCA sai em agregado — as duas garantias
 *  sao por construcao (nenhuma funcao de sintese, relatorio, planilha, recado
 *  ou SROI le' estas tabelas) e tem gate proprio no unit-test. */
function limpar(texto) {
  const t = String(texto ?? '').trim();
  if (!t) throw erro(422, 'Escreva alguma coisa, ou deixe em branco.');
  if (t.length > TETO) throw erro(422, `O relato passa de ${TETO} caracteres. Guarde o essencial — o resto é conversa com a coordenação.`);
  return t;
}

/**
 * Relato sobre O GRUPO.
 *
 * DUAS TRAVAS, e a segunda diverge do plano de propósito.
 *
 * 1. NOME DE CRIANCA e' bloqueado. Numa folha de turma, nomear uma crianca e'
 *    individualizar um registro que existe justamente para nao individualizar —
 *    e ele fica cinco anos, lido por toda a equipe do programa. A mensagem
 *    oferece as duas saidas certas: as iniciais, ou a ficha dela.
 *
 * 2. O PERIMETRO CONTINUA BLOQUEANDO, e nao so' avisando. O plano dizia "avisa
 *    sem bloquear nas outras categorias"; nao adotei, e a razao e' esta: as
 *    categorias que o perimetro barra sao clinicas e protetivas (saude mental,
 *    diagnostico, violencia), e deixa-las passar transformaria a folha da turma
 *    num prontuario com retencao de cinco anos. O encaminhamento humano nao e'
 *    um obstaculo a remover — e' a decisao 5, validada em campo. Um aviso que a
 *    pessoa pode ignorar, sobre conteudo dessa natureza, e' uma porta aberta com
 *    um bilhete pedindo para nao entrar.
 */
export function salvarRelatoGrupo({ folhaId, turmaId, texto }) {
  const t = limpar(texto);
  const nomes = criancasDaTurma(turmaId).map(c => c.nome);

  const citados = nomesCitados(t, nomes);
  if (citados.length)
    throw erro(422, `Este relato é da turma e cita ${citados.length === 1 ? 'uma criança' : 'crianças'} pelo nome (${citados.join(', ')}). Use as iniciais — ou registre na ficha dela, que é o lugar do relato individual.`,
               { motivo: 'nome_no_relato_de_grupo', nomes: citados });

  const p = filtrarPerimetro(t, nomes);
  if (p.bloqueado)
    throw erro(422, 'Tem algo aqui que não entra no sistema. Fale com a coordenação — esse caminho é fora daqui.',
               { motivo: 'perimetro', trechos: p.trechos });

  run(`UPDATE folha SET relato_grupo = ? WHERE id = ?`, t, folhaId);
  return { ok: true };
}

/** Nome de crianca no texto, com FRONTEIRA DE PALAVRA — o mesmo cuidado das
 *  faltas por voz, onde "Ana" casava dentro de "semana". */
export function nomesCitados(texto, nomes) {
  const limpo = String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const achados = [];
  for (const nome of nomes) {
    const primeiro = nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (primeiro.length < 3) continue;
    const re = new RegExp(`(?:^|[^a-z0-9])${primeiro.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`);
    if (re.test(limpo)) achados.push(nome.split(' ')[0]);
  }
  return achados;
}

export function relatoGrupoDe(folhaId) {
  return get(`SELECT relato_grupo FROM folha WHERE id = ?`, folhaId)?.relato_grupo ?? null;
}

/**
 * Relato sobre A CRIANCA. Exige o consentimento especifico do responsavel — o
 * mesmo campo de governanca que a v1 ja' declarava (`campo_livre`) e que ficou
 * de pe' mesmo depois de a decisao 15 tirar o campo da tela.
 */
export function salvarRelatoCrianca({ criancaId, educadorId, cicloId = null, texto }) {
  const t = limpar(texto);
  const cons = consentimentoDe(criancaId, 'campo_livre');
  if (cons.status !== 'ativo')
    throw erro(403, 'O relato sobre a criança depende do consentimento específico do responsável, que está ' + cons.status + '.',
               { motivo: 'sem_consentimento', campo: 'campo_livre' });
  // O perimetro vale aqui tambem. O NOME nao e' problema — a crianca e' o
  // assunto do registro —, mas conteudo clinico continua fora: o sigilo
  // profissional da psicologa nao vira campo de banco de dados por ela ter
  // ganhado um lugar para escrever (decisao 5, decisao 31).
  const p = filtrarPerimetro(t, []);
  if (p.bloqueado)
    throw erro(422, 'Tem algo aqui que não entra no sistema — é conteúdo de atendimento, e o sigilo é seu. O caminho é a coordenação.',
               { motivo: 'perimetro', trechos: p.trechos });
  run(`INSERT INTO relato_crianca (crianca_id, educador_id, ciclo_id, texto, criado_em) VALUES (?,?,?,?,?)`,
      criancaId, educadorId, cicloId, t, agora());
  return { ok: true };
}

export function relatosDaCrianca(criancaId, limite = 20) {
  return all(
    `SELECT r.id, r.texto, r.criado_em, e.nome AS quem
       FROM relato_crianca r JOIN educador e ON e.id = r.educador_id
      WHERE r.crianca_id = ? ORDER BY r.criado_em DESC LIMIT ?`, criancaId, limite);
}

export function apagarRelatoCrianca(id, educadorId) {
  const r = get(`SELECT * FROM relato_crianca WHERE id = ?`, id);
  if (!r) throw erro(404, 'Relato não encontrado.');
  // Quem escreveu apaga o proprio. Nao ha edicao: um relato editado depois de
  // lido nao e' o mesmo relato, e o rastro de leitura ficaria mentindo.
  if (r.educador_id !== educadorId) throw erro(403, 'Só quem escreveu apaga o próprio relato.');
  run(`DELETE FROM relato_crianca WHERE id = ?`, id);
  return { ok: true };
}

/** Descarte ao fim do ciclo — a retencao que a governanca declara desde a v1. */
export function descartarRelatosDoCiclo(cicloId) {
  const n = all(`SELECT id FROM relato_crianca WHERE ciclo_id = ?`, cicloId).length;
  run(`DELETE FROM relato_crianca WHERE ciclo_id = ?`, cicloId);
  return { apagados: n };
}
