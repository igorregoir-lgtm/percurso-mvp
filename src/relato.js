// Percurso — o relato do procedimento (decisão 31).
//
// Campo, 29/08/2026: o único registro escrito que existe no Instituto é o
// relatório que a psicóloga escreve no padrão do conselho profissional —
// "você registra o procedimento que você faz durante a atividade", "de forma
// não individualizada", "o conselho não permite que você cite nome". Este
// módulo produz esse texto A PARTIR dos campos fechados da folha: não há
// campo livre, logo não há nome possível. É template determinístico; a IA,
// quando ligada, não escreve aqui.
//
// O texto nasce RASCUNHO e só vale depois do OK da profissional ("ele só vai
// liberar o relatório se você der ok"). Editar a folha depois disso derruba a
// liberação (src/voz.js), porque o texto aprovado deixou de ser o do banco.
//
// PROVISÓRIO: o modelo de relatório que a profissional usa foi prometido na
// visita e ainda não chegou (PENDENCIAS-DE-ENTREGA). Quando chegar, é este
// template que muda — os campos já estão fechados.
import { all, get, run, tx } from './db.js';
import { agora, dataBR, erro, encontroDe, chamada, marcarAtividade, turmaNaRubrica, PAPEIS_COM_TURMA, rotuloDoPapel } from './domain.js';
import { folhaDe, rotuloDe, PROCEDIMENTOS, OBJETIVOS, ATIVIDADES, AREAS, MARCADORES, CHECKIN } from './voz.js';

export const VERSAO_TEMPLATE = 'relato-v1 (provisório — até o modelo do conselho chegar)';

const diaSemana = (iso) => new Date(iso + 'T12:00:00Z')
  .toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });

/** O texto do relato para o encontro de uma turma numa data. Sem nome de criança por construção. */
export function relatoDoProcedimento(turmaId, data) {
  const enc = encontroDe(turmaId, data);
  if (!enc) throw erro(404, 'Não há encontro registrado nesta data — faça a chamada antes.');
  const folha = folhaDe(enc.id);
  if (!folha) throw erro(404, 'Não há folha para este encontro — conte como foi antes de gerar o relato.');
  const turma = get(`SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id = t.programa_id WHERE t.id = ?`, turmaId);
  const resp = get(`SELECT nome, apelido, papel FROM educador WHERE id = ?`, folha.confirmado_por);
  const vivencia = !turmaNaRubrica(turmaId);
  const ch = chamada(turmaId, data);
  const presentes = ch.criancas.filter(c => c.status === 'P').length;
  const ck = folha.checkin;
  const tem = (v) => v != null;

  const cabecalho = vivencia ? 'REGISTRO DE PROCEDIMENTO — VIVÊNCIA TERAPÊUTICA' : 'REGISTRO DO ENCONTRO — FOLHA DA TURMA';
  const linhas = [
    cabecalho,
    `Data: ${dataBR(data)} (${diaSemana(data)}) · Turma: ${turma.nome} · Programa: ${turma.programa}`,
    `Responsável pelo registro: ${resp?.apelido ?? '—'} (${rotuloDoPapel(resp?.papel)})`,
    `Presentes: ${presentes} de ${ch.criancas.length}.`,
    '',
  ];
  let n = 1;
  if (vivencia) {
    linhas.push(`${n++}. Procedimento realizado: ${rotuloDe(PROCEDIMENTOS, folha.procedimento ?? 'nao_identificado')}.`);
    linhas.push(`${n++}. Objetivo: ${rotuloDe(OBJETIVOS, folha.objetivo ?? 'nenhum')}.`);
  } else {
    linhas.push(`${n++}. Atividade: ${rotuloDe(ATIVIDADES, folha.atividade)}${folha.area_tematica !== 'nenhuma' ? ` · área: ${rotuloDe(AREAS, folha.area_tematica)}` : ''}.`);
  }
  const grupo = folha.marcadores.length
    ? `O grupo esteve ${folha.marcadores.map(m => rotuloDe(MARCADORES, m).toLowerCase()).join(', ')}.`
    : 'Sem marcadores de grupo registrados.';
  const contagens = CHECKIN.filter(c => tem(ck[c.campo])).map(c => `${c.rotulo}: ${ck[c.campo]}`);
  linhas.push(`${n++}. Desenvolvimento (observação de grupo): ${grupo}`
    + (contagens.length ? ` ${contagens.join('. ')}.` : '')
    + (folha.pediram_ajuda ? ` Pediram ajuda: ${folha.pediram_ajuda}.` : ''));
  linhas.push(`${n++}. Encaminhamentos: ${folha.conteudo_excluido
    ? 'houve conteúdo fora do perímetro deste registro; foi encaminhado ao caminho humano (coordenação e, quando o caso, atendimento), sem transcrição.'
    : 'nenhum registrado neste instrumento.'}`);
  linhas.push(`${n++}. Nota de sigilo: registro não individualizado, sem identificação de criança, conforme norma do conselho profissional. O conteúdo de atendimento individual não é registrado neste sistema.`);
  linhas.push('');
  linhas.push(folha.relato_liberado
    ? `Liberado por ${get(`SELECT apelido FROM educador WHERE id = ?`, folha.relato_liberado_por)?.apelido ?? '—'} em ${dataBR(folha.relato_liberado_em)}.`
    : 'RASCUNHO — aguardando revisão e liberação da profissional responsável.');
  linhas.push(`Modelo: ${VERSAO_TEMPLATE}.`);
  return {
    texto: linhas.join('\n'),
    vivencia, turma: { id: turma.id, nome: turma.nome, programa: turma.programa }, data,
    folha_status: folha.status,
    liberado: folha.relato_liberado,
    liberado_por: folha.relato_liberado_por, liberado_em: folha.relato_liberado_em,
    versao_template: VERSAO_TEMPLATE,
  };
}

/**
 * O OK da profissional. Só quem responde pela turma (papel com turma) ou a
 * coordenação; a folha fecha junto — o texto liberado é o texto final.
 */
export function liberarRelato(turmaId, data, usuarioId) {
  const u = get(`SELECT * FROM educador WHERE id = ?`, usuarioId);
  if (!u) throw erro(404, 'Usuário não encontrado.');
  const turma = get(`SELECT * FROM turma WHERE id = ?`, turmaId);
  if (!turma) throw erro(404, 'Turma não encontrada.');
  const responde = PAPEIS_COM_TURMA.has(u.papel) && turma.educador_id === u.id;
  if (!responde && u.papel !== 'coordenacao')
    throw erro(403, 'Só quem responde pela turma (ou a coordenação) libera o relato.');
  const enc = encontroDe(turmaId, data);
  if (!enc) throw erro(404, 'Não há encontro registrado nesta data.');
  const folha = folhaDe(enc.id);
  if (!folha) throw erro(404, 'Não há folha para este encontro.');
  if (!turmaNaRubrica(turmaId) && (!folha.procedimento || folha.procedimento === 'nao_identificado'))
    throw erro(422, 'O relato da vivência precisa do procedimento — volte à folha e escolha.');
  if (folha.relato_liberado) throw erro(409, 'Este relato já foi liberado.');
  return tx(() => {
    run(`UPDATE folha SET relato_liberado_por = ?, relato_liberado_em = ?, status = 'fechada' WHERE id = ?`,
        u.id, agora(), folha.id);
    marcarAtividade(u.id, 'relato');
    return relatoDoProcedimento(turmaId, data);
  });
}

/** Histórico de relatos liberados da turma — para a coordenação e a profissional. */
export function relatosDaTurma(turmaId, limite = 12) {
  return all(
    `SELECT e.data, f.procedimento, f.objetivo, f.relato_liberado_em, ed.apelido AS liberado_por
       FROM folha f JOIN encontro e ON e.id = f.encontro_id
       LEFT JOIN educador ed ON ed.id = f.relato_liberado_por
      WHERE e.turma_id = ? AND f.relato_liberado_em IS NOT NULL
      ORDER BY e.data DESC LIMIT ?`, turmaId, limite)
    .map(r => ({ ...r, procedimento_rotulo: rotuloDe(PROCEDIMENTOS, r.procedimento ?? 'nao_identificado') }));
}
