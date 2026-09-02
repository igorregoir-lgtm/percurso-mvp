// Percurso — regras de dominio.
// Tudo que decide alguma coisa mora aqui: elegibilidade de observacao,
// filtro de perimetro do campo livre, alertas de ausencia, safras,
// trajetorias e a sintese de ciclo (template contido + revisor).
import { all, get, run, tx } from './db.js';
// O modelo REDIGE a síntese; os números continuam vindo do SQL daqui e são
// conferidos um a um contra ele antes de o texto existir (decisão 28).
import { redigirComModelo, SISTEMA_REDATOR } from './redacao-modelo.js';

// Parametros de protocolo (M6 — protocolo de aplicacao) ------------------------
export const PARAMS = {
  // Janela minima de convivio: quantos encontros a educadora precisa ter tido
  // com a crianca antes de poder responder a rubrica sobre ela.
  JANELA_MINIMA_CONVIVIO: 4,
  // Ausencias consecutivas que disparam alerta operacional (F6/F8).
  // v2: duas faltas seguidas ja colocam a crianca na lista — e' o aceite da
  // US4 e do 02-FEATURES ("aparece no dia seguinte a segunda falta").
  AUSENCIAS_ALERTA: 2,
  // Escala da rubrica.
  NIVEL_MIN: 1,
  NIVEL_MAX: 4,
  // Anti-abandono: a partir de quantos dias sem registro o sistema oferece
  // retomada explicita, sem cobranca.
  DIAS_LAPSO: 5,
  // Meta do experimento de validacao do modulo: registro em menos de 2 minutos.
  META_REGISTRO_SEGUNDOS: 120,
  // Supressao de celula pequena: agregado com menos de N criancas nao sai
  // (logica populacional do EDI — protege contra reidentificacao).
  MINIMO_CELULA: 5,
  // --- v2 -----------------------------------------------------------------
  // Janela maxima da captura por voz, em segundos.
  VOZ_SEGUNDOS: 40,
  // Abaixo disto o extrator nao pre-marca nada: falhar em branco e' melhor que
  // falhar preenchido (06-AGENTES-IA).
  CONFIANCA_MINIMA: 0.6,
  // Score de evasao a partir do qual a matricula entra na pauta e no painel.
  RISCO_ACAO: 60,
  // Cobertura de registro abaixo disto acende sinal para a coordenacao.
  COBERTURA_ALERTA: 70,
  // Taxa de descarte da pauta acima disto significa agente generico.
  DESCARTE_ALERTA: 30,
  // --- decisao 33 (campo, 29/08/2026) ------------------------------------
  // A regua de presenca do Instituto: 75% e' o minimo para permanecer no
  // programa e entrar no grupo de beneficios; abaixo de 80% a casa ja' marca
  // "atencao — os pais tem que regular". E' politica existente, absorvida.
  PRESENCA_MINIMA_PCT: 75,
  PRESENCA_ATENCAO_PCT: 80,
  // Com menos encontros que isto no periodo, a regua nao se aplica (sem base).
  REGUA_MINIMO_ENCONTROS: 4,
};

export const hoje = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const agora = () => new Date().toISOString();

export function diasEntre(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

export function addDias(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dataBR(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

// --------------------------------------------------------------------------
// F1 — ficha viva / inventario. Criança e' entidade; matricula e' relacao.
// --------------------------------------------------------------------------
export function inventario() {
  // Os três números do dossiê ("60+40+20=120") contam os programas de
  // matrícula (no_escopo=1). A Vivência terapêutica entrou no Percurso em
  // 02/09/2026 como programa ADICIONAL (decisão 31): quem está nela já está no
  // Laboratório ou no Reforço, então ela não muda crianças únicas nem os 120 —
  // e é contada à parte, para o painel dizer as duas coisas sem misturar.
  const criancasUnicas = get(
    `SELECT COUNT(DISTINCT c.id) AS n FROM crianca c
      JOIN matricula m ON m.crianca_id = c.id AND m.status = 'ativa'
      JOIN programa p ON p.id = m.programa_id AND p.no_escopo = 1
     WHERE c.ativo = 1`).n;
  const matriculas = get(
    `SELECT COUNT(*) AS n FROM matricula m JOIN programa p ON p.id = m.programa_id
      WHERE m.status = 'ativa' AND p.no_escopo = 1`).n;
  const multi = get(
    `SELECT COUNT(*) AS n FROM (
       SELECT m.crianca_id FROM matricula m JOIN programa p ON p.id = m.programa_id
        WHERE m.status='ativa' AND p.no_escopo = 1
        GROUP BY m.crianca_id HAVING COUNT(*) > 1)`).n;
  const porPrograma = all(
    `SELECT p.id, p.nome, p.faixa, p.cadencia, p.no_escopo, p.nota,
            COUNT(m.id) AS matriculas
       FROM programa p
       LEFT JOIN matricula m ON m.programa_id = p.id AND m.status = 'ativa'
      GROUP BY p.id ORDER BY p.id`);
  const vivencia = get(
    `SELECT COUNT(m.id) AS matriculas, COUNT(DISTINCT m.crianca_id) AS criancas
       FROM matricula m JOIN programa p ON p.id = m.programa_id
      WHERE m.status = 'ativa' AND p.no_escopo = 0`);
  const primeiroEncontro = get(`SELECT MIN(data) AS d FROM encontro`).d;
  const encontros = get(`SELECT COUNT(*) AS n FROM encontro`).n;
  const presencas = get(`SELECT COUNT(*) AS n FROM presenca`).n;
  return {
    criancasUnicas, matriculas, multi, porPrograma,
    // Programas fora da rubrica (hoje só a Vivência): registro de turma, presença
    // e check-in de grupo — nunca observação individual.
    foraDaRubrica: { matriculas: vivencia?.matriculas ?? 0, criancas: vivencia?.criancas ?? 0 },
    cobertura: { desde: primeiroEncontro, encontros, presencas },
  };
}

/** A turma entra na rubrica por ciclo? Falso para a Vivência terapêutica
 *  (decisão 31): lá o registro é de turma, e a agenda do ciclo não se aplica. */
export function turmaNaRubrica(turmaId) {
  return !!get(`SELECT p.no_escopo AS x FROM turma t JOIN programa p ON p.id = t.programa_id
                 WHERE t.id = ?`, turmaId)?.x;
}

// --------------------------------------------------------------------------
// F2 — presenca. Chamada por turma, em um toque.
// --------------------------------------------------------------------------
export function criancasDaTurma(turmaId) {
  return all(
    `SELECT c.id, c.codigo, c.nome, m.entrada
       FROM crianca c
       JOIN matricula m ON m.crianca_id = c.id
      WHERE m.turma_id = ? AND m.status = 'ativa' AND c.ativo = 1
      ORDER BY c.nome`, turmaId);
}

export function encontroDe(turmaId, data) {
  return get(`SELECT * FROM encontro WHERE turma_id = ? AND data = ?`, turmaId, data);
}

// A folha e' do ENCONTRO, nao do calendario. Se hoje nao houve encontro (sabado
// numa turma de semana, feriado, recesso), a folha que a educadora quer abrir e'
// a do ultimo encontro registrado — e a tela mostra a data por extenso para nao
// haver duvida sobre qual dia ela esta descrevendo.
export function dataDaFolha(turmaId, ref = hoje()) {
  if (encontroDe(turmaId, ref)) return ref;
  return get(`SELECT data FROM encontro WHERE turma_id = ? AND data <= ? ORDER BY data DESC LIMIT 1`,
             turmaId, ref)?.data ?? ref;
}

export function chamada(turmaId, data) {
  const turma = get(
    `SELECT t.*, p.nome AS programa FROM turma t
       JOIN programa p ON p.id = t.programa_id WHERE t.id = ?`, turmaId);
  if (!turma) throw erro(404, 'Turma não encontrada.');
  const enc = encontroDe(turmaId, data);
  const marcadas = enc
    ? Object.fromEntries(all(`SELECT crianca_id, status FROM presenca WHERE encontro_id = ?`, enc.id)
        .map(r => [r.crianca_id, r.status]))
    : {};
  return {
    turma, data,
    registrada: !!enc,
    registrada_em: enc?.registrado_em ?? null,
    criancas: criancasDaTurma(turmaId).map(c => ({ ...c, status: marcadas[c.id] ?? null })),
  };
}

export function salvarChamada(turmaId, data, educadorId, marcacoes, duracaoSegundos = null) {
  const elegiveis = new Set(criancasDaTurma(turmaId).map(c => c.id));
  if (!elegiveis.size) throw erro(422, 'Esta turma não tem criança matriculada.');
  const limpas = [];
  for (const m of marcacoes || []) {
    const id = Number(m.crianca_id);
    if (!elegiveis.has(id)) throw erro(422, `Criança ${id} não pertence a esta turma.`);
    if (m.status !== 'P' && m.status !== 'F') throw erro(422, 'Status de presença inválido (use P ou F).');
    limpas.push({ id, status: m.status });
  }
  if (limpas.length !== elegiveis.size) {
    throw erro(422, `Faltou marcar ${elegiveis.size - limpas.length} criança(s). Marque todas antes de salvar.`);
  }
  if (data > hoje()) throw erro(422, 'Não dá para registrar chamada de uma data futura.');

  // Duracao do registro: clampada a 1h; medida no cliente, tratada como telemetria.
  const dur = Number.isFinite(Number(duracaoSegundos))
    ? Math.max(1, Math.min(3600, Math.round(Number(duracaoSegundos)))) : null;

  return tx(() => {
    let enc = encontroDe(turmaId, data);
    if (!enc) {
      run(`INSERT INTO encontro (turma_id, data, registrado_por, registrado_em, duracao_segundos)
           VALUES (?,?,?,?,?)`, turmaId, data, educadorId, agora(), dur);
      enc = encontroDe(turmaId, data);
    } else {
      run(`UPDATE encontro SET registrado_por = ?, registrado_em = ?,
             duracao_segundos = COALESCE(?, duracao_segundos) WHERE id = ?`,
          educadorId, agora(), dur, enc.id);
    }
    for (const m of limpas) {
      run(`INSERT INTO presenca (encontro_id, crianca_id, status) VALUES (?,?,?)
           ON CONFLICT(encontro_id, crianca_id) DO UPDATE SET status = excluded.status`,
          enc.id, m.id, m.status);
    }
    marcarAtividade(educadorId, 'chamada');
    return recalcularAlertas(turmaId);
  });
}

// Dias em que a turma se reuniu e a chamada nao foi registrada (anti-abandono:
// nada expira, tudo pode ser registrado depois, sem penalidade).
export function chamadasEmAberto(turmaId, limite = 10) {
  const turma = get(`SELECT * FROM turma WHERE id = ?`, turmaId);
  if (!turma) return [];
  const registradas = new Set(all(`SELECT data FROM encontro WHERE turma_id = ?`, turmaId).map(r => r.data));
  const inicio = get(`SELECT MIN(entrada) AS d FROM matricula WHERE turma_id = ?`, turmaId)?.d;
  if (!inicio) return [];
  const abertas = [];
  const fim = hoje();
  let cur = addDias(fim, -limite * 2);
  if (cur < inicio) cur = inicio;
  while (cur <= fim) {
    if (diaLetivo(turma.turno, cur) && !registradas.has(cur)) abertas.push(cur);
    cur = addDias(cur, 1);
  }
  return abertas.slice(-limite);
}

export function diaLetivo(turno, iso) {
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay(); // 0=dom
  return turno === 'sabado' ? dow === 6 : dow >= 1 && dow <= 5;
}

// --------------------------------------------------------------------------
// F6 — alerta de ausencias consecutivas.
// --------------------------------------------------------------------------
export function ausenciasConsecutivas(criancaId) {
  const linhas = all(
    `SELECT p.status, e.data FROM presenca p
       JOIN encontro e ON e.id = p.encontro_id
      WHERE p.crianca_id = ? ORDER BY e.data DESC LIMIT 30`, criancaId);
  let n = 0;
  for (const l of linhas) { if (l.status === 'F') n++; else break; }
  return { n, ultima: linhas[0]?.data ?? null };
}

export function recalcularAlertas(turmaId = null) {
  const criancas = turmaId
    ? criancasDaTurma(turmaId)
    : all(`SELECT DISTINCT c.id, c.nome, c.codigo FROM crianca c
             JOIN matricula m ON m.crianca_id = c.id AND m.status='ativa' WHERE c.ativo=1`);
  const abertos = [];
  for (const c of criancas) {
    const { n, ultima } = ausenciasConsecutivas(c.id);
    const existente = get(`SELECT * FROM alerta WHERE crianca_id = ? AND tipo = 'ausencia'`, c.id);
    if (n >= PARAMS.AUSENCIAS_ALERTA) {
      const detalhe = `Faltou nos ${n} últimos encontros da turma — o mais recente em ${dataBR(ultima)}.`;
      if (!existente) {
        run(`INSERT INTO alerta (crianca_id, tipo, detalhe, criado_em, status, atualizado_em)
             VALUES (?,'ausencia',?,?, 'aberto', ?)`, c.id, detalhe, agora(), agora());
      } else if (existente.status !== 'resolvido') {
        run(`UPDATE alerta SET detalhe = ?, atualizado_em = ? WHERE id = ?`, detalhe, agora(), existente.id);
      }
      abertos.push(c.id);
    } else if (existente && existente.status !== 'resolvido' && n === 0) {
      run(`UPDATE alerta SET status='resolvido', atualizado_em=?,
             tratativa = COALESCE(tratativa,'') || ' | Criança voltou a comparecer.'
           WHERE id = ?`, agora(), existente.id);
    }
  }
  return { alertasAbertos: abertos.length };
}

export function alertas(status = null, educadorId = null) {
  // Escopo de turma (A4): a educadora vê os alertas das SUAS turmas; a lista
  // completa é da coordenação. Papel sozinho não cumpre o "educador DA criança".
  const escopo = educadorId
    ? `AND a.crianca_id IN (SELECT m.crianca_id FROM matricula m
         JOIN turma t ON t.id = m.turma_id
        WHERE m.status='ativa' AND t.educador_id = ?)` : '';
  const sql = `SELECT a.*, c.nome, c.codigo,
                      (SELECT GROUP_CONCAT(p.nome, ', ') FROM matricula m
                         JOIN programa p ON p.id = m.programa_id
                        WHERE m.crianca_id = c.id AND m.status='ativa') AS programas
                 FROM alerta a JOIN crianca c ON c.id = a.crianca_id
                ${status ? 'WHERE a.status = ?' : "WHERE a.status <> 'resolvido'"}
                ${escopo}
                ORDER BY a.status, a.criado_em DESC`;
  const p = [...(status ? [status] : []), ...(educadorId ? [educadorId] : [])];
  return all(sql, ...p);
}

export function atualizarAlerta(id, status, tratativa) {
  const permitidos = ['aberto', 'em_acompanhamento', 'resolvido'];
  if (!permitidos.includes(status)) throw erro(422, 'Status de alerta inválido.');
  const a = get(`SELECT * FROM alerta WHERE id = ?`, id);
  if (!a) throw erro(404, 'Alerta não encontrado.');
  run(`UPDATE alerta SET status = ?, tratativa = ?, atualizado_em = ? WHERE id = ?`,
      status, (tratativa || '').trim() || a.tratativa, agora(), id);
  return get(`SELECT * FROM alerta WHERE id = ?`, id);
}

// --------------------------------------------------------------------------
// Consentimento (F1) — campo sem consentimento nasce bloqueado.
// --------------------------------------------------------------------------
export function consentimentoDe(criancaId, campo) {
  const gov = get(`SELECT * FROM governanca_campo WHERE campo = ?`, campo);
  if (!gov) throw erro(404, 'Campo não consta na tabela de governança.');
  if (!gov.exige_consentimento) return { status: 'ativo', dispensado: true, gov };
  const c = get(`SELECT * FROM consentimento WHERE crianca_id = ? AND campo = ?`, criancaId, campo);
  return { status: c?.status ?? 'pendente', responsavel: c?.responsavel ?? null,
           data_registro: c?.data_registro ?? null, dispensado: false, gov };
}

export function registrarConsentimento(criancaId, campo, status, responsavel) {
  if (!['ativo', 'pendente', 'revogado'].includes(status)) throw erro(422, 'Status de consentimento inválido.');
  if (status === 'ativo' && !(responsavel || '').trim()) {
    throw erro(422, 'Para ativar o consentimento é preciso registrar quem é o responsável que consentiu.');
  }
  if (!get(`SELECT id FROM crianca WHERE id = ?`, criancaId)) throw erro(404, 'Criança não encontrada.');
  run(`INSERT INTO consentimento (crianca_id, campo, status, responsavel, data_registro)
       VALUES (?,?,?,?,?)
       ON CONFLICT(crianca_id, campo) DO UPDATE SET
         status = excluded.status, responsavel = excluded.responsavel,
         data_registro = excluded.data_registro`,
      criancaId, campo, status, (responsavel || '').trim() || null, hoje());
  return consentimentoDe(criancaId, campo);
}

// --------------------------------------------------------------------------
// F3/F4 — ciclo de observacao, elegibilidade e agenda.
// --------------------------------------------------------------------------
export function cicloAberto() {
  return get(`SELECT * FROM ciclo WHERE status = 'aberto' ORDER BY ano DESC, ordem DESC LIMIT 1`);
}
export function ciclos() {
  return all(`SELECT * FROM ciclo ORDER BY ano, ordem`);
}

export function encontrosComCrianca(criancaId, ate = null) {
  return get(
    `SELECT COUNT(*) AS n FROM presenca p JOIN encontro e ON e.id = p.encontro_id
      WHERE p.crianca_id = ? AND p.status = 'P' ${ate ? 'AND e.data <= ?' : ''}`,
    ...(ate ? [criancaId, ate] : [criancaId])).n;
}

// Retorna o status da crianca dentro do ciclo, com o MOTIVO quando bloqueada.
export function elegibilidade(criancaId, cicloId) {
  const cons = consentimentoDe(criancaId, 'rubrica_socioemocional');
  const convivio = encontrosComCrianca(criancaId);
  const obs = get(`SELECT * FROM observacao WHERE ciclo_id = ? AND crianca_id = ?`, cicloId, criancaId);
  if (cons.status !== 'ativo') {
    return { pode: false, motivo: 'consentimento',
             texto: 'Registro socioemocional bloqueado — o responsável ainda não deu o consentimento específico (LGPD Art. 14).',
             observacao: obs ?? null, convivio };
  }
  if (convivio < PARAMS.JANELA_MINIMA_CONVIVIO) {
    return { pode: false, motivo: 'convivio',
             texto: `Janela mínima de convívio não cumprida: ${convivio} de ${PARAMS.JANELA_MINIMA_CONVIVIO} encontros. O protocolo pede convívio antes de observar.`,
             observacao: obs ?? null, convivio };
  }
  return { pode: true, motivo: null, texto: null, observacao: obs ?? null, convivio };
}

// F4 — agenda do ciclo para a educadora: quem falta, quem esta bloqueado, quem ja foi.
export function agendaDoCiclo(turmaId, cicloId) {
  const ciclo = get(`SELECT * FROM ciclo WHERE id = ?`, cicloId);
  if (!ciclo) throw erro(404, 'Ciclo não encontrado.');
  const itens = criancasDaTurma(turmaId).map(c => {
    const el = elegibilidade(c.id, cicloId);
    const feito = el.observacao?.status === 'concluida';
    const rascunho = el.observacao?.status === 'rascunho';
    // O bloqueio vence qualquer registro anterior: consentimento revogado depois
    // de uma observacao feita volta a fechar o campo.
    const estado = !el.pode ? 'bloqueada' : feito ? 'concluida' : rascunho ? 'rascunho' : 'pendente';
    return {
      crianca_id: c.id, codigo: c.codigo, nome: c.nome, estado,
      motivo: el.motivo, texto: el.texto, convivio: el.convivio,
    };
  });
  const observaveis = itens.filter(i => i.estado !== 'bloqueada');
  const concluidas = itens.filter(i => i.estado === 'concluida');
  return {
    ciclo,
    dias_restantes: diasEntre(hoje(), ciclo.fim),
    total: itens.length,
    observaveis: observaveis.length,
    concluidas: concluidas.length,
    pendentes: observaveis.length - concluidas.length,
    bloqueadas: itens.length - observaveis.length,
    cobertura: observaveis.length ? Math.round((concluidas.length / observaveis.length) * 100) : 0,
    itens,
  };
}

// --------------------------------------------------------------------------
// Filtro de perimetro do campo livre (bloco 6 em ato).
// Deterministico, local, auditavel: sem modelo, sem chamada externa.
// --------------------------------------------------------------------------
const PERIMETRO = [
  { rotulo: 'saúde mental / diagnóstico', termos: ['depress', 'depressiv', 'deprimid', 'ansiedad', 'ansios', 'transtorno', 'autis', 'tdah', 'bipolar', 'psiquiatr', 'psicolog', 'psicólog', 'terapia', 'terapeut', 'diagnostic', 'diagnóstic', 'laudo', 'suicid', 'automutil', 'medicad', 'medicament', 'remedio', 'remédio', 'ritalina', 'fluoxetina', 'traumatiz', 'trauma', 'atendimento individual'] },
  { rotulo: 'violência / proteção', termos: ['abuso', 'abusad', 'violen', 'estupr', 'agress', 'apanh', 'espanc', 'conselho tutelar', 'conselhos tutelares', 'assedi', 'assédi', 'denuncia', 'denúncia', 'maus tratos', 'maus-tratos'] },
  { rotulo: 'vida íntima e familiar', termos: ['pai bebe', 'pai bêbado', 'mae bebe', 'mãe bêbada', 'alcool', 'álcool', 'droga', 'trafic', 'preso', 'cadeia', 'presidio', 'presídio', 'prisao', 'prisão', 'prisoes', 'prisões', 'separac', 'separaç', 'divorci', 'divórci', 'despej', 'em casa nao tem', 'em casa não tem', 'passa fome', 'briga em casa', 'apanha em casa', 'luto', 'morreu', 'faleceu', 'velório', 'velorio', 'sem casa', 'na rua', 'situacao familiar', 'situação familiar', 'situacao em casa', 'situação em casa', 'situacao de vulnerabilidade', 'situação de vulnerabilidade'] },
  // "saude" NAO entra solto de proposito: "roda de conversa sobre saude" e' uma
  // area tematica legitima da folha, e bloquear isso quebraria o score de
  // exposicao. O que o bloco 6 barra e' a saude DE UMA CRIANCA — por isso os
  // termos aqui sao contextualizados.
  { rotulo: 'saúde física / corpo', termos: ['doenca', 'doença', 'hospital', 'internad', 'cirurgi', 'convuls', 'epilep', 'hiv', 'gravid', 'sintoma', 'febre', 'desnutri', 'nao come', 'não come', 'sem comer', 'saude dela', 'saúde dela', 'saude dele', 'saúde dele', 'problema de saude', 'problema de saúde', 'de saude nao', 'de saúde não'] },
];

// Categoria 5 do 06-AGENTES-IA: "qualquer afirmacao sobre o estado psiquico ou
// emocional interno de uma CRIANCA NOMEADA". Nao da para resolver com lista de
// palavras solta — "a turma ficou triste" e' observacao de grupo e passaria a
// disparar o aviso a toa, treinando a educadora a ignora-lo. A regra exige as
// DUAS coisas na mesma frase: um nome da turma e uma afirmacao de estado interno.
const ESTADO_INTERNO = [
  'trist', 'deprimid', 'abatid', 'apatic', 'apátic', 'angusti', 'ansios',
  'sofrend', 'sofre muito', 'traumatiz', 'chorou', 'chorando', 'nao fala com ninguem',
  'não fala com ninguém', 'se isolou', 'isolad', 'sem vontade', 'carente', 'revoltad',
];

// Comparacao SEM ACENTO nos dois lados. Sem isto, 'violen' nao casava com
// "violência" — a palavra que da nome a propria categoria passava batido, e a
// lista precisava de duplicatas acentuadas para cada termo.
const semAcento = (t) => String(t ?? '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * @param {string} texto
 * @param {string[]} [nomes]  nomes da turma; habilita a categoria 5 (estado
 *                            psiquico de crianca NOMEADA)
 */
// Decisão 31: na turma da VIVÊNCIA, o nome do procedimento não é conteúdo sobre
// criança. "Vivência terapêutica" e "terapia em grupo" são o que a psicóloga
// FAZ, e sem esta lista o filtro recusaria a fala dela sobre o próprio trabalho
// (a psicóloga era o usuário mais provável a ser barrado — campo, 29/08/2026).
// Lista FECHADA de sintagmas, comparada sem acento, aplicada só com o contexto
// 'vivencia'. Tudo o que é sobre criança (diagnóstico, laudo, abuso, estado
// interno de criança nomeada) continua barrado: a neutralização troca o
// sintagma por "atividade" e o resto da frase segue para as listas.
const NEUTRALIZAVEIS_VIVENCIA = [
  'vivencias terapeuticas', 'vivencia terapeutica', 'terapia em grupo', 'terapia de grupo',
  'grupo terapeutico', 'trabalho terapeutico', 'atividade terapeutica', 'psicoeducativa',
  'psicoeducativo', 'psicoeducacao', 'a psicologa conduziu', 'como psicologa',
];
function neutralizarProcedimento(norm) {
  let n = norm, quantos = 0;
  for (const s of NEUTRALIZAVEIS_VIVENCIA) {
    if (n.includes(s)) { n = n.split(s).join('atividade'); quantos++; }
  }
  return { norm: n, quantos };
}

export function filtrarPerimetro(texto, nomes = [], { contexto = null } = {}) {
  const bruto = (texto || '').trim();
  if (!bruto) return { limpo: '', bloqueado: false, trechos: [], neutralizados: 0 };
  const primeiros = [...new Set(nomes.map(n => semAcento(n).split(' ')[0]).filter(n => n.length >= 3))];
  const frases = bruto.split(/(?<=[.!?;\n])\s*/).filter(f => f.trim());
  const trechos = [];
  const mantidas = [];
  let neutralizados = 0;
  for (const f of frases) {
    let norm = semAcento(f);
    if (contexto === 'vivencia') {
      const r = neutralizarProcedimento(norm);
      norm = r.norm; neutralizados += r.quantos;
    }
    // O trecho devolvido é o ORIGINAL, com acento: a normalização serve só para
    // comparar. Quem lê o encaminhamento tem que ver o que de fato foi dito.
    let hit = PERIMETRO.find(cat => cat.termos.some(t => norm.includes(semAcento(t))))?.rotulo;
    if (!hit
        && primeiros.some(n => new RegExp('(^|[^a-z])' + n + '($|[^a-z])').test(norm))
        && ESTADO_INTERNO.some(t => norm.includes(semAcento(t)))) {
      hit = 'estado psíquico de criança nomeada';
    }
    if (hit) trechos.push({ trecho: f.trim(), categoria: hit });
    else mantidas.push(f.trim());
  }
  return { limpo: mantidas.join(' ').trim(), bloqueado: trechos.length > 0, trechos, neutralizados };
}

// --------------------------------------------------------------------------
// F3 — gravar observacao (rascunho ou conclusao).
// --------------------------------------------------------------------------
export function rubrica() {
  const dims = all(`SELECT * FROM dimensao ORDER BY ordem`);
  const anc = all(`SELECT * FROM ancora ORDER BY dimensao_id, nivel`);
  return dims.map(d => ({ ...d, ancoras: anc.filter(a => a.dimensao_id === d.id) }));
}

export function observacaoDe(cicloId, criancaId) {
  const o = get(`SELECT * FROM observacao WHERE ciclo_id = ? AND crianca_id = ?`, cicloId, criancaId);
  if (!o) return null;
  o.itens = all(`SELECT dimensao_id, nivel FROM observacao_item WHERE observacao_id = ?`, o.id);
  return o;
}

// v2: o olhar nao tem mais campo de texto livre. Texto narrativo sobre crianca
// nomeada e' a coluna clinica do bloco 6 — a decisao esta em 01-VISAO-E-MUDANCAS
// do pack v2 e em DECISOES-TECNICAS n. 15. `notaLivre` continua no contrato da
// funcao apenas para RECUSAR explicitamente quem tentar gravar por ela.
export function salvarObservacao({ cicloId, criancaId, educadorId, itens, notaLivre, concluir }) {
  const ciclo = get(`SELECT * FROM ciclo WHERE id = ?`, cicloId);
  if (!ciclo) throw erro(404, 'Ciclo não encontrado.');
  if (ciclo.status !== 'aberto') throw erro(422, 'Este ciclo já foi fechado — não aceita nova observação.');

  const el = elegibilidade(criancaId, cicloId);
  if (!el.pode) throw erro(403, el.texto, { motivo: el.motivo });

  const dims = all(`SELECT id FROM dimensao`).map(d => d.id);
  const marcados = new Map();
  for (const i of itens || []) {
    const dim = Number(i.dimensao_id), nivel = Number(i.nivel);
    if (!dims.includes(dim)) throw erro(422, 'Dimensão inválida na rubrica.');
    if (!(nivel >= PARAMS.NIVEL_MIN && nivel <= PARAMS.NIVEL_MAX)) throw erro(422, 'Nível fora da escala 1–4.');
    marcados.set(dim, nivel);
  }
  if (concluir && marcados.size !== dims.length) {
    throw erro(422, `Faltam ${dims.length - marcados.size} dimensão(ões). Para concluir, marque todas — ou salve como rascunho e volte depois.`,
               { recuperavel: true });
  }

  // O olhar nao aceita texto sobre a crianca. Quem tentar gravar recebe 422 com
  // o encaminhamento humano — a mesma porta que a voz usa.
  if ((notaLivre || '').trim()) {
    throw erro(422,
      'O olhar não guarda texto sobre a criança. Se for algo que precisa de encaminhamento, fale com a coordenação — esse caminho é fora daqui.',
      { motivo: 'campo_livre_removido' });
  }

  return tx(() => {
    let obs = get(`SELECT * FROM observacao WHERE ciclo_id = ? AND crianca_id = ?`, cicloId, criancaId);
    const status = concluir ? 'concluida' : 'rascunho';
    if (!obs) {
      run(`INSERT INTO observacao (ciclo_id, crianca_id, educador_id, status, nota_livre, atualizado_em, concluido_em)
           VALUES (?,?,?,?,?,?,?)`,
          cicloId, criancaId, educadorId, status, null, agora(), concluir ? agora() : null);
      obs = get(`SELECT * FROM observacao WHERE ciclo_id = ? AND crianca_id = ?`, cicloId, criancaId);
    } else {
      if (obs.status === 'concluida' && !concluir) throw erro(422, 'Observação já concluída não volta para rascunho.');
      run(`UPDATE observacao SET status=?, nota_livre=?, educador_id=?, atualizado_em=?,
             concluido_em = COALESCE(concluido_em, ?) WHERE id = ?`,
          status, null, educadorId, agora(), concluir ? agora() : null, obs.id);
    }
    run(`DELETE FROM observacao_item WHERE observacao_id = ?`, obs.id);
    for (const [dim, nivel] of marcados) {
      run(`INSERT INTO observacao_item (observacao_id, dimensao_id, nivel) VALUES (?,?,?)`, obs.id, dim, nivel);
    }
    marcarAtividade(educadorId, concluir ? 'observacao' : 'rascunho');
    return { id: obs.id, status };
  });
}

// --------------------------------------------------------------------------
// F5 — trajetorias. Individual = categorica e interna. Agregado = medias.
// --------------------------------------------------------------------------
export function trajetoriaCrianca(criancaId) {
  const linhas = all(
    `SELECT o.ciclo_id, ci.nome AS ciclo, ci.ordem, ci.ano, oi.dimensao_id, d.nome AS dimensao, d.ordem AS dord, oi.nivel
       FROM observacao o
       JOIN ciclo ci ON ci.id = o.ciclo_id
       JOIN observacao_item oi ON oi.observacao_id = o.id
       JOIN dimensao d ON d.id = oi.dimensao_id
      WHERE o.crianca_id = ? AND o.status = 'concluida'
      ORDER BY ci.ano, ci.ordem, d.ordem`, criancaId);
  const ciclosVistos = [...new Map(linhas.map(l => [l.ciclo_id, { id: l.ciclo_id, nome: l.ciclo }])).values()];
  const dims = [...new Map(linhas.map(l => [l.dimensao_id, { id: l.dimensao_id, nome: l.dimensao, ordem: l.dord }])).values()]
    .sort((a, b) => a.ordem - b.ordem);
  const matriz = dims.map(d => {
    const niveis = ciclosVistos.map(c =>
      linhas.find(l => l.ciclo_id === c.id && l.dimensao_id === d.id)?.nivel ?? null);
    const [ant, ult] = [niveis.at(-2), niveis.at(-1)];
    let mudanca = 'sem_par';
    if (ant != null && ult != null) mudanca = ult > ant ? 'avancou' : ult < ant ? 'recuou' : 'estavel';
    return { dimensao: d.nome, niveis, mudanca };
  });
  return { ciclos: ciclosVistos, dimensoes: matriz };
}

// Medias agregadas por ciclo — o que pode sair da organizacao.
export function agregadoPorCiclo({ turmaId = null, programaId = null } = {}) {
  // Sem filtro nao ha JOIN com matricula: uma crianca em dois programas contaria
  // duas vezes na media agregada.
  const escopo = turmaId
    ? { sql: `AND o.crianca_id IN (SELECT crianca_id FROM matricula WHERE status='ativa' AND turma_id = ?)`, p: [turmaId] }
    : programaId
    ? { sql: `AND o.crianca_id IN (SELECT crianca_id FROM matricula WHERE status='ativa' AND programa_id = ?)`, p: [programaId] }
    : { sql: '', p: [] };
  const linhas = all(
    `SELECT ci.id AS ciclo_id, ci.nome AS ciclo, ci.ordem, d.id AS dimensao_id, d.nome AS dimensao, d.ordem,
            ROUND(AVG(oi.nivel), 2) AS media, COUNT(DISTINCT o.crianca_id) AS n
       FROM observacao o
       JOIN ciclo ci ON ci.id = o.ciclo_id
       JOIN observacao_item oi ON oi.observacao_id = o.id
       JOIN dimensao d ON d.id = oi.dimensao_id
      WHERE o.status = 'concluida' ${escopo.sql}
      GROUP BY ci.id, d.id ORDER BY ci.ordem, d.ordem`, ...escopo.p);
  const ciclosVistos = [...new Map(linhas.map(l => [l.ciclo_id, { id: l.ciclo_id, nome: l.ciclo }])).values()];
  const dims = [...new Map(linhas.map(l => [l.dimensao_id, { id: l.dimensao_id, nome: l.dimensao }])).values()];
  let suprimidas = 0;
  const series = dims.map(d => ({
    dimensao: d.nome,
    valores: ciclosVistos.map(c => {
      const l = linhas.find(x => x.ciclo_id === c.id && x.dimensao_id === d.id);
      if (!l) return null;
      // Supressao de celula pequena: media sobre menos de MINIMO_CELULA criancas
      // nao circula — nem internamente como "media de turma".
      if (l.n < PARAMS.MINIMO_CELULA) { suprimidas++; return null; }
      return l.media;
    }),
    n: ciclosVistos.map(c => linhas.find(x => x.ciclo_id === c.id && x.dimensao_id === d.id)?.n ?? 0),
  }));
  return { ciclos: ciclosVistos, series, suprimidas, minimo_celula: PARAMS.MINIMO_CELULA };
}

export function leituraDoCiclo(agg) {
  const ultima = i => agg.series[i].valores.at(-1);
  const idx = agg.series.map((_, i) => i).filter(i => ultima(i) != null);
  if (!idx.length) return { forcas: [], atencao: [] };
  const ord = idx.sort((a, b) => ultima(b) - ultima(a));
  return {
    forcas: ord.slice(0, 2).map(i => agg.series[i].dimensao),
    atencao: ord.slice(-2).map(i => agg.series[i].dimensao),
  };
}

// --------------------------------------------------------------------------
// F6 — safras e permanencia (analise de coorte sobre a presenca/matricula).
// Permanencia e' declarada como PROXY de vinculo, nunca como impacto.
// --------------------------------------------------------------------------
export function safras() {
  const marcos = [3, 6, 9, 12];
  const linhas = all(
    `SELECT m.id, m.entrada, m.saida, m.status, p.nome AS programa,
            CAST(substr(m.entrada,1,4) AS INTEGER) AS safra
       FROM matricula m JOIN programa p ON p.id = m.programa_id`);
  const anos = [...new Set(linhas.map(l => l.safra))].sort();
  const curvas = anos.map(ano => {
    const coorte = linhas.filter(l => l.safra === ano);
    // DENOMINADOR FIXO por safra. O cálculo anterior recalculava os elegíveis a
    // cada marco, e com isso os quatro pontos vinham de POPULAÇÕES diferentes —
    // ligadas por uma polyline na tela como se fossem uma curva só. O efeito
    // apareceu no dado: 80% aos 9 meses e **82% aos 12**, porque os 28 que já
    // tiveram tempo de chegar aos 12 meses eram uma turma melhor que os 49 que
    // chegaram aos 9. Permanência que SOBE é impossível dentro de uma coorte, e
    // este produto publica esta curva.
    //
    // Com a base fixa em quem já teve tempo de alcançar o marco mais profundo,
    // a monotonia passa a valer por construção: quem ficou 12 meses ficou 9.
    // O preço é declarado: a safra recente perde os matriculados novos do ponto
    // de 3 meses. `base` continua exposto para a tela dizer sobre quantos é.
    const alcancados = marcos.filter(mes => coorte.some(l => diasEntre(l.entrada, hoje()) >= mes * 30));
    const maisFundo = alcancados.at(-1) ?? null;
    const base = maisFundo == null ? []
      : coorte.filter(l => diasEntre(l.entrada, hoje()) >= maisFundo * 30);
    return {
      safra: ano, n: coorte.length, marco_mais_fundo: maisFundo,
      pontos: marcos.map(mes => {
        if (maisFundo == null || mes > maisFundo || !base.length) return { mes, pct: null, base: 0 };
        const ficaram = base.filter(l => !l.saida || diasEntre(l.entrada, l.saida) >= mes * 30);
        return { mes, pct: Math.round((ficaram.length / base.length) * 100), base: base.length };
      }),
    };
  });
  const porPrograma = all(
    `SELECT p.nome AS programa, COUNT(*) AS total,
            SUM(CASE WHEN m.status='encerrada' THEN 1 ELSE 0 END) AS sairam,
            ROUND(AVG(CASE WHEN m.saida IS NOT NULL
                      THEN julianday(m.saida) - julianday(m.entrada)
                      ELSE julianday('now') - julianday(m.entrada) END)) AS dias_medios
       FROM matricula m JOIN programa p ON p.id = m.programa_id
      GROUP BY p.id ORDER BY p.id`)
    .map(r => ({ ...r, evasao_pct: r.total ? Math.round((r.sairam / r.total) * 100) : 0,
                 meses_medios: Math.round((r.dias_medios / 30.4) * 10) / 10 }));
  return { marcos, curvas, porPrograma };
}

export function presencaMedia(mesIso = null) {
  const mes = mesIso || hoje().slice(0, 7);
  const r = get(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN p.status='P' THEN 1 ELSE 0 END) AS presentes
       FROM presenca p JOIN encontro e ON e.id = p.encontro_id
      WHERE substr(e.data,1,7) = ?`, mes);
  return { mes, total: r.total, presentes: r.presentes ?? 0,
           pct: r.total ? Math.round(((r.presentes ?? 0) / r.total) * 100) : null };
}

// --------------------------------------------------------------------------
// F7 — fecho do ciclo. Template contido: os numeros vem do SQL, nunca de
// geracao livre. O revisor de sobre-alegacao barra verbo causal forte.
// --------------------------------------------------------------------------
// Borda de palavra, nao substring: `gera ` com espaco deixava passar "...gera."
// no fim de frase (achado A-09 da revisao de 22/08/2026). Irrelevante enquanto o
// unico produtor de texto era o template do ciclo; virou risco quando o revisor
// passou a guardar tambem o relatorio do doador, que sai da organizacao.
const VERBOS_PROIBIDOS = [
  'gerou', 'gera', 'causou', 'causa', 'provou', 'prova que', 'comprova que',
  'garante', 'garantiu', 'resultou em', 'é responsável por', 'e responsavel por',
  'demonstra causalidade', 'em decorrência direta', 'em decorrencia direta',
  // Sem preposição no fim: em português ela se contrai com o artigo ("graças ao",
  // "por causa da") e a borda de palavra deixaria de casar.
  'graças', 'gracas', 'por causa', 'o impacto foi', 'transformou',
  // "contribuiu para" é atribuição causal atenuada — e era o buraco do revisor:
  // o próprio template do relatório passava por ele. O pack é explícito
  // (06-AGENTES-IA): escreve "crianças com maior presença apresentam", nunca
  // "o programa causou". Atenuar com "os dados sugerem" não muda a afirmação.
  'contribuiu', 'contribuíram', 'contribuiram', 'contribuem', 'contribui',
  'contribuição', 'contribuicao', 'contribuindo',
];
const REGEX_PROIBIDOS = VERBOS_PROIBIDOS.map(v =>
  new RegExp('(^|[^a-zà-ú])' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zà-ú])', 'i'));

export function revisarSobreAlegacao(texto) {
  const norm = (texto || '').toLowerCase();
  const achados = VERBOS_PROIBIDOS.filter((_, i) => REGEX_PROIBIDOS[i].test(norm));
  const temRessalva = /fatores externos n[aã]o foram isolados/i.test(texto || '');
  const notas = [];
  if (achados.length) notas.push(`Verbo causal forte encontrado: ${achados.join(', ')}.`);
  if (!temRessalva) notas.push('Falta a ressalva metodológica de não-isolamento de fatores externos.');
  return { status: achados.length || !temRessalva ? 'reprovado' : 'aprovado', notas };
}

export function numerosDoCiclo(cicloId, programaId = null) {
  const ciclo = get(`SELECT * FROM ciclo WHERE id = ?`, cicloId);
  if (!ciclo) throw erro(404, 'Ciclo não encontrado.');
  const filtro = programaId ? 'AND m.programa_id = ?' : '';
  const p = programaId ? [programaId] : [];

  // A-10: o denominador da cobertura publicada conta só programas no escopo —
  // a Vivência terapêutica (no_escopo=0) não entra, senão o percentual distorce
  // na síntese do ciclo e no painel da coordenação.
  const ativas = get(
    `SELECT COUNT(DISTINCT m.crianca_id) AS n FROM matricula m
       JOIN programa pr ON pr.id = m.programa_id
      WHERE m.status='ativa' AND pr.no_escopo = 1 ${filtro}`, ...p).n;
  const observadas = get(
    `SELECT COUNT(DISTINCT o.crianca_id) AS n FROM observacao o
      WHERE o.ciclo_id = ? AND o.status='concluida'
        ${programaId ? "AND o.crianca_id IN (SELECT crianca_id FROM matricula WHERE status='ativa' AND programa_id = ?)" : ''}`,
    cicloId, ...p).n;

  const agg = agregadoPorCiclo(programaId ? { programaId } : {});
  const anterior = get(
    `SELECT * FROM ciclo WHERE (ano < ? OR (ano = ? AND ordem < ?)) ORDER BY ano DESC, ordem DESC LIMIT 1`,
    ciclo.ano, ciclo.ano, ciclo.ordem);

  let subiram = 0, comparadas = 0, menor = null;
  for (const s of agg.series) {
    const iAtual = agg.ciclos.findIndex(c => c.id === cicloId);
    const iAnt = anterior ? agg.ciclos.findIndex(c => c.id === anterior.id) : -1;
    const va = iAtual >= 0 ? s.valores[iAtual] : null;
    const vp = iAnt >= 0 ? s.valores[iAnt] : null;
    if (va != null && vp != null) { comparadas++; if (va > vp) subiram++; }
    if (va != null && (menor === null || va < menor.valor)) menor = { dimensao: s.dimensao, valor: va };
  }

  const pres = presencaMedia();
  const alertasAbertos = get(`SELECT COUNT(*) AS n FROM alerta WHERE status <> 'resolvido'`).n;

  return {
    ciclo: ciclo.nome, ciclo_fim: ciclo.fim, ciclo_anterior: anterior?.nome ?? null,
    ativas, observadas,
    cobertura_pct: ativas ? Math.round((observadas / ativas) * 100) : 0,
    dimensoes_total: agg.series.length, dimensoes_comparadas: comparadas, dimensoes_subiram: subiram,
    menor_dimensao: menor?.dimensao ?? null, menor_media: menor?.valor ?? null,
    presenca_mes: pres.mes, presenca_pct: pres.pct, alertas_abertos: alertasAbertos,
    programa: programaId ? get(`SELECT nome FROM programa WHERE id = ?`, programaId).nome : 'todos os programas',
  };
}

// --------------------------------------------------------------------------
// Borda 2 da doutrina de IA ("consistência entre observadores") — versão
// DETERMINÍSTICA: compara, por dimensão, a média de cada educadora com a média
// geral do ciclo. É leitura de CALIBRAÇÃO do olhar para conversa de equipe —
// nunca ranking, nunca métrica de desempenho da educadora. Supressão de célula
// pequena vale aqui também: educadora com menos de MINIMO_CELULA observações
// na dimensão não aparece.
// --------------------------------------------------------------------------
export function calibracaoEntreObservadores(cicloId) {
  const LIMIAR = 0.75; // diferença de nível (escala 1-4) que merece conversa
  const porEducadora = all(
    `SELECT d.id AS dimensao_id, d.nome AS dimensao, e.id AS educador_id, e.apelido AS educadora,
            COUNT(*) AS n, ROUND(AVG(oi.nivel), 2) AS media
       FROM observacao_item oi
       JOIN observacao o ON o.id = oi.observacao_id AND o.status = 'concluida' AND o.ciclo_id = ?
       JOIN dimensao d ON d.id = oi.dimensao_id
       JOIN educador e ON e.id = o.educador_id
      GROUP BY d.id, e.id
     HAVING COUNT(*) >= ?
      ORDER BY d.ordem, e.id`, cicloId, PARAMS.MINIMO_CELULA);
  const geral = new Map(all(
    `SELECT d.id AS dimensao_id, ROUND(AVG(oi.nivel), 2) AS media, COUNT(*) AS n
       FROM observacao_item oi
       JOIN observacao o ON o.id = oi.observacao_id AND o.status = 'concluida' AND o.ciclo_id = ?
       JOIN dimensao d ON d.id = oi.dimensao_id
      GROUP BY d.id`, cicloId).map(g => [g.dimensao_id, g]));
  const linhas = porEducadora.map(l => {
    const g = geral.get(l.dimensao_id);
    const desvio = g ? Math.round((l.media - g.media) * 100) / 100 : null;
    return { ...l, media_geral: g?.media ?? null, desvio, divergente: desvio != null && Math.abs(desvio) >= LIMIAR };
  });
  return {
    limiar: LIMIAR,
    minimo_celula: PARAMS.MINIMO_CELULA,
    linhas,
    divergencias: linhas.filter(l => l.divergente),
    leitura: 'Leitura de calibração do olhar: onde duas educadoras enxergam a mesma dimensão de jeitos muito diferentes, o convite é calibrar juntas com as âncoras — nunca comparar desempenho.',
  };
}

export function redigirSintese(n) {
  const mesNome = new Date(n.presenca_mes + '-01T12:00:00Z')
    .toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  const partes = [];
  partes.push(
    `No ${n.ciclo}, ${n.observadas} das ${n.ativas} crianças ativas em ${n.programa} foram observadas (${n.cobertura_pct}%; janela aberta até ${dataBR(n.ciclo_fim)}).`);
  if (n.ciclo_anterior && n.dimensoes_comparadas) {
    partes.push(
      `Na comparação com o ${n.ciclo_anterior}, as médias de turma subiram em ${n.dimensoes_subiram} das ${n.dimensoes_comparadas} dimensões comparáveis.`);
  }
  if (n.menor_dimensao) {
    partes.push(
      `"${n.menor_dimensao}" segue como a menor média (${String(n.menor_media).replace('.', ',')} de 4) e orienta os planos de atividade do próximo período.`);
  }
  if (n.presenca_pct != null) {
    partes.push(`A presença média de ${mesNome} foi ${n.presenca_pct}%.`);
  }
  if (n.alertas_abertos) {
    partes.push(`${n.alertas_abertos} crianças acumulam ausências consecutivas e estão em acompanhamento ativo.`);
  }
  // Leitura de associação, nunca de causa — e a ressalva metodológica vem em
  // sentença PRÓPRIA, para que a trava do revisor não fique amarrada a uma
  // afirmação causal (era o que acontecia até 22/08/2026).
  partes.push(
    'As médias acima descrevem o que a equipe observou no período, não efeito medido do programa.');
  partes.push('A leitura é de associação: fatores externos não foram isolados.');
  return partes.join(' ');
}

export async function gerarSintese(cicloId, programaId = null) {
  const n = numerosDoCiclo(cicloId, programaId);
  const determinado = redigirSintese(n);
  // O modelo REDIGE; os números continuam vindo do SQL acima e são conferidos
  // um a um contra ele antes de o texto existir. Qualquer reprovação — número
  // que não bate, verbo causal, falha do modelo — cai neste `determinado`, que
  // é o texto que o produto sempre soube escrever. A aprovação humana da
  // coordenação continua exatamente onde estava.
  const r = await redigirComModelo({
    sistema: SISTEMA_REDATOR,
    pedido: `Este é o rascunho automático da síntese do ciclo, correto mas seco:\n\n"""${determinado}"""\n\n`
      + `Reescreva-o para a coordenação do instituto em 2 a 3 parágrafos curtos, com tom de quem `
      + `conta o ciclo para a equipe: frases simples, e o que cada número significa para as `
      + `crianças. MANTENHA exatamente os mesmos números, cada um ligado à mesma coisa a que já `
      + `está ligado, sem acrescentar nem remover nenhum.`,
    fatos: n, determinado, revisor: revisarSobreAlegacao, maxTokens: 700,
  });
  const texto = r.texto;
  const rev = revisarSobreAlegacao(texto);
  const existente = get(
    `SELECT * FROM sintese WHERE ciclo_id = ? AND programa_id IS ?`, cicloId, programaId ?? null);
  if (existente?.status === 'aprovada') {
    throw erro(422, 'Esta síntese já foi aprovada. Gere de novo apenas depois de reabrir o ciclo.');
  }
  run(`INSERT INTO sintese (ciclo_id, programa_id, texto, numeros_json, revisor_status, revisor_notas, status, gerado_em)
       VALUES (?,?,?,?,?,?, 'rascunho', ?)
       ON CONFLICT(ciclo_id, programa_id) DO UPDATE SET
         texto=excluded.texto, numeros_json=excluded.numeros_json,
         revisor_status=excluded.revisor_status, revisor_notas=excluded.revisor_notas,
         status='rascunho', gerado_em=excluded.gerado_em, aprovado_por=NULL, aprovado_em=NULL`,
      cicloId, programaId ?? null, texto, JSON.stringify({ ...n, _origem: r.origem, _rotulo: r.rotulo, _motivo: r.motivo ?? null, _texto_automatico: determinado }),
      rev.status, rev.notas.join(' '), agora());
  return { ...sinteseDe(cicloId, programaId), origem: r.origem, rotulo: r.rotulo, motivo: r.motivo ?? null };
}

export function sinteseDe(cicloId, programaId = null) {
  const s = get(`SELECT * FROM sintese WHERE ciclo_id = ? AND programa_id IS ?`, cicloId, programaId ?? null);
  if (!s) return null;
  return { ...s, numeros: JSON.parse(s.numeros_json) };
}

export function aprovarSintese(cicloId, programaId, educadorId) {
  const educador = get(`SELECT * FROM educador WHERE id = ?`, educadorId);
  if (!educador) throw erro(404, 'Usuário não encontrado.');
  if (educador.papel !== 'coordenacao') throw erro(403, 'Somente a coordenação aprova e libera a síntese do ciclo.');
  const s = get(`SELECT * FROM sintese WHERE ciclo_id = ? AND programa_id IS ?`, cicloId, programaId ?? null);
  if (!s) throw erro(404, 'Não há síntese gerada para este ciclo.');
  if (s.revisor_status !== 'aprovado') throw erro(422, 'O revisor de sobre-alegação reprovou o texto. Corrija antes de liberar.');
  run(`UPDATE sintese SET status='aprovada', aprovado_por=?, aprovado_em=? WHERE id = ?`,
      educadorId, agora(), s.id);
  return sinteseDe(cicloId, programaId);
}

// --------------------------------------------------------------------------
// Fecho de ciclo — executa a retencao declarada em `governanca_campo`.
// O campo livre saiu do produto na v2 (ver salvarObservacao), mas a coluna
// permanece no esquema por compatibilidade; fechar o ciclo e' o mecanismo que
// cumpre a retencao "descarte ao fim do ciclo" para qualquer valor legado.
// Fecha o achado A-05 da revisao arquitetural de 22/08/2026.
// --------------------------------------------------------------------------
export function fecharCiclo(cicloId, usuarioId, { abrirProximo = false } = {}) {
  const u = get(`SELECT * FROM educador WHERE id = ?`, usuarioId);
  if (!u) throw erro(404, 'Usuário não encontrado.');
  if (u.papel !== 'coordenacao') throw erro(403, 'Somente a coordenação fecha o ciclo de observação.');
  const ciclo = get(`SELECT * FROM ciclo WHERE id = ?`, cicloId);
  if (!ciclo) throw erro(404, 'Ciclo não encontrado.');
  if (ciclo.status === 'fechado') throw erro(422, 'Este ciclo já está fechado.');

  return tx(() => {
    const comTexto = get(
      `SELECT COUNT(*) AS n FROM observacao WHERE ciclo_id = ? AND nota_livre IS NOT NULL`, cicloId).n;
    run(`UPDATE observacao SET nota_livre = NULL WHERE ciclo_id = ?`, cicloId);
    run(`UPDATE ciclo SET status = 'fechado' WHERE id = ?`, cicloId);

    let proximo = null;
    if (abrirProximo) {
      const ordem = ciclo.ordem + 1;
      const inicio = addDias(ciclo.fim, 1);
      const fim = addDias(inicio, 40);
      const mes = new Date(inicio + 'T12:00:00Z')
        .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
      run(`INSERT INTO ciclo (nome, ano, ordem, inicio, fim, status) VALUES (?,?,?,?,?, 'aberto')`,
          `Ciclo ${ordem} · ${mes}`, Number(inicio.slice(0, 4)), ordem, inicio, fim);
      proximo = get(`SELECT * FROM ciclo WHERE ano = ? AND ordem = ?`, Number(inicio.slice(0, 4)), ordem);
    }
    marcarAtividade(usuarioId, 'fecho_ciclo');
    return { ciclo: get(`SELECT * FROM ciclo WHERE id = ?`, cicloId), notas_descartadas: comTexto, proximo };
  });
}

// --------------------------------------------------------------------------
// Anti-abandono ("what the hell effect" no sentido de Ariely):
// nenhum lapso vira falha; o sistema reconhece a ausencia e oferece retomada.
// --------------------------------------------------------------------------
export function marcarAtividade(educadorId, tipo) {
  run(`INSERT INTO atividade (educador_id, data, tipo) VALUES (?,?,?)`, educadorId, hoje(), tipo);
}

export function estadoDeRetomada(educadorId) {
  const ultima = get(
    `SELECT MAX(data) AS d FROM atividade WHERE educador_id = ? AND data < ?`, educadorId, hoje())?.d;
  const hojeJa = get(
    `SELECT COUNT(*) AS n FROM atividade WHERE educador_id = ? AND data = ?`, educadorId, hoje()).n > 0;
  const dias = ultima ? diasEntre(ultima, hoje()) : null;
  const emLapso = dias != null && dias >= PARAMS.DIAS_LAPSO;
  return {
    ultima_atividade: ultima, dias_sem_registro: dias, registrou_hoje: hojeJa, em_lapso: emLapso,
    mensagem: emLapso
      ? `Você ficou ${dias} dias sem registrar. Nada se perdeu — os registros anteriores continuam aqui e as datas em aberto seguem disponíveis.`
      : null,
  };
}

// Erro de dominio com status HTTP e payload extra ------------------------------
export function erro(status, mensagem, extra = {}) {
  const e = new Error(mensagem);
  e.status = status;
  e.extra = extra;
  return e;
}

// --------------------------------------------------------------------------
// F1 — ficha viva da crianca. Um lugar so, com a trajetoria visivel.
// --------------------------------------------------------------------------
export function fichaCrianca(criancaId) {
  const c = get(`SELECT * FROM crianca WHERE id = ?`, criancaId);
  if (!c) throw erro(404, 'Criança não encontrada.');
  const matriculas = all(
    `SELECT m.*, p.nome AS programa, t.nome AS turma FROM matricula m
       JOIN programa p ON p.id = m.programa_id
       LEFT JOIN turma t ON t.id = m.turma_id
      WHERE m.crianca_id = ? ORDER BY m.entrada`, criancaId);
  const presencas = all(
    `SELECT e.data, p.status FROM presenca p JOIN encontro e ON e.id = p.encontro_id
      WHERE p.crianca_id = ? ORDER BY e.data DESC LIMIT 15`, criancaId).reverse();
  const totalPres = get(
    `SELECT COUNT(*) t, SUM(CASE WHEN status='P' THEN 1 ELSE 0 END) p
       FROM presenca WHERE crianca_id = ?`, criancaId);
  const consentimentos = all(`SELECT * FROM governanca_campo ORDER BY rowid`)
    .map(g => { const { gov, ...r } = consentimentoDe(criancaId, g.campo); return { ...g, ...r }; });
  const idade = Math.floor(diasEntre(c.nascimento, hoje()) / 365.25);
  const aspiracoes = all(
    `SELECT area, declarada_em FROM aspiracao WHERE crianca_id = ? ORDER BY declarada_em DESC`, criancaId);
  return {
    crianca: { ...c, idade, aspiracao: aspiracoes[0]?.area ?? null },
    aspiracoes,
    matriculas, presencas,
    presenca_pct: totalPres.t ? Math.round(((totalPres.p ?? 0) / totalPres.t) * 100) : null,
    ausencias_consecutivas: ausenciasConsecutivas(criancaId).n,
    trajetoria: trajetoriaCrianca(criancaId),
    consentimentos,
    alerta: get(`SELECT * FROM alerta WHERE crianca_id = ? AND status <> 'resolvido'`, criancaId) ?? null,
  };
}

export function listarCriancas({ q = '', turmaId = null, programaId = null, educadorId = null, limite = 60 } = {}) {
  const termo = `%${(q || '').trim().toLowerCase()}%`;
  const cond = [`c.ativo = 1`, `m.status = 'ativa'`];
  const p = [];
  if (q) { cond.push(`(lower(c.nome) LIKE ? OR lower(c.codigo) LIKE ?)`); p.push(termo, termo); }
  if (turmaId) { cond.push(`m.turma_id = ?`); p.push(turmaId); }
  if (programaId) { cond.push(`m.programa_id = ?`); p.push(programaId); }
  // Escopo de turma (A4): educadora enxerga só as crianças das próprias turmas.
  if (educadorId) {
    cond.push(`m.turma_id IN (SELECT id FROM turma WHERE educador_id = ?)`);
    p.push(educadorId);
  }
  const where = cond.join(' AND ');
  // A-13: o corte de 60 era silencioso; o total permite a tela declarar
  // "mostrando X de N" e apontar a busca.
  const total = get(
    `SELECT COUNT(DISTINCT c.id) AS n
       FROM crianca c JOIN matricula m ON m.crianca_id = c.id
      WHERE ${where}`, ...p).n;
  const criancas = all(
    `SELECT DISTINCT c.id, c.codigo, c.nome,
            (SELECT GROUP_CONCAT(p2.nome, ' · ') FROM matricula m2
               JOIN programa p2 ON p2.id = m2.programa_id
              WHERE m2.crianca_id = c.id AND m2.status='ativa') AS programas
       FROM crianca c JOIN matricula m ON m.crianca_id = c.id
      WHERE ${where}
      ORDER BY c.nome LIMIT ?`, ...p, limite);
  return { criancas, total, limite };
}

export function painelConsentimentos() {
  const linhas = all(
    `SELECT c.id, c.codigo, c.nome, co.campo, co.status, co.responsavel, co.data_registro
       FROM crianca c
       JOIN matricula m ON m.crianca_id = c.id AND m.status='ativa'
       JOIN consentimento co ON co.crianca_id = c.id
      WHERE c.ativo = 1 AND co.campo = 'rubrica_socioemocional'
      GROUP BY c.id ORDER BY (co.status='ativo'), c.nome`);
  return {
    ativos: linhas.filter(l => l.status === 'ativo').length,
    pendentes: linhas.filter(l => l.status !== 'ativo').length,
    governanca: all(`SELECT * FROM governanca_campo ORDER BY rowid`),
    linhas,
  };
}

export function painelCoordenacao() {
  const inv = inventario();
  const ciclo = cicloAberto() ?? all(`SELECT * FROM ciclo ORDER BY ano DESC, ordem DESC LIMIT 1`)[0];
  const n = numerosDoCiclo(ciclo.id);
  const programas = inv.porPrograma.filter(p => p.no_escopo).map(p => {
    const ativas = get(
      `SELECT COUNT(DISTINCT crianca_id) x FROM matricula WHERE status='ativa' AND programa_id = ?`, p.id).x;
    const obs = get(
      `SELECT COUNT(DISTINCT o.crianca_id) x FROM observacao o
        WHERE o.ciclo_id = ? AND o.status='concluida'
          AND o.crianca_id IN (SELECT crianca_id FROM matricula WHERE status='ativa' AND programa_id = ?)`,
      ciclo.id, p.id).x;
    return { ...p, ativas, observadas: obs, cobertura: ativas ? Math.round((obs / ativas) * 100) : 0 };
  });
  return {
    inventario: inv, ciclo, numeros: n,
    presenca: presencaMedia(),
    alertas: alertas(),
    programas,
    foraDeEscopo: inv.porPrograma.filter(p => !p.no_escopo),
    agregado: agregadoPorCiclo(),
  };
}

// --------------------------------------------------------------------------
// Promessa de tempo — o custo real do registro, medido.
// E' a metrica do experimento de validacao do modulo: sucesso = media < 2 min.
// --------------------------------------------------------------------------
export function tempoDeRegistro({ turmaId = null } = {}) {
  const filtro = turmaId ? 'AND turma_id = ?' : '';
  const p = turmaId ? [turmaId] : [];
  const r = get(
    `SELECT COUNT(*) AS n, ROUND(AVG(duracao_segundos)) AS media,
            SUM(CASE WHEN duracao_segundos <= ? THEN 1 ELSE 0 END) AS dentro
       FROM encontro WHERE duracao_segundos IS NOT NULL ${filtro}`,
    PARAMS.META_REGISTRO_SEGUNDOS, ...p);
  return {
    meta_segundos: PARAMS.META_REGISTRO_SEGUNDOS,
    registros: r.n,
    media_segundos: r.media ?? null,
    pct_dentro_da_meta: r.n ? Math.round(((r.dentro ?? 0) / r.n) * 100) : null,
  };
}

// --------------------------------------------------------------------------
// Reconciliacao dos dados divergentes — a entrega (d) da semana 5 como tela.
// Cada fonte declara o que media; a leitura adotada resolve a divergencia.
// --------------------------------------------------------------------------
export function reconciliacao() {
  const inv = inventario();
  const atendimentosSemana = get(
    `SELECT COUNT(*) AS n FROM presenca p JOIN encontro e ON e.id = p.encontro_id
      WHERE p.status = 'P' AND e.data >= date('now', '-7 day')`).n;
  return {
    decisao: 'A criança é a entidade; a matrícula é a relação criança × programa × período. ' +
             'Nenhuma afirmação de impacto é verificável antes dessa separação.',
    fontes: [
      {
        fonte: 'Dossiê, bloco 3 (reunião de alinhamento)',
        valor: '120 crianças [provisório]',
        media: 'Somava vagas por programa (60+40+20) — sem resolver sobreposição de faixas.',
        leitura: `${inv.matriculas} matrículas ativas — o "120" era matrícula, não criança.`,
      },
      {
        fonte: 'Planilha de presença (importada como está)',
        valor: `${inv.cobertura.presencas} marcações de presença`,
        media: 'Comparecimentos por encontro — fluxo, nunca denominador de pessoas.',
        leitura: `${atendimentosSemana} atendimentos nos últimos 7 dias, mantidos como série de fluxo.`,
      },
      {
        fonte: 'Percurso (modelo de dados)',
        valor: `${inv.criancasUnicas} crianças únicas · ${inv.matriculas} matrículas`,
        media: 'Criança como dimensão; matrícula como fato.',
        leitura: `${inv.multi} crianças estão em 2 programas — é exatamente a diferença entre as contagens.`,
      },
    ],
  };
}

// --------------------------------------------------------------------------
// Plano da próxima semana — a devolução que fecha o ciclo de reciprocidade.
// Deterministico por construcao: o foco vem da menor media da turma, a
// atividade vem de um banco fixo por dimensao, o radar vem dos alertas.
// Nenhum item nasce de modelo (doutrina: escore e plano nascem de regra).
// --------------------------------------------------------------------------
const BANCO_ATIVIDADES = {
  AUTOC: [
    { titulo: 'Combinados da semana no quadro', descricao: 'A turma escreve os 3 combinados da semana; quem lembra um combinado em ação ganha o registro no mural.', duracao: '15–20 min' },
    { titulo: 'Jogo da espera com sinal', descricao: 'Atividade em turnos com um sinal combinado para "minha vez / sua vez" — a regra vira gesto, e o gesto vira autocontrole.', duracao: '20–30 min' },
  ],
  CONV: [
    { titulo: 'Duplas sorteadas com missão conjunta', descricao: 'Cada dupla recebe uma tarefa que só fecha com as duas partes — a apresentação é da dupla, não de cada um.', duracao: '25–35 min' },
    { titulo: 'Jogo cooperativo de construção', descricao: 'Uma construção coletiva onde cada criança tem uma peça obrigatória — não há como terminar sozinho.', duracao: '30–40 min' },
  ],
  PART: [
    { titulo: 'Roteiro visível de 3 passos', descricao: 'A atividade do dia vem com roteiro ilustrado de 3 passos no quadro — a criança consulta antes de pedir ajuda e sabe onde a atividade termina.', duracao: '30–40 min' },
    { titulo: 'Papéis rotativos na roda', descricao: 'Cada encontro, papéis diferentes (quem abre, quem cronometra, quem fecha) — a criança que costuma sair antes do fim ganha um motivo para ficar.', duracao: '20–30 min' },
  ],
  EXPR: [
    { titulo: 'Roda de nomear emoções', descricao: 'Com cartas de emoções, cada criança escolhe a do dia e conta em uma frase o porquê — sem comentário avaliativo da roda.', duracao: '20–30 min' },
    { titulo: 'Termômetro da emoção na entrada', descricao: 'Painel na porta: cada criança marca como chega. A educadora só observa o padrão da semana.', duracao: '5 min por encontro' },
  ],
  AUTOEST: [
    { titulo: 'Galeria do que eu fiz', descricao: 'Cada criança escolhe uma produção da semana para a parede e diz uma frase sobre o que gostou nela — a roda só escuta.', duracao: '15–20 min' },
    { titulo: 'Oficina com produto final', descricao: 'Costura, marcenaria simples ou colagem: uma tarefa com começo, meio e um objeto no fim, para o "nossa, eu consegui" ter onde acontecer.', duracao: '40–60 min' },
  ],
  RESIL: [
    { titulo: 'Desafio com duas tentativas', descricao: 'Tarefa deliberadamente difícil com regra explícita: a primeira tentativa não vale nota, vale aprendizado.', duracao: '30–45 min' },
    { titulo: 'Mural do "ainda não"', descricao: 'O que a criança ainda não conseguiu vai ao mural com a palavra "ainda" — e sai quando conseguir.', duracao: '15 min por encontro' },
  ],
};

export function planoDaTurma(turmaId) {
  const turma = get(
    `SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id = t.programa_id WHERE t.id = ?`, turmaId);
  if (!turma) throw erro(404, 'Turma não encontrada.');

  // 1 · Radar: criancas da turma com alerta de ausencia nao resolvido.
  const radar = all(
    `SELECT a.id AS alerta_id, a.status, a.detalhe, c.id AS crianca_id, c.nome, c.codigo
       FROM alerta a JOIN crianca c ON c.id = a.crianca_id
      WHERE a.status <> 'resolvido'
        AND a.crianca_id IN (SELECT crianca_id FROM matricula WHERE turma_id = ? AND status='ativa')
      ORDER BY a.status, c.nome`, turmaId);

  // 2 · Foco pedagogico: a dimensao com menor media no ciclo mais recente da turma,
  //     desempatada pela que MENOS avancou entre ciclos.
  const agg = agregadoPorCiclo({ turmaId });
  let foco = null;
  const candidatas = agg.series
    .map(s => ({ dimensao: s.dimensao, atual: s.valores.at(-1), anterior: s.valores.at(-2) ?? null }))
    .filter(c => c.atual != null)
    .sort((a, b) => a.atual - b.atual ||
      ((a.anterior == null ? 0 : a.atual - a.anterior) - (b.anterior == null ? 0 : b.atual - b.anterior)));
  if (candidatas.length) {
    const c = candidatas[0];
    const dim = get(`SELECT codigo FROM dimensao WHERE nome = ?`, c.dimensao);
    const banco = BANCO_ATIVIDADES[dim?.codigo] ?? [];
    // Alterna a atividade pela semana do ano — variedade sem aleatoriedade.
    const semana = Math.floor(diasEntre(get(`SELECT MIN(inicio) AS d FROM ciclo`).d ?? hoje(), hoje()) / 7);
    foco = {
      dimensao: c.dimensao,
      media_atual: c.atual,
      media_anterior: c.anterior,
      justificativa: c.anterior != null
        ? `Menor média da turma (${String(c.atual).replace('.', ',')} de 4) e avanço de ${String(Math.round((c.atual - c.anterior) * 100) / 100).replace('.', ',')} entre ciclos.`
        : `Menor média da turma (${String(c.atual).replace('.', ',')} de 4) no ciclo atual.`,
      atividade: banco.length ? banco[semana % banco.length] : null,
    };
  }

  // 3 · Ganchos de aspiracao: criancas da turma com aspiracao declarada no
  //     Laboratorio de Sonhos — repertorio para conectar a atividade ao sonho.
  const ganchos = all(
    `SELECT a.area AS area, COUNT(DISTINCT c.id) AS n,
            GROUP_CONCAT(c.nome, ' · ') AS criancas
       FROM crianca c
       JOIN matricula m ON m.crianca_id = c.id AND m.turma_id = ? AND m.status = 'ativa'
       JOIN aspiracao a ON a.crianca_id = c.id
      WHERE c.ativo = 1
      GROUP BY a.area ORDER BY n DESC, area`, turmaId);

  return {
    turma: { id: turma.id, nome: turma.nome, programa: turma.programa },
    gerado_em: hoje(),
    doutrina: 'Plano gerado por regra fixa a partir dos registros — nenhum item nasce de modelo.',
    radar, foco, ganchos,
  };
}

// --------------------------------------------------------------------------
// CADASTRO DE PESSOAS — equipe e criancas.
//
// Ate aqui, toda pessoa do Percurso nascia da seed (equipe e 132 criancas) ou
// da ingestao de planilha (so criancas, e so em lote). Item 2.8 do horizonte
// de ARQUITETURA.md: "cadastro real substitui a seed". Isto e' a porta manual
// desse item — uma pessoa por vez, com as mesmas guardas que a ingestao ja
// tinha que respeitar.
//
// TRES DECISOES QUE VALEM O COMENTARIO:
//
//  1. Quem cadastra e' a COORDENACAO, nao a professora. Nao e' burocracia: o
//     papel decide o que a pessoa enxerga (escopo de turma, A4) e a matricula
//     decide de quem e' a ficha que abre. Deixar isso na mao de quem registra
//     a chamada seria deixar o controle de acesso na mao de quem ele limita.
//
//  2. Consentimento nasce PENDENTE, sempre. A crianca entra no sistema pela
//     presenca (legitimo interesse) e NAO fica observavel no mesmo ato: quem
//     libera a rubrica socioemocional e' o responsavel, num segundo gesto, na
//     tela de consentimentos. Sem as duas linhas 'pendente' aqui, a crianca
//     nova ficaria invisivel naquela tela (o JOIN e' interno) — bloqueada de
//     fato e sem caminho para desbloquear, que e' o pior dos dois mundos.
//
//  3. Homonimo e' recusado, nao gravado. O erro mais caro deste banco nao e'
//     faltar crianca: e' a MESMA crianca virar duas, porque dai a serie de
//     presenca se parte em duas e nenhum numero do relatorio fecha. A ingestao
//     ja paga esse preco com deduplicacao por nome+nascimento (03-AUDITORIA-V2,
//     R2-05); o cadastro manual usa a mesma chave e devolve 409 com o id do
//     que ja existe, para a tela poder oferecer "abrir a ficha dela".
// --------------------------------------------------------------------------

/** Rotulos dos papeis — a mesma tabela que o cliente pinta, servida daqui
 *  para nao existirem duas listas de papel valido no produto. */
export const PAPEIS = [
  { id: 'educador',     rotulo: 'Professora',  nota: 'Registra chamada e observação das próprias turmas — e só delas.' },
  // Campo (29/08/2026): quem nomeia a dor do registro é a psicóloga. Ela entra
  // pelo INDICADOR DE PROGRAMA (presença, registro de vivência, check-in de
  // grupo) — o conteúdo clínico continua fora por construção (decisão 31).
  { id: 'profissional', rotulo: 'Psicóloga',   nota: 'Conduz a vivência: chamada e registro de turma (procedimento e check-in de grupo) — nunca conteúdo clínico, nunca rubrica individual.' },
  { id: 'coordenacao',  rotulo: 'Coordenação', nota: 'Vê todas as turmas, cadastra pessoas e trata consentimento.' },
  { id: 'diretoria',    rotulo: 'Diretoria',   nota: 'Só a camada agregada — não abre ficha individual de criança.' },
];
const PAPEL_VALIDO = new Set(PAPEIS.map(p => p.id));
/** Papéis que ficam responsáveis por turma (e por isso têm escopo de turma). */
export const PAPEIS_COM_TURMA = new Set(['educador', 'profissional']);
export const rotuloDoPapel = (papel) => PAPEIS.find(p => p.id === papel)?.rotulo?.toLowerCase() ?? papel;

/** Campos que exigem consentimento E são coletados pelo Percurso. `conteudo_clinico`
 *  também exige, mas está declarado FORA do sistema por construção — abrir linha
 *  'pendente' para ele sugeriria que um dia vai ser coletado. Não vai. */
const CONSENTIMENTOS_DA_MATRICULA = ['rubrica_socioemocional', 'campo_livre'];

function textoObrigatorio(v, campo, max = 120) {
  const t = String(v ?? '').trim().replace(/\s+/g, ' ');
  if (!t) throw erro(422, `${campo} é obrigatório.`);
  if (t.length > max) throw erro(422, `${campo} passa de ${max} caracteres.`);
  return t;
}

function dataObrigatoria(v, campo) {
  const t = String(v ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t))
    throw erro(422, `${campo} precisa vir no formato dia/mês/ano.`);
  // Ida e volta, e não só `Date.parse`: ele ACEITA 2026-02-30 e o rola para
  // 02/03 em silêncio. A data inexistente entraria no banco e a idade passaria
  // a ser calculada de um dia que a pessoa não digitou.
  const d = new Date(t + 'T12:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t)
    throw erro(422, `${campo} não existe no calendário.`);
  return t;
}

/** Próximo `EBZ-NNNN`. MAX do sufixo, não COUNT: o código é UNIQUE e uma
 *  criança removida do banco faria COUNT+1 repetir um código já emitido. */
export function proximoCodigoCrianca() {
  const r = get(
    `SELECT MAX(CAST(substr(codigo, 5) AS INTEGER)) AS n FROM crianca WHERE codigo LIKE 'EBZ-____'`);
  return 'EBZ-' + String((r?.n ?? 0) + 1).padStart(4, '0');
}

/** "Maria Silvia" -> "Maria S." — o apelido é o que aparece no cabeçalho e em
 *  todo registro; ninguém precisa inventar um na hora de cadastrar. */
function apelidoDe(nome) {
  const [primeiro, ...resto] = nome.split(' ');
  return resto.length ? `${primeiro} ${resto.at(-1)[0].toUpperCase()}.` : primeiro;
}

export function listarEquipe() {
  // Só quem está na ativa. Quem foi para o arquivo continua no banco e some
  // daqui — é a diferença inteira entre arquivar e apagar.
  return all(
    `SELECT e.id, e.nome, e.apelido, e.papel,
            (SELECT GROUP_CONCAT(t.nome, ' · ') FROM turma t WHERE t.educador_id = e.id) AS turmas
       FROM educador e
      WHERE e.arquivado_em IS NULL
      ORDER BY CASE e.papel WHEN 'diretoria' THEN 0 WHEN 'coordenacao' THEN 1 ELSE 2 END, e.nome`);
}

/**
 * Cadastra alguém da equipe. `turmaId` só vale para professora.
 * Turma que já tem professora só troca com `confirmarTroca` — a troca move o
 * escopo de leitura das crianças daquela turma de uma pessoa para outra, e isso
 * é decisão, não efeito colateral de um `select` mal clicado.
 */
export function criarPessoa({ nome, apelido = '', papel, turmaId = null, confirmarTroca = false }) {
  const n = textoObrigatorio(nome, 'O nome');
  if (!PAPEL_VALIDO.has(papel))
    throw erro(422, 'Escolha o papel: professora, psicóloga, coordenação ou diretoria.');
  const a = String(apelido ?? '').trim().replace(/\s+/g, ' ').slice(0, 60) || apelidoDe(n);

  const igual = get(
    `SELECT id, nome, arquivado_em FROM educador WHERE lower(nome) = lower(?) AND papel = ?`, n, papel);
  if (igual)
    throw erro(409, igual.arquivado_em
      ? `${igual.nome} está no arquivo desde ${dataBR(igual.arquivado_em)}. Traga de volta em vez de cadastrar de novo — assim o que ela registrou continua ligado a ela.`
      : `${igual.nome} já está cadastrada com este papel.`,
      { educador_id: igual.id, no_arquivo: !!igual.arquivado_em });

  let turma = null;
  if (turmaId != null) {
    if (!PAPEIS_COM_TURMA.has(papel))
      throw erro(422, 'Só professora ou psicóloga fica responsável por turma. Coordenação e diretoria enxergam todas.');
    turma = get(
      `SELECT t.id, t.nome, t.educador_id, e.nome AS educador_atual
         FROM turma t LEFT JOIN educador e ON e.id = t.educador_id WHERE t.id = ?`, turmaId);
    if (!turma) throw erro(404, 'Turma não encontrada.');
    if (turma.educador_id && !confirmarTroca)
      throw erro(409,
        `A turma ${turma.nome} é de ${turma.educador_atual}. Confirmar a troca passa as crianças dessa turma para ${n} — e tira de ${turma.educador_atual}.`,
        { exige_confirmacao: 'troca_de_turma', turma_id: turma.id, educador_atual: turma.educador_atual });
  }

  return tx(() => {
    const id = Number(run(
      `INSERT INTO educador (nome, apelido, papel) VALUES (?,?,?)`, n, a, papel).lastInsertRowid);
    if (turma) run(`UPDATE turma SET educador_id = ? WHERE id = ?`, id, turma.id);
    return {
      pessoa: get(`SELECT * FROM educador WHERE id = ?`, id),
      turma: turma ? { id: turma.id, nome: turma.nome } : null,
      substituiu: turma?.educador_atual ?? null,
    };
  });
}

/**
 * Cadastra uma criança e a matrícula ativa que a põe numa turma. Os dois num
 * `tx` só: criança sem matrícula não aparece em lista nenhuma (todo `listar`
 * deste domínio faz JOIN com matrícula ativa) — seria um registro fantasma.
 */
export function criarCrianca({ nome, nascimento, responsavel, programaId, turmaId = null, entrada = null }) {
  const n = textoObrigatorio(nome, 'O nome da criança');
  const resp = textoObrigatorio(responsavel, 'O responsável');
  const nasc = dataObrigatoria(nascimento, 'A data de nascimento');
  const hj = hoje();
  if (nasc > hj) throw erro(422, 'A data de nascimento está no futuro.');
  const idade = Math.floor(diasEntre(nasc, hj) / 365.25);
  if (idade > 21)
    throw erro(422, `A data de nascimento dá ${idade} anos. Confira — o Percurso atende crianças e adolescentes.`);

  const { programa, turma } = programaETurma(programaId, turmaId);

  const ent = entrada ? dataObrigatoria(entrada, 'A data de entrada') : hj;
  if (ent > hj) throw erro(422, 'A data de entrada está no futuro.');
  if (ent < nasc) throw erro(422, 'A data de entrada é anterior ao nascimento.');

  // Mesma chave forte da ingestão: primeiro nome + nascimento não bastava lá e
  // não basta aqui — o nome inteiro mais a data é o que separa dois irmãos.
  const igual = get(
    `SELECT id, codigo, nome FROM crianca WHERE lower(nome) = lower(?) AND nascimento = ?`, n, nasc);
  if (igual)
    throw erro(409, `${igual.nome} (${igual.codigo}) já está no cadastro com essa data de nascimento.`,
      { crianca_id: igual.id, codigo: igual.codigo });

  return tx(() => {
    const codigo = proximoCodigoCrianca();
    const id = Number(run(
      `INSERT INTO crianca (codigo, nome, nascimento, responsavel, ativo, criado_em)
       VALUES (?,?,?,?,1,?)`, codigo, n, nasc, resp, hj).lastInsertRowid);
    run(`INSERT INTO matricula (crianca_id, programa_id, turma_id, entrada, saida, status)
         VALUES (?,?,?,?,NULL,'ativa')`, id, programa.id, turma?.id ?? null, ent);
    for (const campo of CONSENTIMENTOS_DA_MATRICULA)
      run(`INSERT INTO consentimento (crianca_id, campo, status, responsavel, data_registro)
           VALUES (?,?, 'pendente', NULL, NULL)`, id, campo);
    return {
      crianca: get(`SELECT * FROM crianca WHERE id = ?`, id),
      programa: { id: programa.id, nome: programa.nome },
      turma: turma ? { id: turma.id, nome: turma.nome } : null,
      consentimentos_pendentes: CONSENTIMENTOS_DA_MATRICULA.length,
      aviso: 'Presença já pode ser registrada. A rubrica socioemocional fica bloqueada até o responsável consentir — a criança já aparece na tela de Consentimentos.',
    };
  });
}

// --------------------------------------------------------------------------
// ARQUIVO — ninguem e' apagado deste banco.
//
// Quem sai do pipeline (professora que deixa o instituto, crianca que sai do
// programa) vai para o ARQUIVO: some das listas vivas, continua existindo, e
// pode voltar. Nao existe DELETE de pessoa em lugar nenhum deste produto.
//
// POR QUE NAO E' SO' UMA PREFERENCIA DE INTERFACE:
//
//  · O registro fica em pe' e assinado. `observacao.educador_id` e
//    `encontro.registrado_por` sao NOT NULL / FK: apagar a professora
//    arrastaria ou orfanaria tudo que ela registrou, e o relatorio do doador
//    e' construido em cima desses registros. Quem escreveu continua sendo
//    quem escreveu.
//  · A crianca que sai E' o dado. Safras, permanencia e evasao (F6) medem
//    exatamente a saida — uma crianca apagada nao evade, ela nunca existiu, e
//    a curva de permanencia mentiria para cima.
//  · A crianca arquivada continua PROTEGIDA. `nomesParaAnonimizar` nao filtra
//    por `ativo` de proposito (SEGURANCA-IA-02): quem saiu e' justamente
//    assunto de conversa, e o nome dela nao pode chegar ao modelo.
//
// A crianca ja tinha a metade da mecanica desde a v1 (`crianca.ativo` mais
// `matricula.saida`, que a seed usa nas 26 que sairam). O que faltava era o
// GESTO — e a equipe, que nao tinha nem a coluna.
// --------------------------------------------------------------------------

/** Programa e turma de uma matrícula, validados juntos. Extraído porque
 *  matricular pela primeira vez e rematricular quem voltou têm que recusar
 *  exatamente as mesmas coisas. */
function programaETurma(programaId, turmaId) {
  const programa = get(`SELECT * FROM programa WHERE id = ?`, programaId);
  if (!programa) throw erro(404, 'Programa não encontrado.');
  // A Vivência terapêutica está declarada FORA do escopo de medição (o
  // percentual de cobertura a exclui de propósito). Matricular por aqui criaria
  // criança num programa que nenhuma tela deste produto sabe ler.
  if (!programa.no_escopo)
    throw erro(422, `${programa.nome} está fora do escopo do Percurso. ${programa.nota ?? ''}`.trim());

  let turma = null;
  if (turmaId != null) {
    turma = get(`SELECT * FROM turma WHERE id = ?`, turmaId);
    if (!turma) throw erro(404, 'Turma não encontrada.');
    if (turma.programa_id !== programa.id)
      throw erro(422, `A turma ${turma.nome} não é do programa ${programa.nome}.`);
  }
  return { programa, turma };
}

/**
 * Arquiva alguém da equipe. Duas recusas que existem para o sistema não se
 * trancar por fora: ninguém se arquiva (senão a pessoa perde a sessão no ato,
 * sem ninguém para desfazer) e a última coordenação na ativa não sai — sem ela
 * não há quem cadastre a substituta nem quem traga alguém de volta.
 */
export function arquivarPessoa(id, { porUsuarioId = null, assumidaPor = null } = {}) {
  const p = get(`SELECT * FROM educador WHERE id = ?`, id);
  if (!p) throw erro(404, 'Pessoa não encontrada.');
  if (p.arquivado_em)
    throw erro(409, `${p.nome} já está no arquivo desde ${dataBR(p.arquivado_em)}.`);
  if (porUsuarioId != null && Number(porUsuarioId) === Number(id))
    throw erro(422, 'Quem arquiva não pode ser quem sai. Peça a outra pessoa da coordenação — assim ninguém se tranca para fora do próprio sistema.');
  if (p.papel === 'coordenacao') {
    const outras = get(
      `SELECT COUNT(*) AS n FROM educador
        WHERE papel = 'coordenacao' AND arquivado_em IS NULL AND id <> ?`, id).n;
    if (!outras)
      throw erro(422, `${p.nome} é a única coordenação na ativa. Sem ela ninguém cadastra pessoa nem traz alguém de volta do arquivo — cadastre a substituta antes.`);
  }

  // Turma órfã não é detalhe: `exigeAcessoTurma` lê `turma.educador_id`, e uma
  // turma apontando para quem saiu é escopo de leitura pendurado em ninguém.
  const turmas = all(`SELECT id, nome FROM turma WHERE educador_id = ?`, id);
  let sucessora = null;
  if (assumidaPor != null) {
    sucessora = get(`SELECT * FROM educador WHERE id = ?`, assumidaPor);
    if (!sucessora) throw erro(404, 'A professora que assumiria as turmas não foi encontrada.');
    if (Number(sucessora.id) === Number(id))
      throw erro(422, 'A pessoa que sai não pode assumir as próprias turmas.');
    if (sucessora.arquivado_em)
      throw erro(422, `${sucessora.nome} está no arquivo. Traga de volta antes de passar turma para ela.`);
    if (!PAPEIS_COM_TURMA.has(sucessora.papel))
      throw erro(422, 'Só professora ou psicóloga assume turma.');
  }

  return tx(() => {
    run(`UPDATE educador SET arquivado_em = ? WHERE id = ?`, hoje(), id);
    if (turmas.length)
      run(`UPDATE turma SET educador_id = ? WHERE educador_id = ?`, sucessora?.id ?? null, id);
    return {
      pessoa: get(`SELECT * FROM educador WHERE id = ?`, id),
      turmas: turmas.map(t => t.nome),
      sucessora: sucessora ? { id: sucessora.id, nome: sucessora.nome } : null,
      aviso: !turmas.length
        ? `${p.nome} foi para o arquivo. O que ela registrou continua no sistema, com o nome dela.`
        : sucessora
          ? `${p.nome} foi para o arquivo e ${sucessora.nome} assumiu ${turmas.length} turma(s).`
          : `${p.nome} foi para o arquivo. ${turmas.length} turma(s) ficaram SEM professora: ${turmas.map(t => t.nome).join(', ')}.`,
    };
  });
}

/** Traz alguém da equipe de volta do arquivo. Turma não volta junto — quem
 *  ficou responsável no intervalo continua responsável até alguém decidir. */
export function reativarPessoa(id) {
  const p = get(`SELECT * FROM educador WHERE id = ?`, id);
  if (!p) throw erro(404, 'Pessoa não encontrada.');
  if (!p.arquivado_em) throw erro(409, `${p.nome} já está na ativa.`);
  run(`UPDATE educador SET arquivado_em = NULL WHERE id = ?`, id);
  return {
    pessoa: get(`SELECT * FROM educador WHERE id = ?`, id),
    aviso: `${p.nome} voltou do arquivo como ${rotuloDoPapel(p.papel)}. Turma não volta junto — atribua em Pessoas se for o caso.`,
  };
}

/**
 * Manda a criança para o arquivo: sai das listas vivas, as matrículas ativas
 * são encerradas com data e o registro inteiro continua de pé. É o que
 * alimenta safra, permanência e evasão — apagar seria mentir a curva para cima.
 */
export function arquivarCrianca(id, { saida = null } = {}) {
  const c = get(`SELECT * FROM crianca WHERE id = ?`, id);
  if (!c) throw erro(404, 'Criança não encontrada.');
  if (!c.ativo) throw erro(409, `${c.nome} já está no arquivo.`);
  const hj = hoje();
  const dt = saida ? dataObrigatoria(saida, 'A data de saída') : hj;
  if (dt > hj) throw erro(422, 'A data de saída está no futuro.');
  const ativas = all(`SELECT * FROM matricula WHERE crianca_id = ? AND status = 'ativa'`, id);
  const ultimaEntrada = ativas.map(m => m.entrada).sort().at(-1);
  if (ultimaEntrada && dt < ultimaEntrada)
    throw erro(422, `A data de saída é anterior à entrada no programa (${dataBR(ultimaEntrada)}).`);

  return tx(() => {
    run(`UPDATE crianca SET ativo = 0 WHERE id = ?`, id);
    run(`UPDATE matricula SET status = 'encerrada', saida = ?
          WHERE crianca_id = ? AND status = 'ativa'`, dt, id);
    // `recalcularAlertas` só varre criança ativa: um alerta de ausência aberto
    // ficaria para sempre na tela da coordenação, cobrando tratativa de quem
    // não está mais no programa. O fecho é aqui, e ele fica escrito.
    const alerta = run(
      `UPDATE alerta SET status = 'resolvido', atualizado_em = ?,
              tratativa = COALESCE(tratativa || ' | ', '') || 'Criança foi para o arquivo.'
        WHERE crianca_id = ? AND status <> 'resolvido'`, agora(), id);
    return {
      crianca: get(`SELECT * FROM crianca WHERE id = ?`, id),
      matriculas_encerradas: ativas.length,
      alertas_fechados: alerta.changes,
      saida: dt,
      aviso: `${c.nome} foi para o arquivo em ${dataBR(dt)}. A presença e a trajetória dela continuam no sistema — é o que a curva de permanência e a leitura de evasão precisam ler.`,
    };
  });
}

/**
 * Traz a criança de volta com uma matrícula NOVA — porque voltar é matricular
 * de novo, e o modelo deste banco já diz isso: criança é entidade, matrícula é
 * relação. Reabrir a matrícula antiga apagaria a saída, e a saída é o dado.
 *
 * O consentimento volta a PENDENTE. É a decisão conservadora e ela custa algo:
 * este banco não tem histórico de consentimento, então quem consentiu antes se
 * perde no ato. O outro lado seria pior — retomar processamento de dado
 * sensível, em silêncio, depois de a base legal ter caducado com a saída.
 */
export function rematricularCrianca(id, { programaId, turmaId = null, entrada = null }) {
  const c = get(`SELECT * FROM crianca WHERE id = ?`, id);
  if (!c) throw erro(404, 'Criança não encontrada.');
  if (c.ativo) throw erro(409, `${c.nome} já está na ativa — não está no arquivo.`);
  const { programa, turma } = programaETurma(programaId, turmaId);

  const hj = hoje();
  const ent = entrada ? dataObrigatoria(entrada, 'A data de entrada') : hj;
  if (ent > hj) throw erro(422, 'A data de entrada está no futuro.');
  const ultimaSaida = get(
    `SELECT MAX(saida) AS d FROM matricula WHERE crianca_id = ?`, id).d;
  if (ultimaSaida && ent < ultimaSaida)
    throw erro(422, `A volta é anterior à saída (${dataBR(ultimaSaida)}). Confira a data.`);
  if (get(`SELECT id FROM matricula WHERE crianca_id = ? AND programa_id = ? AND entrada = ?`,
          id, programa.id, ent))
    throw erro(409, `Já existe matrícula de ${c.nome} em ${programa.nome} começando em ${dataBR(ent)}.`);

  return tx(() => {
    run(`UPDATE crianca SET ativo = 1 WHERE id = ?`, id);
    run(`INSERT INTO matricula (crianca_id, programa_id, turma_id, entrada, saida, status)
         VALUES (?,?,?,?,NULL,'ativa')`, id, programa.id, turma?.id ?? null, ent);
    for (const campo of CONSENTIMENTOS_DA_MATRICULA)
      run(`INSERT INTO consentimento (crianca_id, campo, status, responsavel, data_registro)
           VALUES (?,?, 'pendente', NULL, NULL)
           ON CONFLICT(crianca_id, campo) DO UPDATE SET
             status = 'pendente', responsavel = NULL, data_registro = NULL`, id, campo);
    return {
      crianca: get(`SELECT * FROM crianca WHERE id = ?`, id),
      programa: { id: programa.id, nome: programa.nome },
      turma: turma ? { id: turma.id, nome: turma.nome } : null,
      entrada: ent,
      aviso: `${c.nome} voltou em ${programa.nome}. O consentimento voltou a PENDENTE: a base legal caducou com a saída e precisa ser pedida de novo ao responsável.`,
    };
  });
}

/** O arquivo inteiro, dos dois lados. Mostra o que a pessoa DEIXOU no sistema —
 *  é o argumento de por que ela não pode ser apagada. */
export function listarArquivo() {
  const pessoas = all(
    `SELECT e.id, e.nome, e.apelido, e.papel, e.arquivado_em,
            (SELECT COUNT(*) FROM observacao o WHERE o.educador_id = e.id) AS observacoes,
            (SELECT COUNT(*) FROM encontro en WHERE en.registrado_por = e.id) AS chamadas
       FROM educador e
      WHERE e.arquivado_em IS NOT NULL
      ORDER BY e.arquivado_em DESC, e.nome`);
  const criancas = all(
    `SELECT c.id, c.codigo, c.nome,
            (SELECT MAX(m.saida) FROM matricula m WHERE m.crianca_id = c.id) AS saiu_em,
            (SELECT GROUP_CONCAT(DISTINCT p.nome) FROM matricula m
               JOIN programa p ON p.id = m.programa_id WHERE m.crianca_id = c.id) AS programas,
            (SELECT COUNT(*) FROM presenca pr WHERE pr.crianca_id = c.id AND pr.status = 'P') AS presencas
       FROM crianca c
      WHERE c.ativo = 0
      ORDER BY saiu_em DESC, c.nome`);
  return {
    pessoas, criancas,
    doutrina: 'Este produto não apaga pessoa. O arquivo guarda quem saiu, com o que a pessoa deixou registrado — a saída da criança é o dado que a curva de permanência lê, e o registro da professora continua assinado com o nome dela.',
  };
}


// --------------------------------------------------------------------------
// Decisao 33 — a regua de presenca do Instituto (75%), por crianca e por turma.
// E' para DENTRO: quem responde pela turma e a coordenacao veem a crianca com a
// faixa e o numero (e' a pratica da casa: conversar com a familia). A diretoria
// ve so' contagens. Nada daqui sai identificado — o recado da turma leva so' o
// agregado.
// --------------------------------------------------------------------------
export function inicioDoSemestre(ref = hoje()) {
  const ano = ref.slice(0, 4);
  return Number(ref.slice(5, 7)) >= 7 ? `${ano}-07-01` : `${ano}-01-01`;
}

export function faixaDaRegua(pct, encontros) {
  if (pct == null || encontros < PARAMS.REGUA_MINIMO_ENCONTROS) return 'sem_base';
  if (pct < PARAMS.PRESENCA_MINIMA_PCT) return 'abaixo';
  if (pct < PARAMS.PRESENCA_ATENCAO_PCT) return 'atencao';
  return 'ok';
}

export function reguaDaTurma(turmaId, { desde = null, ref = hoje() } = {}) {
  const turma = get(`SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id = t.programa_id WHERE t.id = ?`, turmaId);
  if (!turma) throw erro(404, 'Turma não encontrada.');
  const inicio = desde ?? inicioDoSemestre(ref);
  const criancas = all(
    `SELECT c.id, c.codigo, c.nome,
            COUNT(p.id) AS encontros,
            SUM(CASE WHEN p.status = 'P' THEN 1 ELSE 0 END) AS presentes
       FROM crianca c
       JOIN matricula m ON m.crianca_id = c.id AND m.turma_id = ? AND m.status = 'ativa'
       LEFT JOIN presenca p ON p.crianca_id = c.id
       LEFT JOIN encontro e ON e.id = p.encontro_id AND e.turma_id = ? AND e.data >= ? AND e.data <= ?
      WHERE c.ativo = 1 AND (p.id IS NULL OR e.id IS NOT NULL)
      GROUP BY c.id ORDER BY c.nome`, turmaId, turmaId, inicio, ref)
    .map(c => {
      const pct = c.encontros ? Math.round(((c.presentes ?? 0) / c.encontros) * 100) : null;
      return { ...c, presentes: c.presentes ?? 0, pct, faixa: faixaDaRegua(pct, c.encontros) };
    });
  const resumo = { ok: 0, atencao: 0, abaixo: 0, sem_base: 0 };
  for (const c of criancas) resumo[c.faixa]++;
  return {
    turma: { id: turma.id, nome: turma.nome, programa: turma.programa },
    desde: inicio, ate: ref,
    minima_pct: PARAMS.PRESENCA_MINIMA_PCT, atencao_pct: PARAMS.PRESENCA_ATENCAO_PCT,
    minimo_encontros: PARAMS.REGUA_MINIMO_ENCONTROS,
    criancas, resumo,
    doutrina: 'A régua é a do Instituto (75% para permanecer e para o grupo de benefícios). Abaixo dela não é erro de ninguém: é protocolo — a conversa é com a família.',
  };
}

/** Só contagens por turma — o que a coordenação e a diretoria veem no painel. */
export function reguaDoInstituto(opcoes = {}) {
  const turmas = all(`SELECT id FROM turma ORDER BY id`).map(t => {
    const r = reguaDaTurma(t.id, opcoes);
    return { turma: r.turma, criancas: r.criancas.length, resumo: r.resumo };
  });
  const total = { ok: 0, atencao: 0, abaixo: 0, sem_base: 0 };
  for (const t of turmas) for (const k of Object.keys(total)) total[k] += t.resumo[k];
  return { desde: turmas[0]?.desde ?? inicioDoSemestre(), minima_pct: PARAMS.PRESENCA_MINIMA_PCT,
           atencao_pct: PARAMS.PRESENCA_ATENCAO_PCT, turmas, total };
}
