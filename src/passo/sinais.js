// Percurso — o ENVELOPE do Passo: o único ponto em que o assistente toca o domínio.
//
// DOUTRINA 5′ (substitui a 5 antiga, que dizia "o Passo não enxerga dado nenhum"
// e virou mentira no instante em que a sugestão passou a nascer de estado real —
// e limite declarado que virou mentira é pior do que a mudança):
//
//   Dois canais, duas permissões.
//   · CONVERSA (assistente()) continua CEGA: nada do banco entra no prompt de
//     uma resposta a pergunta.
//   · SUGESTÃO (painel do Passo) enxerga um ENVELOPE de CONTADORES do próprio dia
//     da pessoa — quantos, quantas datas, quantos dias — e nada mais.
//     Nunca um nome de criança. Nunca um nome de TURMA (turma.educador_id é 1:1:
//     "a turma Girassol está sem registro" É "a educadora X não registrou").
//     Nunca uma ficha, nunca um nível de rubrica, nunca um escore individual.
//
// A fronteira não é convenção: `congelar()` roda em PRODUÇÃO e recusa qualquer
// valor fora do contrato — só número, booleano, null ou token de enum fechado.
//
// CUSTO: o envelope é montado no caminho de abertura do painel. As leituras caras
// são declaradas e limitadas por tela (ver `caro()` abaixo). `riscoEvasao` e
// `numerosDoPeriodo` NUNCA entram — as telas que precisam deles já os pagam.
import { all, get } from '../db.js';
import * as D from '../domain.js';
import * as S from '../scores.js';
import * as R from '../relatorio.js';
import { AREAS } from '../voz.js';

// --------------------------------------------------------------------------
// A guarda. Roda sempre, não só em teste.
// --------------------------------------------------------------------------
const ESTADOS = [
  'inexistente', 'rascunho', 'rascunho_aprovado', 'rascunho_reprovado', 'aprovada',
  'publicado', 'sem_relatorio', 'aprovado', 'reprovado', 'nenhum',
];
// Mira IDENTIDADE, não contagem. O plano trazia /crianca|nome|.../ e isso barra
// `exposicao_criancas` — que é exatamente o tipo de valor que o envelope existe
// para carregar (um número de crianças, sem dizer quais). A regra correta é por
// SEGMENTO: `crianca_id` e `turma_nome` caem; `exposicao_criancas` passa.
// `turma` não entra na lista: `turma_nome` já cai por `nome` e `turma_id` por
// `_id$`, enquanto `tem_turma` e `turmas_sem_registro` são justamente o que o
// envelope carrega. Bloquear o substantivo inteiro barraria a contagem junto.
const CHAVE_PROIBIDA = /(^|_)(nome|codigo|apelido|aluno|crianca)(_|$)|_id$/i;

let TOKENS_OK = null;
const tokensOk = () => (TOKENS_OK ??= new Set([
  ...AREAS.map(a => a.codigo ?? a),
  'educador', 'profissional', 'coordenacao', 'diretoria',
  ...ESTADOS, '',
]));

/** Recusa qualquer valor fora do contrato. É a doutrina 5′ em código executável. */
export function congelar(env) {
  for (const [k, v] of Object.entries(env)) {
    if (CHAVE_PROIBIDA.test(k)) throw new Error(`envelope: chave proibida "${k}"`);
    if (v === null || typeof v === 'number' || typeof v === 'boolean') continue;
    if (typeof v === 'string' && (tokensOk().has(v) || v.startsWith('#/'))) continue;
    throw new Error(`envelope: valor fora do contrato em "${k}" (${typeof v})`);
  }
  return Object.freeze(env);
}

/** Envelope de gatilho todo apagado: o painel cai no fallback estático. */
export const ENVELOPE_VAZIO = Object.freeze({ papel: '', tela: '', vazio: true });

// Contador de falha, em RAM, exposto na autocrítica. Nunca vira 5xx na rota.
let falhas = 0;
export const falhasDoEnvelope = () => falhas;

// --------------------------------------------------------------------------
// Memo curto por (educador, tela, dia). O painel é aberto e reaberto no mesmo
// minuto; recomputar o envelope a cada toque paga SELECT por criança à toa.
// Invalidado explicitamente por api.js em todo POST que muda estado.
// --------------------------------------------------------------------------
const memo = new Map();
const MEMO_MS = 30_000;
export function invalidarSinais(educadorId = null) {
  if (educadorId == null) { memo.clear(); return; }
  for (const k of [...memo.keys()]) if (k.startsWith(`${educadorId}:`)) memo.delete(k);
}

// --------------------------------------------------------------------------
// As sete leituras novas. Nenhum DDL no banco principal.
// --------------------------------------------------------------------------
const folhasAbertas = () =>
  get(`SELECT COUNT(*) AS n FROM folha WHERE status = 'aberta'`).n;

const cicloVencido = (ref) =>
  get(`SELECT id, fim FROM ciclo WHERE status = 'aberto' AND fim < ?`, ref) ?? null;

// `alerta.criado_em` vem de agora() (ISO com hora) — substr, não date().
const alertasParados = (limite) =>
  get(`SELECT COUNT(*) AS n FROM alerta
        WHERE status = 'aberto' AND (tratativa IS NULL OR tratativa = '')
          AND substr(criado_em, 1, 10) <= ?`, limite).n;

const ultimaPublicacao = () =>
  get(`SELECT MAX(substr(publicado_em, 1, 10)) AS d FROM relatorio WHERE status = 'publicado'`)?.d ?? null;

// O campo é 'rubrica_socioemocional' (seed.js:55) — o mesmo que elegibilidade()
// usa. NÃO existe campo 'observacao' em governanca_campo: com ele o NOT EXISTS
// devolveria TODA matrícula ativa e um número falso ficaria fixado no painel.
const consentimentoTrava = () =>
  get(`SELECT COUNT(DISTINCT m.crianca_id) AS n
         FROM matricula m JOIN programa p ON p.id = m.programa_id AND p.no_escopo = 1
        WHERE m.status = 'ativa'
          AND NOT EXISTS (SELECT 1 FROM consentimento k
                           WHERE k.crianca_id = m.crianca_id
                             AND k.campo = 'rubrica_socioemocional' AND k.status = 'ativo')`).n;

const encontrosSemFolha = (turmaId, de, ate) =>
  get(`SELECT COUNT(*) AS n FROM encontro e
        WHERE e.turma_id = ? AND e.data BETWEEN ? AND ?
          AND NOT EXISTS (SELECT 1 FROM folha f WHERE f.encontro_id = e.id)`, turmaId, de, ate).n;

const perimetroNaUltimaFolha = (turmaId) =>
  !!get(`SELECT f.conteudo_excluido AS x FROM folha f JOIN encontro e ON e.id = f.encontro_id
          WHERE e.turma_id = ? ORDER BY e.data DESC LIMIT 1`, turmaId)?.x;

// --------------------------------------------------------------------------
// Envelopes por papel.
// --------------------------------------------------------------------------
// `estadoDoRegistro` faz um SELECT por criança × até 20 encontros, mas o laço
// para no primeiro registro encontrado: medido em 0,10 ms por turma nos dados do
// instituto. Fica atrás de um gate mesmo assim — por porte maior, não por hoje —
// e as três telas listadas são onde o radar do registro É a informação que a
// tela não dá. Sem `#/hoje` aqui, `edu.radar_do_registro` nunca disparava lá,
// apesar de estar declarado para essa tela.
const caro = (tela) => tela === '#/chamada' || tela === '#/turma' || tela === '#/hoje';
// A profissional (psicóloga) tem o mesmo envelope da educadora — a diferença é
// que a turma dela não entra na rubrica (decisão 31), e isso aparece nos zeros.
const papelDe = (u) => (u.papel === 'profissional' ? 'profissional' : 'educador');

function doEducador(u, tela, ref) {
  const turmas = all(`SELECT id, turno FROM turma WHERE educador_id = ? ORDER BY id`, u.id);
  const turma = turmas[0] ?? null;
  const ret = D.estadoDeRetomada(u.id);
  if (!turma) {
    return {
      papel: papelDe(u), tela, tem_turma: false, dia_letivo: false,
      em_lapso: !!ret.em_lapso, registrou_hoje: !!ret.registrou_hoje,
      chamada_pendente: false, datas_abertas: 0, folha_pendente: false, folha_aberta: false,
      folhas_atrasadas: 0, perimetro_na_ultima_folha: false,
      ciclo_pendentes: 0, ciclo_dias_restantes: 0, ciclo_vencido: false, ciclo_rascunhos: 0,
      bloq_consentimento: 0, bloq_convivio: 0, alertas_turma: 0, sem_registro_3mais: 0,
      exposicao_area: '', exposicao_criancas: 0, pauta_indecisa: false, tranquila: false,
      folhas_por_voz: 0, folhas_total: 0,
    };
  }

  const ciclo = D.cicloAberto();
  // Turma fora da rubrica (Vivência, decisão 31): sem agenda — os contadores do
  // ciclo ficam em zero e nenhuma sugestão de "faltam N olhares" acende.
  const agenda = ciclo && D.turmaNaRubrica(turma.id) ? D.agendaDoCiclo(turma.id, ciclo.id) : null;
  const dataFolha = D.dataDaFolha(turma.id, ref);
  const folha = dataFolha
    ? get(`SELECT f.status FROM folha f JOIN encontro e ON e.id = f.encontro_id
            WHERE e.turma_id = ? AND e.data = ?`, turma.id, dataFolha)
    : null;
  const cham = D.chamada(turma.id, ref);
  const pauta = S.pautaDaSemana(turma.id, ref);
  const exp = S.exposicao({ turmaId: turma.id, ref });
  const totais = get(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN f.origem='voz' THEN 1 ELSE 0 END) AS voz
       FROM folha f JOIN encontro e ON e.id = f.encontro_id WHERE e.turma_id = ?`, turma.id);

  // Escopo SEMPRE: D.alertas(status, educadorId) só filtra quando recebe o id.
  const alertasTurma = D.alertas(null, u.id).length;

  const lac = exp.maior_lacuna ?? null;
  const areaToken = lac && tokensOk().has(lac.area) ? lac.area : '';

  return congelar({
    papel: papelDe(u), tela, tem_turma: true,
    dia_letivo: !!D.diaLetivo(turma.turno, ref),
    em_lapso: !!ret.em_lapso, registrou_hoje: !!ret.registrou_hoje,
    chamada_pendente: !cham?.registrada,
    datas_abertas: D.chamadasEmAberto(turma.id).length,
    folha_pendente: !folha,
    folha_aberta: folha?.status === 'aberta',
    folhas_atrasadas: encontrosSemFolha(turma.id, D.addDias(ref, -30), D.addDias(ref, -1)),
    perimetro_na_ultima_folha: perimetroNaUltimaFolha(turma.id),
    ciclo_pendentes: agenda ? (agenda.observaveis - agenda.concluidas) : 0,
    ciclo_dias_restantes: ciclo ? Math.max(0, D.diasEntre(ref, ciclo.fim)) : 0,
    ciclo_vencido: !!(ciclo && ciclo.fim < ref),
    ciclo_rascunhos: agenda ? agenda.itens.filter(i => i.estado === 'rascunho').length : 0,
    bloq_consentimento: agenda ? agenda.itens.filter(i => i.motivo === 'consentimento').length : 0,
    bloq_convivio: agenda ? agenda.itens.filter(i => i.motivo === 'convivio').length : 0,
    alertas_turma: alertasTurma,
    sem_registro_3mais: caro(tela)
      ? S.estadoDoRegistro(turma.id, ref).filter(c => c.sem_registro >= 3).length : 0,
    exposicao_area: areaToken,
    exposicao_criancas: lac?.criancas ?? 0,
    pauta_indecisa: !!(pauta && !pauta.tranquila && !pauta.decidida),
    tranquila: !!pauta?.tranquila,
    folhas_por_voz: totais?.voz ?? 0,
    folhas_total: totais?.total ?? 0,
  });
}

function doCoordenacao(_u, tela, ref) {
  const ciclo = D.cicloAberto();
  const cob = S.coberturaRegistro({ ref });
  const desc = S.taxaDeDescarte({});
  const venc = cicloVencido(ref);
  const sint = ciclo ? D.sinteseDe(ciclo.id) : null;
  const calib = ciclo ? D.calibracaoEntreObservadores(ciclo.id) : null;

  const estadoSintese = !sint ? 'inexistente'
    : sint.status === 'aprovada' ? 'aprovada'
    : sint.revisor_status === 'aprovado' ? 'rascunho_aprovado' : 'rascunho_reprovado';

  return congelar({
    papel: 'coordenacao', tela,
    cobertura_pct: cob.valor ?? 0,
    cobertura_alerta: (cob.valor ?? 100) < 70,
    turmas_sem_registro: cob.turmas_sem_registro ?? 0,   // CONTAGEM — nunca o nome
    alertas_abertos: D.alertas('aberto').length,
    alertas_parados: alertasParados(D.addDias(ref, -7)),
    consentimentos_bloqueando: consentimentoTrava(),
    ciclo_vencido_dias: venc ? D.diasEntre(venc.fim, ref) : 0,
    ciclo_dias_restantes: ciclo && !venc ? Math.max(0, D.diasEntre(ref, ciclo.fim)) : 0,
    sintese_estado: estadoSintese,
    descarte_pct: desc.pct ?? 0,
    descarte_alerta: !!desc.alerta,
    folhas_abertas: folhasAbertas(),
    calibracao_divergencias: calib?.divergencias?.length ?? 0,
  });
}

function doDiretoria(_u, tela, ref) {
  const periodos = R.periodosSugeridos(ref);
  const lista = R.relatorios();
  const semRelatorio = periodos.filter(p =>
    !lista.some(r => r.tipo === 'ciclo' && r.periodo === `${p.inicio}..${p.fim}`)).length;
  const ultimo = lista.find(r => r.tipo === 'ciclo') ?? null;
  const pub = ultimaPublicacao();
  const cheio = ultimo ? R.relatorioDe('ciclo', ultimo.periodo) : null;

  return congelar({
    papel: 'diretoria', tela,
    relatorio_estado: !ultimo ? 'sem_relatorio' : (ultimo.status === 'publicado' ? 'publicado' : 'rascunho'),
    revisor_status: ultimo ? (ultimo.revisor_status === 'aprovado' ? 'aprovado' : 'reprovado') : 'nenhum',
    dias_desde_publicacao: pub ? D.diasEntre(pub, ref) : -1,
    periodos_sem_relatorio: semRelatorio,
    custo_informado: !!cheio?.numeros?.custo?.valor,
    dose_publicavel: !!cheio?.numeros?.dose?.publicavel,
    supressoes_n: cheio ? (cheio.supressoes?.programas?.length ?? 0) + (cheio.supressoes?.areas?.length ?? 0) : 0,
    capa_por_vinculo: !!cheio?.supressoes?.capa_por_vinculo,
  });
}

/**
 * O envelope da pessoa, nesta tela, hoje. NUNCA lança: falha vira ENVELOPE_VAZIO
 * (todos os gatilhos apagados → o painel cai no fallback estático de sempre) e
 * incrementa o contador da autocrítica. A rota nunca responde 5xx por causa daqui.
 */
export function sinaisDe(u, tela = '', ref = D.hoje()) {
  const chave = `${u.id}:${tela}:${ref}`;
  const guardado = memo.get(chave);
  if (guardado && Date.now() - guardado.em < MEMO_MS) return guardado.env;
  let env;
  try {
    env = u.papel === 'coordenacao' ? doCoordenacao(u, tela, ref)
        : u.papel === 'diretoria' ? doDiretoria(u, tela, ref)
        : congelar(doEducador(u, tela, ref));
  } catch (e) {
    falhas++;
    console.error('[percurso] envelope do Passo falhou:', e.message);
    env = ENVELOPE_VAZIO;
  }
  memo.set(chave, { env, em: Date.now() });
  if (memo.size > 200) for (const k of [...memo.keys()].slice(0, 100)) memo.delete(k);
  return env;
}
