// Percurso — a planilha socioemocional do Instituto, preenchida pelo produto.
//
// DECISÃO 34 (02/09/2026). O Instituto tem em mãos uma planilha com seis
// indicadores (Autocontrole, Convivência, Participação, Expressão emocional,
// Autoestima, Resiliência) numa escala de frequência 0–2 (não apresenta / às
// vezes / com frequência), avaliada em dois momentos (inicial × final), com a
// evolução calculada e uma leitura por indicador (≥70% melhoraram = resultado
// forte; ≥50% = evolução moderada; senão, atenção). É o instrumento que a casa
// conhece — e o método 0/1/2 (piorou/manteve/evoluiu) que a psicóloga viu
// funcionar na outra organização.
//
// O Percurso NÃO substitui a planilha: a rubrica continua em 4 níveis ancorados
// em comportamento (mais fina que uma escala de frequência), e este módulo
// devolve a planilha preenchida a partir da rubrica. O mapeamento 1–4 → 0–2 vive
// AQUI, num lugar só, e é declarado como PROVISÓRIO até o aval da psicóloga.
//
// Nada daqui sai da organização com nome: a exportação leva o CÓDIGO da
// criança; o cadastro que liga código a nome fica com a coordenação.
import { all, get } from './db.js';
import { PARAMS, erro, ciclos as todosOsCiclos } from './domain.js';

/** Nível da âncora (1–4) → nota da planilha (0–2). Provisório (decisão 34). */
export const NIVEL_PARA_PLANILHA = Object.freeze({ 1: 0, 2: 1, 3: 1, 4: 2 });
export const LEGENDA_PLANILHA = '0 = não apresenta · 1 = às vezes apresenta · 2 = apresenta com frequência. ' +
  'Mapeamento provisório da rubrica do Percurso (níveis 1–4) para a planilha: 1→0, 2→1, 3→1, 4→2.';

/** Os limiares de leitura são os da própria planilha (aba Indicadores). */
export const LEITURA = Object.freeze({ FORTE: 0.7, MODERADA: 0.5 });
export function leituraDe(pctMelhoraram) {
  if (pctMelhoraram == null) return null;
  if (pctMelhoraram >= LEITURA.FORTE) return 'Resultado forte';
  if (pctMelhoraram >= LEITURA.MODERADA) return 'Evolução moderada';
  return 'Atenção para acompanhamento';
}

/** piorou = 0 · manteve = 1 · evoluiu = 2 — o método da outra organização,
 *  aplicado sobre a nota já mapeada. */
export function evolucao012(inicial, final) {
  if (inicial == null || final == null) return null;
  return final > inicial ? 2 : final < inicial ? 0 : 1;
}
export const ROTULO_EVOLUCAO = Object.freeze({ 0: 'piorou', 1: 'manteve', 2: 'evoluiu' });

/** Os dois ciclos comparados por padrão: os dois mais recentes com observação concluída. */
export function ciclosPadrao() {
  const comObs = all(
    `SELECT DISTINCT ci.id, ci.nome, ci.ano, ci.ordem FROM ciclo ci
       JOIN observacao o ON o.ciclo_id = ci.id AND o.status = 'concluida'
      ORDER BY ci.ano, ci.ordem`);
  if (comObs.length < 2) return { inicial: comObs[0] ?? null, final: comObs.at(-1) ?? null };
  return { inicial: comObs.at(-2), final: comObs.at(-1) };
}

function cicloOu404(id) {
  const c = get(`SELECT * FROM ciclo WHERE id = ?`, id);
  if (!c) throw erro(404, 'Ciclo não encontrado.');
  return c;
}

/**
 * As linhas da aba "Avaliações": uma por criança com observação concluída em
 * pelo menos um dos dois ciclos. Sem nome — código, turma e as notas mapeadas.
 */
export function linhasDaPlanilha({ cicloInicialId, cicloFinalId, programaId = null } = {}) {
  const padrao = ciclosPadrao();
  const ini = cicloOu404(cicloInicialId ?? padrao.inicial?.id);
  const fim = cicloOu404(cicloFinalId ?? padrao.final?.id);
  if (ini.id === fim.id) throw erro(422, 'Escolha dois ciclos diferentes para comparar inicial e final.');
  const dims = all(`SELECT id, codigo, nome, ordem FROM dimensao ORDER BY ordem`);
  const filtroProg = programaId
    ? `AND o.crianca_id IN (SELECT crianca_id FROM matricula WHERE status='ativa' AND programa_id = ?)` : '';
  const p = programaId ? [programaId] : [];
  const linhas = all(
    `SELECT o.crianca_id, o.ciclo_id, oi.dimensao_id, oi.nivel, c.codigo,
            (SELECT GROUP_CONCAT(t.nome, ' · ') FROM matricula m JOIN turma t ON t.id = m.turma_id
              WHERE m.crianca_id = c.id AND m.status='ativa') AS turma
       FROM observacao o
       JOIN observacao_item oi ON oi.observacao_id = o.id
       JOIN crianca c ON c.id = o.crianca_id
      WHERE o.status = 'concluida' AND o.ciclo_id IN (?, ?) ${filtroProg}
      ORDER BY c.codigo, oi.dimensao_id`, ini.id, fim.id, ...p);
  const porCrianca = new Map();
  for (const l of linhas) {
    if (!porCrianca.has(l.crianca_id))
      porCrianca.set(l.crianca_id, { codigo: l.codigo, turma: l.turma ?? '', notas: {} });
    const r = porCrianca.get(l.crianca_id);
    const chave = l.ciclo_id === ini.id ? 'inicial' : 'final';
    r.notas[l.dimensao_id] ??= { inicial: null, final: null };
    r.notas[l.dimensao_id][chave] = NIVEL_PARA_PLANILHA[l.nivel] ?? null;
  }
  const criancas = [...porCrianca.values()].map(r => {
    const indicadores = dims.map(d => {
      const n = r.notas[d.id] ?? { inicial: null, final: null };
      return { codigo: d.codigo, nome: d.nome, inicial: n.inicial, final: n.final,
               evolucao: n.inicial != null && n.final != null ? n.final - n.inicial : null,
               evolucao_012: evolucao012(n.inicial, n.final) };
    });
    const completa = (chave) => indicadores.every(i => i[chave] != null);
    return {
      codigo: r.codigo, turma: r.turma, indicadores,
      total_inicial: completa('inicial') ? indicadores.reduce((s, i) => s + i.inicial, 0) : null,
      total_final: completa('final') ? indicadores.reduce((s, i) => s + i.final, 0) : null,
    };
  });
  return { ciclo_inicial: ini, ciclo_final: fim, dimensoes: dims, criancas, legenda: LEGENDA_PLANILHA };
}

/**
 * A aba "Indicadores": média inicial, média final, avaliadas, quantas
 * melhoraram, % e a leitura — por indicador e no geral. Supressão de célula
 * pequena vale aqui como em todo agregado do produto (PARAMS.MINIMO_CELULA):
 * abaixo dela a linha sai sem número e sem leitura.
 */
export function resumoPlanilha(opcoes = {}) {
  const base = linhasDaPlanilha(opcoes);
  const media = (xs) => xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null;
  const linha = (nome, pares) => {
    const comInicial = pares.filter(p => p.inicial != null).map(p => p.inicial);
    const comFinal = pares.filter(p => p.final != null).map(p => p.final);
    const comPar = pares.filter(p => p.inicial != null && p.final != null);
    const avaliadas = comFinal.length;
    const suprimida = avaliadas < PARAMS.MINIMO_CELULA;
    const melhoraram = comPar.filter(p => p.final > p.inicial).length;
    const pct = comPar.length ? Math.round((melhoraram / comPar.length) * 100) / 100 : null;
    return suprimida
      ? { indicador: nome, suprimida: true, avaliadas, media_inicial: null, media_final: null,
          evolucao_media: null, melhoraram: null, pct_melhoraram: null, leitura: null }
      : { indicador: nome, suprimida: false, avaliadas,
          media_inicial: media(comInicial), media_final: media(comFinal),
          evolucao_media: media(comInicial) != null && media(comFinal) != null
            ? Math.round((media(comFinal) - media(comInicial)) * 100) / 100 : null,
          melhoraram, comparadas: comPar.length, pct_melhoraram: pct, leitura: leituraDe(pct) };
  };
  const indicadores = base.dimensoes.map(d =>
    linha(d.nome, base.criancas.map(c => c.indicadores.find(i => i.codigo === d.codigo))));
  const geral = linha('Geral', base.criancas.map(c => ({ inicial: c.total_inicial, final: c.total_final })));
  return {
    ciclo_inicial: base.ciclo_inicial, ciclo_final: base.ciclo_final,
    criancas_avaliadas: base.criancas.length,
    indicadores, geral,
    minimo_celula: PARAMS.MINIMO_CELULA,
    legenda: LEGENDA_PLANILHA,
    limiares: { forte: LEITURA.FORTE, moderada: LEITURA.MODERADA },
    // A leitura é da planilha; a ressalva é do Percurso e vai junto sempre.
    ressalva: 'A leitura é de associação: fatores externos não foram isolados.',
  };
}

/** CSV no formato da aba "Avaliações" — UTF-8 com BOM e ";" (abre no Excel em pt-BR). */
export function csvPlanilha(opcoes = {}) {
  const b = linhasDaPlanilha(opcoes);
  const abrev = (nome) => nome.split(' ')[0].slice(0, 7);
  const cab = ['ID', 'Turma',
    ...b.dimensoes.flatMap(d => [`${abrev(d.nome)} inicial`, `${abrev(d.nome)} final`, `Evolução ${abrev(d.nome).toLowerCase()}`]),
    'Total inicial', 'Total final', 'Evolução 0/1/2 (geral)'];
  const cel = (v) => v == null ? '' : String(v).includes(';') || String(v).includes('"')
    ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const linhas = b.criancas.map(c => [
    c.codigo, c.turma,
    ...c.indicadores.flatMap(i => [i.inicial, i.final, i.evolucao]),
    c.total_inicial, c.total_final,
    c.total_inicial != null && c.total_final != null ? ROTULO_EVOLUCAO[evolucao012(c.total_inicial, c.total_final)] : '',
  ].map(cel).join(';'));
  const rodape = [
    '',
    `# Percurso · planilha socioemocional · ${b.ciclo_inicial.nome} (inicial) × ${b.ciclo_final.nome} (final)`,
    `# ${LEGENDA_PLANILHA}`,
    '# Sem nome por construção: o cadastro que liga código a criança fica com a coordenação.',
  ];
  return '\uFEFF' + [cab.join(';'), ...linhas, ...rodape].join('\r\n');
}

export function ciclosDisponiveis() {
  return todosOsCiclos();
}
