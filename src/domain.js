// Percurso — regras de dominio.
// Tudo que decide alguma coisa mora aqui: elegibilidade de observacao,
// filtro de perimetro do campo livre, alertas de ausencia, safras,
// trajetorias e a sintese de ciclo (template contido + revisor).
import { all, get, run, tx } from './db.js';

// Parametros de protocolo (M6 — protocolo de aplicacao) ------------------------
export const PARAMS = {
  // Janela minima de convivio: quantos encontros a educadora precisa ter tido
  // com a crianca antes de poder responder a rubrica sobre ela.
  JANELA_MINIMA_CONVIVIO: 4,
  // Ausencias consecutivas que disparam alerta operacional (F6).
  AUSENCIAS_ALERTA: 3,
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
  const criancasUnicas = get(
    `SELECT COUNT(DISTINCT c.id) AS n FROM crianca c
      JOIN matricula m ON m.crianca_id = c.id AND m.status = 'ativa'
     WHERE c.ativo = 1`).n;
  const matriculas = get(
    `SELECT COUNT(*) AS n FROM matricula WHERE status = 'ativa'`).n;
  const multi = get(
    `SELECT COUNT(*) AS n FROM (
       SELECT crianca_id FROM matricula WHERE status='ativa'
        GROUP BY crianca_id HAVING COUNT(*) > 1)`).n;
  const porPrograma = all(
    `SELECT p.id, p.nome, p.faixa, p.cadencia, p.no_escopo, p.nota,
            COUNT(m.id) AS matriculas
       FROM programa p
       LEFT JOIN matricula m ON m.programa_id = p.id AND m.status = 'ativa'
      GROUP BY p.id ORDER BY p.id`);
  const primeiroEncontro = get(`SELECT MIN(data) AS d FROM encontro`).d;
  const encontros = get(`SELECT COUNT(*) AS n FROM encontro`).n;
  const presencas = get(`SELECT COUNT(*) AS n FROM presenca`).n;
  return {
    criancasUnicas, matriculas, multi, porPrograma,
    cobertura: { desde: primeiroEncontro, encontros, presencas },
  };
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

function diaLetivo(turno, iso) {
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

export function alertas(status = null) {
  const sql = `SELECT a.*, c.nome, c.codigo,
                      (SELECT GROUP_CONCAT(p.nome, ', ') FROM matricula m
                         JOIN programa p ON p.id = m.programa_id
                        WHERE m.crianca_id = c.id AND m.status='ativa') AS programas
                 FROM alerta a JOIN crianca c ON c.id = a.crianca_id
                ${status ? 'WHERE a.status = ?' : "WHERE a.status <> 'resolvido'"}
                ORDER BY a.status, a.criado_em DESC`;
  return status ? all(sql, status) : all(sql);
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
  { rotulo: 'saúde mental / diagnóstico', termos: ['depress', 'depressiv', 'ansiedad', 'transtorno', 'autis', 'tdah', 'bipolar', 'psiquiatr', 'psicolog', 'terapia', 'diagnostic', 'diagnóstic', 'laudo', 'suicid', 'automutil', 'medicad', 'medicament', 'remedio', 'remédio', 'ritalina', 'fluoxetina'] },
  { rotulo: 'violência / proteção', termos: ['abuso', 'abusad', 'violen', 'estupr', 'agress', 'apanh', 'espanc', 'conselho tutelar', 'assedi', 'assédi'] },
  { rotulo: 'vida íntima e familiar', termos: ['pai bebe', 'pai bêbado', 'mae bebe', 'mãe bêbada', 'alcool', 'álcool', 'droga', 'trafic', 'preso', 'cadeia', 'presidio', 'presídio', 'separac', 'separaç', 'divorci', 'divórci', 'despej', 'em casa nao tem', 'em casa não tem', 'passa fome', 'briga em casa', 'apanha em casa'] },
  { rotulo: 'saúde física / corpo', termos: ['doenca', 'doença', 'hospital', 'internad', 'cirurgi', 'convuls', 'epilep', 'hiv', 'gravid'] },
];

export function filtrarPerimetro(texto) {
  const bruto = (texto || '').trim();
  if (!bruto) return { limpo: '', bloqueado: false, trechos: [] };
  const frases = bruto.split(/(?<=[.!?;\n])\s*/).filter(f => f.trim());
  const trechos = [];
  const mantidas = [];
  for (const f of frases) {
    const norm = f.toLowerCase();
    const hit = PERIMETRO.find(cat => cat.termos.some(t => norm.includes(t)));
    if (hit) trechos.push({ trecho: f.trim(), categoria: hit.rotulo });
    else mantidas.push(f.trim());
  }
  return { limpo: mantidas.join(' ').trim(), bloqueado: trechos.length > 0, trechos };
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

export function salvarObservacao({ cicloId, criancaId, educadorId, itens, notaLivre, concluir, forcarLimpeza }) {
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

  // O campo livre tem base legal propria: sem consentimento, nem existe.
  if ((notaLivre || '').trim()) {
    const consNota = consentimentoDe(criancaId, 'campo_livre');
    if (consNota.status !== 'ativo') {
      throw erro(403, 'O campo livre desta criança está bloqueado — falta o consentimento específico do responsável para esse campo.',
                 { motivo: 'consentimento_campo_livre' });
    }
  }

  // Filtro de perimetro antes de gravar. Nada bloqueado chega ao banco.
  const f = filtrarPerimetro(notaLivre);
  if (f.bloqueado && !forcarLimpeza) {
    throw erro(409, 'Um trecho da anotação fala de assunto que o Percurso não guarda.',
               { filtro: f, marcacoes_preservadas: [...marcados].map(([d, n]) => ({ dimensao_id: d, nivel: n })) });
  }
  const notaFinal = f.limpo || null;

  return tx(() => {
    let obs = get(`SELECT * FROM observacao WHERE ciclo_id = ? AND crianca_id = ?`, cicloId, criancaId);
    const status = concluir ? 'concluida' : 'rascunho';
    if (!obs) {
      run(`INSERT INTO observacao (ciclo_id, crianca_id, educador_id, status, nota_livre, atualizado_em, concluido_em)
           VALUES (?,?,?,?,?,?,?)`,
          cicloId, criancaId, educadorId, status, notaFinal, agora(), concluir ? agora() : null);
      obs = get(`SELECT * FROM observacao WHERE ciclo_id = ? AND crianca_id = ?`, cicloId, criancaId);
    } else {
      if (obs.status === 'concluida' && !concluir) throw erro(422, 'Observação já concluída não volta para rascunho.');
      run(`UPDATE observacao SET status=?, nota_livre=?, educador_id=?, atualizado_em=?,
             concluido_em = COALESCE(concluido_em, ?) WHERE id = ?`,
          status, notaFinal, educadorId, agora(), concluir ? agora() : null, obs.id);
    }
    run(`DELETE FROM observacao_item WHERE observacao_id = ?`, obs.id);
    for (const [dim, nivel] of marcados) {
      run(`INSERT INTO observacao_item (observacao_id, dimensao_id, nivel) VALUES (?,?,?)`, obs.id, dim, nivel);
    }
    marcarAtividade(educadorId, concluir ? 'observacao' : 'rascunho');
    return { id: obs.id, status, trechos_descartados: f.trechos.length };
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
    return {
      safra: ano, n: coorte.length,
      pontos: marcos.map(mes => {
        const elegiveis = coorte.filter(l => diasEntre(l.entrada, hoje()) >= mes * 30);
        if (!elegiveis.length) return { mes, pct: null, base: 0 };
        const ficaram = elegiveis.filter(l => !l.saida || diasEntre(l.entrada, l.saida) >= mes * 30);
        return { mes, pct: Math.round((ficaram.length / elegiveis.length) * 100), base: elegiveis.length };
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
const VERBOS_PROIBIDOS = [
  'gerou', 'gera ', 'causou', 'causa ', 'provou', 'prova que', 'comprova que',
  'garante', 'garantiu', 'resultou em', 'e responsavel por', 'é responsável por',
  'demonstra causalidade', 'em decorrencia direta', 'em decorrência direta',
];

export function revisarSobreAlegacao(texto) {
  const norm = (texto || '').toLowerCase();
  const achados = VERBOS_PROIBIDOS.filter(v => norm.includes(v));
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

  const ativas = get(
    `SELECT COUNT(DISTINCT m.crianca_id) AS n FROM matricula m
      WHERE m.status='ativa' ${filtro}`, ...p).n;
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
  partes.push(
    'Os dados sugerem que os programas contribuíram para os avanços observados; fatores externos não foram isolados.');
  return partes.join(' ');
}

export function gerarSintese(cicloId, programaId = null) {
  const n = numerosDoCiclo(cicloId, programaId);
  const texto = redigirSintese(n);
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
      cicloId, programaId ?? null, texto, JSON.stringify(n), rev.status, rev.notas.join(' '), agora());
  return sinteseDe(cicloId, programaId);
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
  return {
    crianca: { ...c, idade },
    matriculas, presencas,
    presenca_pct: totalPres.t ? Math.round(((totalPres.p ?? 0) / totalPres.t) * 100) : null,
    ausencias_consecutivas: ausenciasConsecutivas(criancaId).n,
    trajetoria: trajetoriaCrianca(criancaId),
    consentimentos,
    alerta: get(`SELECT * FROM alerta WHERE crianca_id = ? AND status <> 'resolvido'`, criancaId) ?? null,
  };
}

export function listarCriancas({ q = '', turmaId = null, programaId = null, limite = 60 } = {}) {
  const termo = `%${(q || '').trim().toLowerCase()}%`;
  const cond = [`c.ativo = 1`, `m.status = 'ativa'`];
  const p = [];
  if (q) { cond.push(`(lower(c.nome) LIKE ? OR lower(c.codigo) LIKE ?)`); p.push(termo, termo); }
  if (turmaId) { cond.push(`m.turma_id = ?`); p.push(turmaId); }
  if (programaId) { cond.push(`m.programa_id = ?`); p.push(programaId); }
  return all(
    `SELECT DISTINCT c.id, c.codigo, c.nome,
            (SELECT GROUP_CONCAT(p2.nome, ' · ') FROM matricula m2
               JOIN programa p2 ON p2.id = m2.programa_id
              WHERE m2.crianca_id = c.id AND m2.status='ativa') AS programas
       FROM crianca c JOIN matricula m ON m.crianca_id = c.id
      WHERE ${cond.join(' AND ')}
      ORDER BY c.nome LIMIT ?`, ...p, limite);
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
  INTER: [
    { titulo: 'Duplas sorteadas com missão conjunta', descricao: 'Cada dupla recebe uma tarefa que só fecha com as duas partes — a apresentação é da dupla, não de cada um.', duracao: '25–35 min' },
    { titulo: 'Roda de apresentação cruzada', descricao: 'Cada criança apresenta o trabalho da colega, não o próprio — obriga a perguntar, ouvir e se aproximar.', duracao: '20–30 min' },
  ],
  COOP: [
    { titulo: 'Combinados da semana no quadro', descricao: 'A turma escreve os 3 combinados da semana; quem lembra um combinado em ação ganha o registro no mural.', duracao: '15–20 min' },
    { titulo: 'Jogo cooperativo de construção', descricao: 'Uma construção coletiva onde cada criança tem uma peça obrigatória — não há como terminar sozinho.', duracao: '30–40 min' },
  ],
  EXPR: [
    { titulo: 'Roda de nomear emoções', descricao: 'Com cartas de emoções, cada criança escolhe a do dia e conta em uma frase o porquê — sem comentário avaliativo da roda.', duracao: '20–30 min' },
    { titulo: 'Termômetro da emoção na entrada', descricao: 'Painel na porta: cada criança marca como chega. A educadora só observa o padrão da semana.', duracao: '5 min por encontro' },
  ],
  AUTO: [
    { titulo: 'Roteiro visível de 3 passos', descricao: 'A atividade do dia vem com roteiro ilustrado de 3 passos no quadro — a criança consulta antes de pedir ajuda.', duracao: '30–40 min' },
    { titulo: 'Cantinho do material', descricao: 'Cada criança organiza e busca o próprio material a partir de um mapa fixo da sala.', duracao: '10 min por encontro' },
  ],
  PERS: [
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
    `SELECT c.aspiracao AS area, COUNT(*) AS n,
            GROUP_CONCAT(c.nome, ' · ') AS criancas
       FROM crianca c
       JOIN matricula m ON m.crianca_id = c.id AND m.turma_id = ? AND m.status = 'ativa'
      WHERE c.aspiracao IS NOT NULL AND c.ativo = 1
      GROUP BY c.aspiracao ORDER BY n DESC, area`, turmaId);

  return {
    turma: { id: turma.id, nome: turma.nome, programa: turma.programa },
    gerado_em: hoje(),
    doutrina: 'Plano gerado por regra fixa a partir dos registros — nenhum item nasce de modelo.',
    radar, foco, ganchos,
  };
}
