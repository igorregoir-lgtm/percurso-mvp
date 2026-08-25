// Percurso — motor SROI exploratório (Fase 3 do plano de IA).
//
// DETERMINÍSTICO E VERSIONADO: nenhum modelo de linguagem toca em número.
// Implementa a equação do plano (§5.8 / ANALISE §5.8):
//
//   benefício_t = N × Δresultado × proxy × (1−deadweight) × (1−atribuição) ×
//                 (1−deslocamento) × (1−drop-off)^t ÷ (1+desconto)^t
//   SROI = Σ benefícios presentes ÷ investimento total
//
// Regras de apresentação (§5.9): sempre 3 cenários e FAIXA, nunca número único;
// dupla contagem bloqueada (envelope XOR componentes); toda premissa sai no
// resultado com valor, fonte, ano-base e ressalva.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erro } from '../domain.js';

export const VERSAO_MOTOR = '1.0.0';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let cachePremissas = null;

export function premissas() {
  cachePremissas ??= JSON.parse(readFileSync(join(RAIZ, 'data', 'sroi', 'premissas.json'), 'utf8'));
  return cachePremissas;
}

const RESSALVAS_FIXAS = [
  'Cenário EXPLORATÓRIO: associação compatível, não causalidade comprovada.',
  'A ponte causal programa → desfecho monetizado é pendência declarada (nenhum coeficiente local validado).',
  'Fatores externos não foram isolados.',
  'Faixa entre cenários, nunca número único com falsa precisão.',
  'Uso externo exige revisão humana prévia (gate da metodologia).',
];

function proxyPorId(id) {
  const p = premissas().proxies.find(x => x.id === id);
  if (!p) throw erro(422, `Proxy desconhecida: ${id}.`);
  return p;
}

/** Bloqueio de dupla contagem: envelope total XOR componentes (grupo_exclusivo). */
function validarDuplaContagem(ids) {
  const grupos = ids.map(id => proxyPorId(id).grupo_exclusivo).filter(Boolean);
  const temTotal = grupos.includes('evasao-insper-total');
  const temComponente = grupos.includes('evasao-insper-componentes');
  if (temTotal && temComponente)
    throw erro(422, 'Dupla contagem bloqueada: o envelope de R$ 372 mil JÁ CONTÉM os componentes (renda, qualidade de vida, violência). Escolha o total OU os componentes — nunca os dois.');
  if (grupos.filter(g => g === 'evasao-insper-total').length > 1)
    throw erro(422, 'O envelope total só pode entrar uma vez.');
}

/**
 * Calcula os 3 cenários para um conjunto de proxies de cenário.
 * @param {object} p
 * @param {number} p.criancas             N — crianças únicas consideradas
 * @param {number} p.investimento_anual   custo anual do programa (R$)
 * @param {string[]} p.proxy_ids          proxies com uso "cenario"
 * @param {number} [p.horizonte_anos=5]
 * @param {object} [p.cenarios]           override dos parâmetros padrão
 */
export function calcular({ criancas, investimento_anual, proxy_ids, horizonte_anos = 5, cenarios = null }) {
  const N = Number(criancas);
  const inv = Number(investimento_anual);
  const T = horizonte_anos == null ? 5 : Number(horizonte_anos);
  if (!Number.isFinite(N) || N <= 0) throw erro(422, 'Informe o número de crianças únicas (N > 0).');
  if (!Number.isFinite(inv) || inv <= 0) throw erro(422, 'Informe o investimento anual do programa (R$ > 0).');
  // Horizonte inválido é erro declarado, não default silencioso (0 anos não
  // "vira 5"; fração de ano não entra na série anual).
  if (!Number.isInteger(T) || T < 1 || T > 30)
    throw erro(422, 'Horizonte inválido: informe um número inteiro de anos entre 1 e 30.');
  if (!Array.isArray(proxy_ids) || !proxy_ids.length) throw erro(422, 'Escolha ao menos uma proxy de cenário.');

  const escolhidas = proxy_ids.map(proxyPorId);
  for (const p of escolhidas) {
    if (!p.uso.includes('cenario'))
      throw erro(422, `A proxy "${p.nome}" é de ${p.uso.join('/')} — benchmarks e referências não entram no cálculo por criança.`);
  }
  validarDuplaContagem(proxy_ids);

  const padrao = premissas().cenarios_padrao;
  const conjuntos = ['conservador', 'base', 'superior'].map(nome => {
    const c = { ...padrao[nome], ...(cenarios?.[nome] || {}) };
    for (const [k, v] of Object.entries(c)) {
      if (!Number.isFinite(v) || v < 0 || v > 1)
        throw erro(422, `Parâmetro inválido no cenário ${nome}: ${k}=${v} (esperado 0..1).`);
    }
    return { nome, parametros: c };
  });

  const investimento_total = inv * T;
  const resultados = conjuntos.map(({ nome, parametros: c }) => {
    const somaProxies = escolhidas.reduce((s, p) => s + p.valor, 0);
    // Fator fixo do cenário (não varia no tempo)…
    const base = N * c.efeito_incremental * somaProxies *
      (1 - c.deadweight) * (1 - c.atribuicao) * (1 - c.deslocamento);
    // …distribuído no horizonte com drop-off e desconto. O valor do desfecho é
    // "ao longo da vida": tratamos o efeito como conquistado em frações anuais
    // iguais (1/T por ano) — transparente e conservador.
    const serie = [];
    let presente = 0;
    for (let t = 1; t <= T; t++) {
      const anual = (base / T) * Math.pow(1 - c.dropoff, t - 1) / Math.pow(1 + c.desconto, t);
      serie.push({ ano: t, beneficio_presente: arred(anual) });
      presente += anual;
    }
    return {
      cenario: nome,
      parametros: c,
      beneficio_presente_total: arred(presente),
      investimento_total: arred(investimento_total),
      sroi: arred(presente / investimento_total, 2),
      serie_anual: serie,
    };
  });

  const sroiVals = resultados.map(r => r.sroi);
  return {
    versao_motor: VERSAO_MOTOR,
    versao_premissas: premissas().versao,
    entradas: { criancas: N, investimento_anual: inv, horizonte_anos: T, proxy_ids },
    proxies_usadas: escolhidas.map(p => ({
      id: p.id, nome: p.nome, valor: p.valor, unidade: p.unidade,
      ano_base: p.ano_base, fonte: p.fonte, url: p.url, confianca: p.confianca,
      status_ebenezer: p.status_ebenezer, ressalva: p.ressalva,
    })),
    cenarios: resultados,
    faixa_sroi: { minimo: Math.min(...sroiVals), maximo: Math.max(...sroiVals) },
    leitura_obrigatoria: `Faixa exploratória de R$ ${Math.min(...sroiVals).toFixed(2).replace('.', ',')} a R$ ${Math.max(...sroiVals).toFixed(2).replace('.', ',')} de valor social potencial por R$ 1 investido — associação compatível, não causalidade comprovada.`,
    ressalvas: RESSALVAS_FIXAS,
    benchmarks: premissas().proxies.filter(p => p.uso.includes('benchmark')).map(p => ({
      id: p.id, nome: p.nome, valor: p.valor, faixa: p.faixa ?? null, fonte: p.fonte, ressalva: p.ressalva,
    })),
  };
}

const arred = (v, casas = 0) => {
  const f = Math.pow(10, casas);
  return Math.round(v * f) / f;
};
