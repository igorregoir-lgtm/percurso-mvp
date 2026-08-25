// Percurso — o ranking do painel do Passo. Módulo PURO: sem banco, sem modelo,
// sem relógio. Recebe candidatos e pesos, devolve ordem. É testável sozinho e é
// onde moram as travas que impedem o painel de virar lista de dívida.
//
// A ideia central: a URGÊNCIA INSTITUCIONAL (`base`, escrita à mão no catálogo)
// manda. A preferência da pessoa só REORDENA vizinhos, dentro de um teto —
// nunca atravessa faixas de base. Assim o Passo aprende com quem usa sem virar
// bolha: o que o instituto precisa que apareça continua aparecendo.
export const SLOTS = 3;
export const TETO_PESSOAL = 0.15;
export const PISO_NUCLEO = 0.85;
const MEIA_VIDA_DIAS = 21;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Decaimento preguiçoso: sem cron, aplicado na leitura e na escrita da linha. */
export const decair = (peso, diasAtras) =>
  peso * Math.pow(0.5, Math.max(0, diasAtras) / MEIA_VIDA_DIAS);

/**
 * Pontua um candidato. `pesos` é o perfil de uso (vazio = determinístico puro).
 * O invariante que o teste trava: com `pesos` vazio ou `aprender: false`, a
 * pontuação é EXATAMENTE `base/100` (mais o piso de núcleo) — o mesmo resultado
 * do produto sem personalização nenhuma.
 */
export function pontuar(c, pesos = {}, prefs = {}) {
  const base = c.base / 100;
  let ajuste = 0;

  if (prefs.aprender !== false && !c.nucleo) {
    const p = (familia, chave, evento) => pesos[`${familia}:${chave}:${evento}`] ?? 0;
    const m = p('sugestao', c.id, 'mostrada');
    const a = p('sugestao', c.id, 'aceita');
    const d = p('sugestao', c.id, 'dispensada');
    const ta = p('tipo', c.tipo, 'aceita');
    const tm = p('tipo', c.tipo, 'mostrada');

    const afinidade = clamp((a - d) / (m + 3), -1, 1);          // +3 é o prior
    const afinTipo  = clamp((ta - Math.max(0, tm - ta)) / 6, -1, 1);
    const novidade  = m === 0 ? 1 : 1 / (1 + Math.log(1 + m));  // decai, nunca zera
    const fadiga    = (m >= 5 && a === 0) ? -1 : 0;
    const declarada = prefs.prefere_tipo === c.tipo ? 1 : 0;

    // AS PENALIDADES ENTRAM DENTRO DO CLAMP. Fora dele o clamp seria decorativo:
    // os termos positivos já cabem na faixa e só as penalidades a estouram — era
    // assim que uma base 0,20 vencia uma base 0,90.
    ajuste = clamp(
      0.45 * afinidade + 0.20 * afinTipo + 0.20 * novidade + 0.25 * fadiga + 0.30 * declarada,
      -TETO_PESSOAL, TETO_PESSOAL);
  }

  let pontos = clamp(base + ajuste, 0, 1);
  // O piso roda DEPOIS do ajuste: o sinal que o instituto precisa ver entra
  // mesmo com afinidade zero e vinte dispensas.
  if (c.nucleo) pontos = Math.max(pontos, PISO_NUCLEO);
  return pontos;
}

/**
 * Compõe o painel. As travas aqui são o que impede o somatório de virar
 * cobrança diária — cada item pode ser gentil e o conjunto ser uma lista de
 * dívida. Teto de UMA pendência por painel; o alívio pode vencer o painel.
 */
export function compor(ordenados, { slots = SLOTS } = {}) {
  const saida = [];
  const usados = { pendencia: 0, duvida: 0, porTipo: {} };
  const anota = (c) => {
    if (c.classe === 'pendencia') usados.pendencia++;
    if (c.tipo === 'duvida') usados.duvida++;
    usados.porTipo[c.tipo] = (usados.porTipo[c.tipo] ?? 0) + 1;
  };

  // Dia sem pendência nenhuma: o alívio abre o painel. É o único caso em que
  // uma base menor passa na frente — e é deliberado.
  const alivio = ordenados.find(c => c.classe === 'alivio');
  if (alivio && !ordenados.some(c => c.classe === 'pendencia')) { saida.push(alivio); anota(alivio); }

  for (const c of ordenados) {
    if (saida.length >= slots) break;
    if (saida.includes(c)) continue;
    if (c.classe === 'pendencia' && usados.pendencia >= 1) continue;
    if (c.tipo === 'duvida' && usados.duvida >= 1) continue;
    if ((usados.porTipo[c.tipo] ?? 0) >= 2) continue;
    saida.push(c); anota(c);
  }
  return saida;
}

/** Ordem estável e testável: pontos desc, base desc, id asc. */
export function ordenar(candidatos, pesos = {}, prefs = {}, silenciadas = new Set()) {
  return candidatos
    .map(c => ({ ...c, pontos: silenciadas.has(c.id) ? -Infinity : pontuar(c, pesos, prefs) }))
    .filter(c => c.pontos > -Infinity)
    .sort((x, y) => (y.pontos - x.pontos) || (y.base - x.base) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/**
 * Exploração determinística (não aleatória — testável): a cada três dias, a
 * última vaga vai para algo que a pessoa nunca viu. Sem isso, quem tem um
 * estado estável nunca descobre o resto do produto.
 */
export function explorar(saida, ordenados, pesos, diaDoAno) {
  if (diaDoAno == null || diaDoAno % 3 !== 0 || saida.length < SLOTS) return saida;
  const inedita = ordenados.find(c =>
    !saida.includes(c) && (pesos[`sugestao:${c.id}:mostrada`] ?? 0) === 0);
  if (!inedita) return saida;
  return [...saida.slice(0, SLOTS - 1), inedita];
}
