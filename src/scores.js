// Percurso v2 — os tres scores, a supressao e a pauta de segunda.
//
// A LINHA QUE NAO SE CRUZA (07-SCORES do pack v2):
//   Nenhum destes scores pontua a crianca. Nao existe score socioemocional
//   individual, por decisao de desenho — classificacao automatizada de estado
//   psiquico de menor vulneravel nao sobrevive ao Art. 11 da LGPD nem ao bloco 6
//   do dossie.
//
// Escore nasce de formula sobre dado registrado, nunca de modelo (invariante 3
// do plano de arquitetura). Toda funcao daqui e' pura em relacao ao relogio:
// quem chama passa `ref`, e os testes ficam deterministicos.
import { all, get, run } from './db.js';
import { PARAMS, hoje, agora, addDias, diasEntre, erro, marcarAtividade } from './domain.js';
import { AREAS, rotuloDe } from './voz.js';

// --------------------------------------------------------------------------
// Supressao de celula pequena. Roda ANTES da redacao, nunca depois
// (08-RELATORIO-DOADOR). Recortes pequenos sao AGRUPADOS, nao apagados em
// silencio: apagar sem dizer transforma supressao em omissao.
// --------------------------------------------------------------------------
export function suprimir(grupos, {
  minimo = PARAMS.MINIMO_CELULA,
  rotulo = 'Demais recortes',
  chave = 'criancas',
  // Campos que PODEM ser somados ao agrupar. Sem esta lista, somar "todo campo
  // numérico" juntava percentuais e ids: dois programas com 80% e 75% viravam um
  // recorte de "155%" na tabela do doador. Percentual não soma — ou se recalcula
  // a partir dos aditivos, ou não é publicado para o agrupado.
  somaveis = null,
} = {}) {
  const publicaveis = [], pequenos = [];
  for (const g of grupos) ((Number(g[chave]) || 0) >= minimo ? publicaveis : pequenos).push(g);
  if (!pequenos.length) return { publicaveis, agrupado: null, suprimidos: [], minimo };

  const soma = (campo) => pequenos.reduce((a, g) => a + (Number(g[campo]) || 0), 0);
  const campos = somaveis ?? [chave];
  const agrupado = Object.fromEntries(campos.map(k => [k, soma(k)]));
  agrupado.rotulo = rotulo;
  agrupado.agrupa = pequenos.length;

  // O bucket agregado so e' publicavel se ele proprio passar do minimo.
  if ((Number(agrupado[chave]) || 0) >= minimo) {
    return { publicaveis: [...publicaveis, agrupado], agrupado, suprimidos: pequenos.map(g => g.rotulo ?? g.area ?? '—'), minimo };
  }
  return { publicaveis, agrupado: null, suprimidos: pequenos.map(g => g.rotulo ?? g.area ?? '—'), minimo };
}

// --------------------------------------------------------------------------
// SCORE 1 — Risco de evasao.  Escopo: matricula.  Faixa: 0 a 100.
//
// Compara a crianca com a linha de base DELA MESMA, nunca com a turma: e' o que
// evita punir quem sempre teve frequencia mais baixa por razao de contexto.
// --------------------------------------------------------------------------
const JANELA_RECENTE = 4;

export function riscoEvasaoDe(matriculaId, ref = hoje()) {
  const m = get(
    `SELECT m.*, c.nome, c.codigo, t.nome AS turma, p.nome AS programa
       FROM matricula m
       JOIN crianca c ON c.id = m.crianca_id
       LEFT JOIN turma t ON t.id = m.turma_id
       JOIN programa p ON p.id = m.programa_id
      WHERE m.id = ?`, matriculaId);
  if (!m) throw erro(404, 'Matrícula não encontrada.');

  // Presencas desta matricula: so os encontros da turma dela.
  const linhas = m.turma_id
    ? all(`SELECT e.data, p.status FROM presenca p
             JOIN encontro e ON e.id = p.encontro_id
            WHERE p.crianca_id = ? AND e.turma_id = ? AND e.data <= ?
            ORDER BY e.data`, m.crianca_id, m.turma_id, ref)
    : all(`SELECT e.data, p.status FROM presenca p
             JOIN encontro e ON e.id = p.encontro_id
            WHERE p.crianca_id = ? AND e.data <= ? ORDER BY e.data`, m.crianca_id, ref);

  const base = {
    matricula_id: m.id, crianca_id: m.crianca_id, nome: m.nome, codigo: m.codigo,
    turma: m.turma, turma_id: m.turma_id, programa: m.programa,
  };
  if (!linhas.length) return { ...base, valor: 0, consecutivas: 0, motivo: 'sem histórico', alerta: false, registros: 0 };

  let consecutivas = 0;
  for (let i = linhas.length - 1; i >= 0; i--) {
    if (linhas[i].status === 'P') break;
    consecutivas++;
  }

  const recentes = linhas.slice(-JANELA_RECENTE);
  const anteriores = linhas.slice(0, -JANELA_RECENTE);
  const taxa = (a) => (a.length ? a.filter(l => l.status === 'P').length / a.length : 0);
  const linhaDeBase = anteriores.length ? taxa(anteriores) : taxa(recentes);
  const agora_ = taxa(recentes);
  const queda = Math.max(0, linhaDeBase - agora_);

  const diasSemRegistro = Math.max(0, diasEntre(linhas.at(-1).data, ref));

  // Pesos calibrados para que o VALOR discrimine, e nao so classifique.
  // O `codigo/scores.js` do pack v2 usava `consecutivas * 30`, que satura em 100
  // com quatro faltas — e ai toda crianca em risco aparece com o mesmo numero, o
  // que torna a coluna inutil para priorizar a ligacao para a familia.
  // Aqui cada componente tem teto proprio e a soma fecha em 100:
  //   faltas consecutivas  ate 60   (peso maior, como o pack manda)
  //   queda contra a propria linha de base  ate 30
  //   tempo desde o ultimo registro  ate 10
  // A REGRA DE ACAO nao mudou: duas faltas seguidas entram na lista pelo campo
  // `alerta`, independentemente do valor.
  const valor = Math.min(100, Math.round(
    Math.min(consecutivas, 4) * 15 +
    queda * 100 * 0.30 +
    Math.min(diasSemRegistro, 30) * 0.33));

  const motivo = consecutivas >= PARAMS.AUSENCIAS_ALERTA
    ? `${consecutivas} faltas seguidas`
    : queda > 0.2 ? 'queda de frequência contra a própria linha de base'
    : diasSemRegistro >= 14 ? `sem registro há ${diasSemRegistro} dias`
    : 'sem sinal de risco';

  return {
    ...base, valor, consecutivas,
    linha_de_base_pct: Math.round(linhaDeBase * 100),
    recente_pct: Math.round(agora_ * 100),
    dias_sem_registro: diasSemRegistro,
    ultimo_registro: linhas.at(-1).data,
    registros: linhas.length,
    motivo,
    // Duas faltas seguidas ja colocam na lista, independente do score.
    alerta: valor >= PARAMS.RISCO_ACAO || consecutivas >= PARAMS.AUSENCIAS_ALERTA,
  };
}

export function riscoEvasao({ turmaId = null, programaId = null, ref = hoje() } = {}) {
  const cond = ["m.status = 'ativa'"];
  const p = [];
  if (turmaId) { cond.push('m.turma_id = ?'); p.push(turmaId); }
  if (programaId) { cond.push('m.programa_id = ?'); p.push(programaId); }
  const ids = all(`SELECT m.id FROM matricula m WHERE ${cond.join(' AND ')}`, ...p).map(r => r.id);
  const linhas = ids.map(id => riscoEvasaoDe(id, ref));
  const emRisco = linhas.filter(l => l.alerta).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));
  return {
    escopo: 'matrícula',
    limiar_acao: PARAMS.RISCO_ACAO,
    faltas_para_lista: PARAMS.AUSENCIAS_ALERTA,
    avaliadas: linhas.length,
    em_risco: emRisco.length,
    linhas: emRisco,
    doutrina: 'Compara a criança com a linha de base dela mesma. Não pontua desenvolvimento; sinaliza vínculo em risco.',
  };
}

// --------------------------------------------------------------------------
// SCORE 2 — Cobertura do registro.  Escopo: turma.  Faixa: 0 a 100.
//
// MEDE O SISTEMA, NAO A PESSOA. So aparece para coordenacao e diretoria;
// nunca em tela de professora, nunca como ranking entre educadoras.
// --------------------------------------------------------------------------
// Folha completa = existe, a atividade foi identificada e ha pelo menos um
// marcador de turma. Folha em branco nao conta como registro.
const SQL_COMPLETA = `
  f.id IS NOT NULL AND f.atividade <> 'nao_identificada'
  AND (SELECT COUNT(*) FROM folha_marcador fm WHERE fm.folha_id = f.id) > 0`;

export function coberturaRegistro({ turmaId = null, desde = null, ref = hoje() } = {}) {
  const inicio = desde ?? addDias(ref, -60);
  const cond = ['e.data BETWEEN ? AND ?'];
  const p = [inicio, ref];
  if (turmaId) { cond.push('e.turma_id = ?'); p.push(turmaId); }
  const encontros = all(
    `SELECT e.id, e.data, e.turma_id, t.nome AS turma,
            CASE WHEN ${SQL_COMPLETA} THEN 1 ELSE 0 END AS completa
       FROM encontro e
       JOIN turma t ON t.id = e.turma_id
       LEFT JOIN folha f ON f.encontro_id = e.id
      WHERE ${cond.join(' AND ')}
      ORDER BY e.data`, ...p);

  // O universo sao as TURMAS, nao os encontros. Derivar a lista dos encontros
  // fazia a turma que parou de registrar por completo DESAPARECER do painel —
  // exatamente a turma que a coordenacao precisa enxergar (achado SRV-05).
  const universo = all(
    `SELECT id AS turma_id, nome AS turma FROM turma ${turmaId ? 'WHERE id = ?' : ''} ORDER BY id`,
    ...(turmaId ? [turmaId] : []));

  if (!encontros.length) {
    return {
      escopo: 'turma', valor: 0, completas: 0, total: 0, periodo: { inicio, fim: ref },
      turmas: universo.map(t => ({ ...t, total: 0, completas: 0, pct: 0, sem_encontro: true, ultima_completa: null })),
      turmas_sem_registro: universo.length,
      alerta: true, limiar: PARAMS.COBERTURA_ALERTA, doutrina: DOUTRINA_COBERTURA,
    };
  }

  // Ponderacao por recencia: encontro recente pesa mais que encontro antigo.
  let pesoTotal = 0, pesoFeito = 0;
  encontros.forEach((e, i) => {
    const peso = 1 + i / encontros.length;
    pesoTotal += peso;
    if (e.completa) pesoFeito += peso;
  });
  const completas = encontros.filter(e => e.completa).length;

  const porTurma = universo.map(t => {
    const dela = encontros.filter(e => e.turma_id === t.turma_id);
    const ok = dela.filter(e => e.completa).length;
    return {
      turma_id: t.turma_id, turma: t.turma, total: dela.length, completas: ok,
      pct: dela.length ? Math.round((ok / dela.length) * 100) : 0,
      sem_encontro: dela.length === 0,
      ultima_completa: dela.filter(e => e.completa).at(-1)?.data ?? null,
    };
  }).sort((a, b) => a.pct - b.pct || a.turma.localeCompare(b.turma));

  const valor = Math.round((pesoFeito / pesoTotal) * 100);
  return {
    escopo: 'turma', valor, completas, total: encontros.length,
    periodo: { inicio, fim: ref },
    turmas: porTurma,
    turmas_sem_registro: porTurma.filter(t => t.completas === 0).length,
    alerta: valor < PARAMS.COBERTURA_ALERTA,
    limiar: PARAMS.COBERTURA_ALERTA,
    doutrina: DOUTRINA_COBERTURA,
  };
}
const DOUTRINA_COBERTURA =
  'A cobertura mede o sistema, não a professora. Não vira ranking e não aparece em tela de educadora.';

// --------------------------------------------------------------------------
// SCORE 3 — Exposicao.  Escopo: turma ou programa.  Faixa: 0 a 100.
//
// Aspiracao declarada no Laboratorio de Sonhos contra atividade realizada.
// Area com interessadas e zero atividades vira LACUNA NOMEADA — publicar o que
// faltou e' o que torna o resto do relatorio confiavel.
// --------------------------------------------------------------------------
export function exposicao({ turmaId = null, programaId = null, desde = null, ref = hoje() } = {}) {
  const inicio = desde ?? addDias(ref, -180);

  const condCrianca = ["m.status = 'ativa'"];
  const pc = [];
  if (turmaId) { condCrianca.push('m.turma_id = ?'); pc.push(turmaId); }
  if (programaId) { condCrianca.push('m.programa_id = ?'); pc.push(programaId); }

  const aspiracoes = all(
    `SELECT a.area, COUNT(DISTINCT a.crianca_id) AS criancas
       FROM aspiracao a
       JOIN matricula m ON m.crianca_id = a.crianca_id
       JOIN crianca c ON c.id = a.crianca_id AND c.ativo = 1
      WHERE ${condCrianca.join(' AND ')}
      GROUP BY a.area`, ...pc);

  const condAtv = ['aa.data BETWEEN ? AND ?'];
  const pa = [inicio, ref];
  if (turmaId) { condAtv.push('aa.turma_id = ?'); pa.push(turmaId); }
  if (programaId) { condAtv.push('aa.turma_id IN (SELECT id FROM turma WHERE programa_id = ?)'); pa.push(programaId); }
  const atividades = all(
    `SELECT aa.area, COUNT(*) AS atividades, MAX(aa.data) AS ultima
       FROM atividade_area aa WHERE ${condAtv.join(' AND ')} GROUP BY aa.area`, ...pa);

  const mapa = new Map();
  const toca = (area) => {
    if (!mapa.has(area)) mapa.set(area, { area, rotulo: rotuloDe(AREAS, area), criancas: 0, atividades: 0, ultima: null });
    return mapa.get(area);
  };
  for (const a of aspiracoes) toca(a.area).criancas = a.criancas;
  for (const a of atividades) { const e = toca(a.area); e.atividades = a.atividades; e.ultima = a.ultima; }

  const areas = [...mapa.values()]
    .map(a => ({ ...a, lacuna: a.criancas > 0 && a.atividades === 0 }))
    .sort((a, b) => b.criancas - a.criancas || a.rotulo.localeCompare(b.rotulo));

  const comInteresse = areas.filter(a => a.criancas > 0);
  const cobertas = comInteresse.filter(a => a.atividades > 0);
  const lacunas = comInteresse.filter(a => a.lacuna);

  return {
    escopo: turmaId ? 'turma' : programaId ? 'programa' : 'instituto',
    periodo: { inicio, fim: ref },
    valor: comInteresse.length ? Math.round((cobertas.length / comInteresse.length) * 100) : 0,
    areas,
    areas_com_interesse: comInteresse.length,
    areas_cobertas: cobertas.length,
    aspiracoes_declaradas: comInteresse.reduce((a, x) => a + x.criancas, 0),
    lacunas,
    maior_lacuna: lacunas.sort((a, b) => b.criancas - a.criancas)[0] ?? null,
    doutrina: 'É a metodologia do próprio instituto virando indicador. A lacuna é publicada, não escondida.',
  };
}

// --------------------------------------------------------------------------
// F11 — Pauta de segunda. O laco de devolucao: o sistema deixa de cobrar e
// passa a devolver. Tres linhas acionaveis e uma sugestao — nada nasce de
// modelo, tudo nasce de regra sobre o que ja foi registrado.
// --------------------------------------------------------------------------
// Convencao ISO-8601: domingo pertence a semana que COMECOU na segunda anterior.
// E' o que mantem a chave da semana estavel — sem isso, a pauta de domingo
// gravaria numa semana diferente da mesma pauta vista no sabado.
export function segundaDa(iso = hoje()) {
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay();     // 0=dom … 6=sab
  return addDias(iso, dow === 0 ? -6 : 1 - dow);
}

// Sugestao por area em lacuna — repertorio fixo, escolhido por regra.
const BANCO_EXPOSICAO = {
  saude:      { codigo: 'EXP-SAUDE', titulo: 'Roda de conversa sobre profissões de cuidado', descricao: 'Convidar alguém do posto de saúde do território para contar como é o trabalho dela, e abrir perguntas das crianças.', duracao: '40–50 min' },
  educacao:   { codigo: 'EXP-EDUC',  titulo: 'Visita de quem trabalha com educação',        descricao: 'Uma professora ou bibliotecária do bairro conta o caminho até a profissão; a turma prepara três perguntas antes.', duracao: '40–50 min' },
  esporte:    { codigo: 'EXP-ESP',   titulo: 'Treino aberto com um profissional do esporte', descricao: 'Um treinador do campo ou quadra do bairro conduz um aquecimento e conversa sobre a rotina de quem vive disso.', duracao: '50–60 min' },
  artes:      { codigo: 'EXP-ART',   titulo: 'Oficina com artista do território',            descricao: 'Uma pessoa que faz arte no bairro traz o próprio material e mostra o processo, não só o resultado.', duracao: '50–60 min' },
  tecnologia: { codigo: 'EXP-TEC',   titulo: 'Encontro com quem trabalha com tecnologia',    descricao: 'Mostrar uma ferramenta simples de perto e explicar como se aprende — sem depender de equipamento novo.', duracao: '40–50 min' },
  outra:      { codigo: 'EXP-OUT',   titulo: 'Roda de profissões do território',             descricao: 'Cada criança traz uma profissão que existe na rua dela; a turma monta o mural do que é possível fazer aqui.', duracao: '30–40 min' },
};

/**
 * Monta a pauta da semana da turma. Nao grava nada — a decisao da educadora e'
 * que grava (`decidirPauta`).
 */
export function pautaDaSemana(turmaId, ref = hoje()) {
  const turma = get(
    `SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id = t.programa_id WHERE t.id = ?`, turmaId);
  if (!turma) throw erro(404, 'Turma não encontrada.');
  const semana = segundaDa(ref);

  // 1 — risco de sair
  const risco = riscoEvasao({ turmaId, ref });

  // 2 — sem exposicao
  const exp = exposicao({ turmaId, ref });

  // 3 — sugestao de pauta: a lacuna de exposicao manda; sem lacuna, cai para o
  //     foco pedagogico da turma (menor media da rubrica), via planoDaTurma.
  let sugestao = null;
  if (exp.maior_lacuna) {
    const b = BANCO_EXPOSICAO[exp.maior_lacuna.area] ?? BANCO_EXPOSICAO.outra;
    sugestao = { ...b, origem: 'exposição',
      porque: `${exp.maior_lacuna.criancas} criança(s) da turma declararam interesse em ${exp.maior_lacuna.rotulo} e não houve atividade da área no período.` };
  }

  const gravada = get(`SELECT * FROM pauta WHERE turma_id = ? AND semana = ?`, turmaId, semana);
  const tranquila = risco.em_risco === 0 && !exp.maior_lacuna;

  return {
    turma: { id: turma.id, nome: turma.nome, programa: turma.programa },
    semana, gerado_em: ref,
    tranquila,
    mensagem_tranquila: 'Ninguém sumiu do radar esta semana.',
    risco: {
      titulo: 'Risco de sair',
      n: risco.em_risco,
      criancas: risco.linhas.slice(0, 6).map(l => ({ crianca_id: l.crianca_id, nome: l.nome, motivo: l.motivo, valor: l.valor })),
      frase: 'Duas ou mais faltas seguidas. Uma ligação para a família costuma resolver.',
    },
    exposicao: {
      titulo: 'Sem exposição',
      area: exp.maior_lacuna?.rotulo ?? null,
      criancas: exp.maior_lacuna?.criancas ?? 0,
      frase: exp.maior_lacuna
        ? `${exp.maior_lacuna.criancas} criança(s) declararam interesse e não houve atividade da área no período.`
        : 'Todas as áreas com interesse declarado tiveram atividade no período.',
    },
    sugestao: sugestao ? { ...sugestao, decisao: gravada?.decisao ?? null, decidido_em: gravada?.decidido_em ?? null } : null,
    rodape: 'Você não preencheu nada além da chamada e de 40 segundos de voz.',
    doutrina: 'Pauta gerada por regra fixa sobre os registros. Nenhum item nasce de modelo.',
  };
}

/** Aceitar ou descartar a sugestao. O DESCARTE e' o dado que interessa. */
export function decidirPauta(turmaId, educadorId, decisao, ref = hoje()) {
  if (!['aceita', 'descartada'].includes(decisao)) throw erro(422, 'Decisão de pauta inválida.');
  const p = pautaDaSemana(turmaId, ref);
  if (!p.sugestao) throw erro(422, 'Não há sugestão de pauta nesta semana para decidir.');
  run(`INSERT INTO pauta (turma_id, semana, sugestao_codigo, sugestao_titulo, decisao, decidido_por, decidido_em)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(turma_id, semana) DO UPDATE SET
         sugestao_codigo=excluded.sugestao_codigo, sugestao_titulo=excluded.sugestao_titulo,
         decisao=excluded.decisao, decidido_por=excluded.decidido_por, decidido_em=excluded.decidido_em`,
      turmaId, p.semana, p.sugestao.codigo, p.sugestao.titulo, decisao, educadorId, agora());
  marcarAtividade(educadorId, 'pauta');
  return pautaDaSemana(turmaId, ref);
}

/**
 * Qualidade do agente de pauta: taxa de descarte.
 * Acima de DESCARTE_ALERTA a sugestao esta generica e a professora vai parar de
 * abrir — o numero vale um slide no pitch (06-AGENTES-IA).
 */
export function taxaDeDescarte({ turmaId = null } = {}) {
  const filtro = turmaId ? 'AND turma_id = ?' : '';
  const p = turmaId ? [turmaId] : [];
  const r = get(
    `SELECT COUNT(*) AS n,
            SUM(CASE WHEN decisao='descartada' THEN 1 ELSE 0 END) AS descartadas,
            SUM(CASE WHEN decisao='aceita' THEN 1 ELSE 0 END) AS aceitas
       FROM pauta WHERE decisao IS NOT NULL ${filtro}`, ...p);
  return {
    decididas: r.n ?? 0,
    aceitas: r.aceitas ?? 0,
    descartadas: r.descartadas ?? 0,
    pct: r.n ? Math.round(((r.descartadas ?? 0) / r.n) * 100) : null,
    limiar: PARAMS.DESCARTE_ALERTA,
    alerta: r.n ? Math.round(((r.descartadas ?? 0) / r.n) * 100) > PARAMS.DESCARTE_ALERTA : false,
  };
}

// --------------------------------------------------------------------------
// Estado do registro por crianca (tela `turma` do v2).
// O rotulo descreve O REGISTRO, nunca a crianca: "em acompanhamento" e
// "caminhando bem" classificavam a pessoa e sairam por decisao de desenho.
// --------------------------------------------------------------------------
export function estadoDoRegistro(turmaId, ref = hoje()) {
  const encontros = all(
    `SELECT id, data FROM encontro WHERE turma_id = ? AND data <= ? ORDER BY data DESC LIMIT 20`, turmaId, ref);
  return all(
    `SELECT c.id, c.codigo, c.nome FROM crianca c
       JOIN matricula m ON m.crianca_id = c.id AND m.turma_id = ? AND m.status='ativa'
      WHERE c.ativo = 1 ORDER BY c.nome`, turmaId)
    .map(c => {
      let sem = 0;
      for (const e of encontros) {
        const p = get(`SELECT status FROM presenca WHERE encontro_id = ? AND crianca_id = ?`, e.id, c.id);
        if (p) break;
        sem++;
      }
      return {
        ...c,
        sem_registro: sem,
        estado: sem === 0 ? 'em_dia' : 'atrasado',
        rotulo: sem === 0 ? 'registro em dia'
              : sem === 1 ? 'sem registro há 1 encontro'
              : `sem registro há ${sem} encontros`,
      };
    });
}
