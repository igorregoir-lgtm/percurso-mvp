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
import { erro, agora, filtrarPerimetro, criancasDaTurma, consentimentoDe, listarCriancas, hoje, dataBR, PARAMS } from './domain.js';
import { anonimizarTexto } from './rag/anonimizar.js';

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
  // NOME SAI POR CODIGO (protótipo v3): *"nome de criança continua barrado aqui
  // — o que você escrever sai por código"*. Eu tinha gravado o texto cru,
  // argumentando que a criança e' o assunto do registro. O desenho esta' certo e
  // eu estava errado: o assunto e' ELA, mas o registro pode citar OUTRAS — a
  // colega com quem brigou, o irmao que buscou. Essas nao consentiram nada, e
  // apareceriam nominalmente numa ficha que nao e' delas.
  //
  // Anonimiza com o mesmo mecanismo da voz: nome vira "Criança A". O nome da
  // PROPRIA crianca tambem vira codigo — a ficha ja' diz de quem e'.
  const roster = listarCriancas({ educadorId, limite: 400 }).criancas.map(c => c.nome);
  const anon = anonimizarTexto(t, roster);
  run(`INSERT INTO relato_crianca (crianca_id, educador_id, ciclo_id, texto, criado_em) VALUES (?,?,?,?,?)`,
      criancaId, educadorId, cicloId, anon.texto, agora());
  return { ok: true, nomes_substituidos: anon.substituicoes };
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

/**
 * Descarte POR DECISAO da casa, nao automatico — e SO' do que venceu.
 *
 * A retencao declarada e' "enquanto a matricula estiver ativa + N anos"
 * (governanca `campo_livre`). A versao anterior desta funcao apagava por
 * CICLO, nao tinha chamador nenhum, e o proprio comentario dizia que o fecho
 * de ciclo nao a chamava "porque a retencao seria outra": era retencao de
 * aparencia (OPAR 05/09/2026).
 *
 * Agora ela apaga por CRIANCA, e RECUSA se a retencao ainda nao venceu — o
 * servidor confere a matricula e o relogio; a tela nao decide isso. O fecho de
 * ciclo detecta e lista; quem apaga e' a coordenacao, com motivo e log.
 */
export function descartarRelatosVencidos(criancaId, { motivo, porUsuarioId }) {
  const c = get(`SELECT id, nome FROM crianca WHERE id = ?`, criancaId);
  if (!c) throw erro(404, 'Criança não encontrada.');
  if (String(motivo ?? '').trim().replace(/[^\p{L}\p{N}]/gu, '').length < 6)
    throw erro(422, 'Descartar relato exige o motivo por extenso — ele fica no log com o seu nome.');
  if (get(`SELECT 1 x FROM matricula WHERE crianca_id = ? AND status = 'ativa'`, criancaId))
    throw erro(422, `${c.nome} ainda tem matrícula ativa: a retenção do relato não venceu.`);
  const venc = get(
    `SELECT date(MAX(saida), '+${PARAMS.ANOS_RETENCAO_RELATO} years') AS expira_em
       FROM matricula WHERE crianca_id = ?`, criancaId);
  if (!venc?.expira_em || venc.expira_em > hoje())
    throw erro(422, `A retenção dos relatos de ${c.nome} só vence em ${venc?.expira_em ? dataBR(venc.expira_em) : 'data indefinida'}.`);
  const n = all(`SELECT id FROM relato_crianca WHERE crianca_id = ?`, criancaId).length;
  run(`DELETE FROM relato_crianca WHERE crianca_id = ?`, criancaId);
  return { crianca_id: criancaId, apagados: n, por: porUsuarioId, motivo: String(motivo).trim(), expirou_em: venc.expira_em };
}
