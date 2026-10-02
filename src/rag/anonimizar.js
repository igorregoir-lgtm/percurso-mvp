// Percurso — pseudonimização determinística (Fase 1/2 do plano de IA).
//
// Substitui nomes de crianças por tokens ("Criança A", "Criança B", ...) em
// qualquer texto que vá para busca, log ou modelo. Casamento insensível a
// caixa E a acento (a educadora digita "Jose"; o roster tem "José").
//
// LIMITE RESIDUAL DECLARADO: cobre os nomes do roster (completos e primeiros
// nomes). Não cobre apelidos, paráfrases nem quase-identificadores ("o irmão
// gêmeo da turma B"). Por isso a UI orienta: descreva a situação, não a criança.
//
// ORDEM OBRIGATÓRIA com o filtro de perímetro (decisão 5): filtrarPerimetro
// roda ANTES, sobre o texto original com os nomes reais — a 5ª categoria
// (estado interno de criança nomeada) precisa do nome para disparar. A
// pseudonimização vem depois, sobre o texto que sobrou.

const ACENTOS = {
  a: '[aáàâãä]', e: '[eéèêë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]',
  A: '[AÁÀÂÃÄ]', E: '[EÉÈÊË]', I: '[IÍÌÎÏ]', O: '[OÓÒÔÕÖ]', U: '[UÚÙÛÜ]', C: '[CÇ]',
};

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function regexDoNome(nome) {
  // Constrói um padrão que casa o nome com ou sem acentos, caixa livre.
  let corpo = '';
  for (const c of semAcento(nome)) {
    if (/[a-zA-Z]/.test(c)) {
      const baixa = ACENTOS[c.toLowerCase()] || c.toLowerCase();
      const alta = ACENTOS[c.toUpperCase()] || c.toUpperCase();
      corpo += `(?:${baixa}|${alta})`;
    } else {
      corpo += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${corpo}(?![\\p{L}\\p{N}])`, 'gu');
}

const rotulo = (i) => {
  // A, B, ..., Z, AA, AB...
  let s = '';
  i += 1;
  while (i > 0) { i -= 1; s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26); }
  return s;
};

/**
 * @param {string} texto
 * @param {string[]} nomes  nomes completos do roster (a função também cobre o
 *                          primeiro nome de cada um)
 * @returns {{texto: string, mapa: Array<{token: string, nome: string}>, substituicoes: number}}
 *          mapa: token→nome, mantido FORA de qualquer prompt/log — é o caminho
 *          de volta (de-mapeamento) depois que o modelo devolve o token.
 */
export function anonimizarTexto(texto, nomes) {
  let t = String(texto ?? '');
  const mapa = [];
  let substituicoes = 0;

  // Uma entrada por criança; variantes (nome completo primeiro, depois primeiro
  // nome) apontam para o MESMO token. Ordena por comprimento para o nome
  // completo ganhar do primeiro nome.
  const entradas = (nomes || []).map((nome, i) => ({ nome, token: `Criança ${rotulo(i)}` }));
  const variantes = [];
  for (const e of entradas) {
    variantes.push({ padrao: e.nome, ...e });
    const partes = e.nome.trim().split(/\s+/);
    // "Ana Beatriz Souza" também cobre "Ana Beatriz" e "Ana" — do mais longo
    // para o mais curto, para o composto ganhar do primeiro nome sozinho.
    if (partes.length > 2) variantes.push({ padrao: partes.slice(0, 2).join(' '), ...e });
    if (partes[0] && partes[0].length >= 3 && partes.length > 1) variantes.push({ padrao: partes[0], ...e });
  }
  variantes.sort((a, b) => b.padrao.length - a.padrao.length);

  const usados = new Set();
  for (const v of variantes) {
    const re = regexDoNome(v.padrao);
    if (re.test(t)) {
      t = t.replace(re, () => { substituicoes++; return v.token; });
      if (!usados.has(v.token)) { usados.add(v.token); mapa.push({ token: v.token, nome: v.nome }); }
    }
  }
  return { texto: t, mapa, substituicoes };
}

/** Desfaz um token na saída do modelo — o de-mapeamento acontece FORA do
 *  modelo. Token desconhecido devolve null (quem chama decide o fallback). */
export function nomeDoToken(token, mapa) {
  return mapa.find(m => m.token === token)?.nome ?? null;
}
