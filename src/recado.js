// Percurso — o recado da turma para os responsáveis (decisão 33).
//
// Campo, 29/08/2026: a devolutiva aos responsáveis já acontece toda semana,
// por WhatsApp, manualmente — vídeo e recado por turma, e o pedido literal foi
// "se você tivesse um mecanismo de enviar isso automaticamente para o pai,
// seria ótimo". O Percurso NÃO fala com a família: gera o texto, quem envia é
// a pessoa, no grupo que já existe. E o texto é DA TURMA: atividade, presença
// em número, como o grupo esteve. Nenhuma criança nomeada — a régua individual
// de presença é para dentro, nunca para o grupo.
import { get } from './db.js';
import { chamada, encontroDe, erro, dataBR, diaLetivo, addDias, hoje, turmaNaRubrica } from './domain.js';
import { folhaDe, rotuloDe, ATIVIDADES, AREAS, MARCADORES, PROCEDIMENTOS, OBJETIVOS } from './voz.js';

const porExtenso = (iso) => new Date(iso + 'T12:00:00Z')
  .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export function proximoEncontro(turno, apos) {
  let d = addDias(apos, 1);
  for (let i = 0; i < 14; i++) { if (diaLetivo(turno, d)) return d; d = addDias(d, 1); }
  return null;
}

export function recadoDaTurma(turmaId, data) {
  const enc = encontroDe(turmaId, data);
  if (!enc) throw erro(404, 'Não há encontro registrado nesta data — faça a chamada antes.');
  const ch = chamada(turmaId, data);
  const folha = folhaDe(enc.id);
  const vivencia = !turmaNaRubrica(turmaId);
  const presentes = ch.criancas.filter(c => c.status === 'P').length;
  const mes = data.slice(0, 7);
  const m = get(
    `SELECT COUNT(*) AS t, SUM(CASE WHEN p.status='P' THEN 1 ELSE 0 END) AS p
       FROM presenca p JOIN encontro e ON e.id = p.encontro_id
      WHERE e.turma_id = ? AND substr(e.data, 1, 7) = ?`, turmaId, mes);
  const pctMes = m.t ? Math.round(((m.p ?? 0) / m.t) * 100) : null;
  const linhas = [`Recado da ${ch.turma.nome} — ${porExtenso(data)}`];
  if (folha) {
    const fez = vivencia
      ? `${rotuloDe(PROCEDIMENTOS, folha.procedimento ?? 'nao_identificado')}${folha.objetivo && folha.objetivo !== 'nenhum' ? ` (objetivo: ${rotuloDe(OBJETIVOS, folha.objetivo).toLowerCase()})` : ''}`
      : `${rotuloDe(ATIVIDADES, folha.atividade)}${folha.area_tematica !== 'nenhuma' ? ` (${rotuloDe(AREAS, folha.area_tematica).toLowerCase()})` : ''}`;
    linhas.push(`Hoje: ${fez}.`);
    if (folha.marcadores.length)
      linhas.push(`O grupo esteve ${folha.marcadores.map(x => rotuloDe(MARCADORES, x).toLowerCase()).join(', ')}.`);
  } else {
    linhas.push('Hoje o encontro aconteceu; o registro da atividade ainda vai ser feito.');
  }
  linhas.push(`Presença de hoje: ${presentes} de ${ch.criancas.length} crianças.`);
  if (pctMes != null) linhas.push(`Presença da turma no mês: ${pctMes}%. A régua do Instituto continua 75%.`);
  const prox = proximoEncontro(ch.turma.turno, data);
  if (prox) linhas.push(`Próximo encontro: ${dataBR(prox)}.`);
  linhas.push('— Instituto Ebenézer');
  const texto = linhas.join('\n');
  return {
    turma: { id: ch.turma.id, nome: ch.turma.nome, turno: ch.turma.turno }, data, texto,
    presentes, total: ch.criancas.length, presenca_mes_pct: pctMes, proximo_encontro: prox,
    // Sem número: abre o WhatsApp para a pessoa escolher o grupo da turma.
    whatsapp_url: 'https://wa.me/?text=' + encodeURIComponent(texto),
    doutrina: 'O recado é da turma — o que já sai hoje para o grupo (atividade e presença em número). Quem envia é você, no grupo que já existe. Nenhuma criança é nomeada; a presença de cada uma é para dentro.',
  };
}
