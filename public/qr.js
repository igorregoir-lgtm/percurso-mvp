// Percurso — codificador de QR Code sem biblioteca (decisão 50).
//
// POR QUE ESCREVER UM. A decisão 1 (sem npm, sem build) continua de pé, e um QR
// e' a peça que faltava em três lugares de uma vez: o responsável entra no grupo
// da turma escaneando uma folha na parede em vez de digitar um link; a
// coordenação, no notebook, passa o texto pronto para o próprio celular sem
// e-mail nem cabo; e o perfil do Instagram cabe num cartaz. Nenhum dos três
// justifica uma dependência — o algoritmo e' aberto (ISO/IEC 18004) e cabe em
// duzentas linhas.
//
// O QUE ESTE CODIFICADOR FAZ, e so' isso: modo byte, correção M, versões 1 a
// 10 (até 213 bytes — um link de convite tem ~45, um wa.me com recado ~300 em
// UTF-8 encodado; acima disso a função recusa em vez de gerar lixo). Máscara
// escolhida por penalidade, como a norma manda: máscara fixa e' válida mas
// escaneia pior sob luz ruim, que e' a luz de um corredor.
//
// VERIFICADO com `BarcodeDetector` do navegador (Chromium/macOS) sobre os três
// tipos de conteúdo que o produto gera, em 04/09/2026 — o teste esta' em
// `scripts/unit-test.mjs` (estrutura) e a decodificação real foi feita no
// navegador antes de este arquivo entrar no produto.

// ------------------------------------------------------------ GF(256)
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

function geradorRS(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); }
    g = ng;
  }
  return g;
}
function codigosEC(dados, n) {
  const g = geradorRS(n);
  const resto = new Array(n).fill(0);
  for (const d of dados) {
    const fator = d ^ resto[0];
    resto.shift(); resto.push(0);
    if (fator) for (let j = 0; j < n; j++) resto[j] ^= mul(g[j + 1], fator);
  }
  return resto;
}

// ------------------------------------------------------ tabelas (nível M)
// [total codewords, ec por bloco, [ [nBlocos, dadosPorBloco], ... ]]
const VERSOES = {
  1:  [26, 10, [[1, 16]]],
  2:  [44, 16, [[1, 28]]],
  3:  [70, 26, [[1, 44]]],
  4:  [100, 18, [[2, 32]]],
  5:  [134, 24, [[2, 43]]],
  6:  [172, 16, [[4, 27]]],
  7:  [196, 18, [[4, 31]]],
  8:  [242, 22, [[2, 38], [2, 39]]],
  9:  [292, 22, [[3, 36], [2, 37]]],
  10: [346, 26, [[4, 43], [1, 44]]],
};
const ALINHAMENTO = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

const capacidadeBytes = (v) => {
  const [, , blocos] = VERSOES[v];
  const dados = blocos.reduce((s, [n, k]) => s + n * k, 0);
  return dados - (v < 10 ? 2 : 3);   // modo (4 bits) + contagem (8 ou 16 bits)
};

// ------------------------------------------------------------ bits
function fluxoDeBits(bytes, versao) {
  const [, , blocos] = VERSOES[versao];
  const totalDados = blocos.reduce((s, [n, k]) => s + n * k, 0);
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, versao < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const teto = totalDados * 8;
  for (let i = 0; i < 4 && bits.length < teto; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let k = 0; out.length < totalDados; k++) out.push(k % 2 ? 0x11 : 0xec);
  return out;
}

function intercalar(codewords, versao) {
  const [, ec, blocos] = VERSOES[versao];
  const dadosBlocos = [], ecBlocos = [];
  let pos = 0;
  for (const [n, k] of blocos) for (let i = 0; i < n; i++) {
    const d = codewords.slice(pos, pos + k); pos += k;
    dadosBlocos.push(d); ecBlocos.push(codigosEC(d, ec));
  }
  const saida = [];
  const maxD = Math.max(...dadosBlocos.map(b => b.length));
  for (let i = 0; i < maxD; i++) for (const b of dadosBlocos) if (i < b.length) saida.push(b[i]);
  for (let i = 0; i < ec; i++) for (const b of ecBlocos) saida.push(b[i]);
  return saida;
}

// ------------------------------------------------------------ matriz
function matrizBase(versao) {
  const N = versao * 4 + 17;
  const m = Array.from({ length: N }, () => new Int8Array(N).fill(-1)); // -1 = livre
  const localizador = (r, c) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
      const borda = i === -1 || i === 7 || j === -1 || j === 7;
      const anel = i === 0 || i === 6 || j === 0 || j === 6;
      const centro = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      m[rr][cc] = borda ? 0 : (anel || centro) ? 1 : 0;
    }
  };
  localizador(0, 0); localizador(0, N - 7); localizador(N - 7, 0);
  // ORDEM IMPORTA: alinhamento ANTES do sincronismo. A partir da versão 7 há
  // padrões de alinhamento centrados na linha e na coluna 6 — em cima do
  // sincronismo —, e desenhar o sincronismo primeiro fazia a checagem de
  // colisão pular esses padrões. O leitor decodificava até a v6 e falhava
  // exatamente na v7, que foi como o defeito apareceu.
  const al = ALINHAMENTO[versao];
  for (const r of al) for (const c of al) {
    if (m[r][c] !== -1) continue;   // colide com localizador (único caso a pular)
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++)
      m[r + i][c + j] = (Math.max(Math.abs(i), Math.abs(j)) === 1) ? 0 : 1;
  }
  for (let i = 8; i < N - 8; i++) {
    if (m[6][i] === -1) m[6][i] = i % 2 === 0 ? 1 : 0;
    if (m[i][6] === -1) m[i][6] = i % 2 === 0 ? 1 : 0;
  }
  m[N - 8][8] = 1;   // módulo escuro
  // reserva das áreas de formato (e de versão, quando >= 7)
  for (let i = 0; i < 9; i++) { if (m[8][i] === -1) m[8][i] = 0; if (m[i][8] === -1) m[i][8] = 0; }
  for (let i = 0; i < 8; i++) { if (m[8][N - 1 - i] === -1) m[8][N - 1 - i] = 0; if (m[N - 1 - i][8] === -1) m[N - 1 - i][8] = 0; }
  if (versao >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { m[i][N - 11 + j] = 0; m[N - 11 + j][i] = 0; }
  return m;
}

function colocarDados(m, codewords) {
  const N = m.length;
  const bits = [];
  for (const b of codewords) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  let k = 0, sobe = true;
  for (let col = N - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let n = 0; n < N; n++) {
      const r = sobe ? N - 1 - n : n;
      for (const c of [col, col - 1]) {
        if (m[r][c] === -1) { m[r][c] = k < bits.length ? bits[k] : 0; m[r][c] |= 0x10; k++; } // 0x10 marca "dado"
      }
    }
    sobe = !sobe;
  }
}

const MASCARAS = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (_, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0,
];

function aplicarMascara(base, idx) {
  const N = base.length;
  const m = base.map(l => Int8Array.from(l));
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
    if (m[i][j] & 0x10) { const v = m[i][j] & 1; m[i][j] = MASCARAS[idx](i, j) ? v ^ 1 : v; }
    else m[i][j] &= 1;
  return m;
}

function bch(valor, gerador, bitsGer) {
  let v = valor;
  const grau = 31 - Math.clz32(gerador);
  for (let i = bitsGer - 1; i >= grau; i--) if ((v >> i) & 1) v ^= gerador << (i - grau);
  return v;
}
function escreverFormato(m, mascara) {
  const N = m.length;
  const dados = (0b00 << 3) | mascara;               // nível M = 00
  const f = ((dados << 10) | bch(dados << 10, 0x537, 15)) ^ 0x5412;
  const bit = (i) => (f >> i) & 1;
  for (let i = 0; i < 6; i++) m[8][i] = bit(14 - i);
  m[8][7] = bit(8); m[8][8] = bit(7); m[7][8] = bit(6);
  for (let i = 0; i < 6; i++) m[5 - i][8] = bit(i);
  for (let i = 0; i < 7; i++) m[N - 1 - i][8] = bit(14 - i);
  for (let i = 0; i < 8; i++) m[8][N - 8 + i] = bit(7 - i);
}
function escreverVersao(m, versao) {
  if (versao < 7) return;
  const N = m.length;
  const v = (versao << 12) | bch(versao << 12, 0x1f25, 18);
  for (let i = 0; i < 18; i++) {
    const b = (v >> i) & 1, r = Math.floor(i / 3), c = i % 3;
    m[r][N - 11 + c] = b; m[N - 11 + c][r] = b;
  }
}

function penalidade(m) {
  const N = m.length; let p = 0;
  for (let i = 0; i < N; i++) {
    let corr = 1, corc = 1;
    for (let j = 1; j < N; j++) {
      if (m[i][j] === m[i][j - 1]) { corr++; if (corr === 5) p += 3; else if (corr > 5) p++; } else corr = 1;
      if (m[j][i] === m[j - 1][i]) { corc++; if (corc === 5) p += 3; else if (corc > 5) p++; } else corc = 1;
    }
  }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++)
    if (m[i][j] === m[i + 1][j] && m[i][j] === m[i][j + 1] && m[i][j] === m[i + 1][j + 1]) p += 3;
  const padrao = [1, 0, 1, 1, 1, 0, 1];
  const casa = (get, k) => {
    for (let t = 0; t < 7; t++) if (get(k + t) !== padrao[t]) return false;
    let a = true, b = true;
    for (let t = 1; t <= 4; t++) { if (get(k - t) !== 0) a = false; if (get(k + 7 - 1 + t) !== 0) b = false; }
    return a || b;
  };
  for (let i = 0; i < N; i++) for (let k = 0; k <= N - 7; k++) {
    if (casa(x => (x < 0 || x >= N) ? 0 : m[i][x], k)) p += 40;
    if (casa(x => (x < 0 || x >= N) ? 0 : m[x][i], k)) p += 40;
  }
  let escuros = 0;
  for (const l of m) for (const v of l) escuros += v;
  const pct = (escuros * 100) / (N * N);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return p;
}

/** Codifica `texto` (UTF-8) e devolve a matriz de módulos (1 = escuro). */
export function codificarQR(texto) {
  const bytes = Array.from(new TextEncoder().encode(String(texto)));
  let versao = 0;
  for (let v = 1; v <= 10; v++) if (bytes.length <= capacidadeBytes(v)) { versao = v; break; }
  if (!versao) throw new Error(`O conteúdo tem ${bytes.length} bytes; este QR vai até ${capacidadeBytes(10)}.`);
  const codewords = intercalar(fluxoDeBits(bytes, versao), versao);
  const base = matrizBase(versao);
  colocarDados(base, codewords);
  let melhor = null, menor = Infinity;
  for (let k = 0; k < 8; k++) {
    const m = aplicarMascara(base, k);
    escreverFormato(m, k); escreverVersao(m, versao);
    const p = penalidade(m);
    if (p < menor) { menor = p; melhor = m; }
  }
  return { modulos: melhor.map(l => Array.from(l)), versao, tamanho: melhor.length };
}

/** Desenha num canvas. `escala` em px por módulo; margem quieta de 4 módulos, como a norma pede. */
export function desenharQR(canvas, texto, { escala = 6, margem = 4, cor = '#2E2A24', fundo = '#FFFFFF' } = {}) {
  const { modulos, tamanho } = codificarQR(texto);
  const px = (tamanho + margem * 2) * escala;
  canvas.width = px; canvas.height = px;
  const g = canvas.getContext('2d');
  g.fillStyle = fundo; g.fillRect(0, 0, px, px);
  g.fillStyle = cor;
  for (let i = 0; i < tamanho; i++) for (let j = 0; j < tamanho; j++)
    if (modulos[i][j]) g.fillRect((j + margem) * escala, (i + margem) * escala, escala, escala);
  return canvas;
}

/** SVG inline — para imprimir sem perder nitidez. */
export function svgQR(texto, { modulo = 4, margem = 4, cor = '#2E2A24' } = {}) {
  const { modulos, tamanho } = codificarQR(texto);
  const lado = (tamanho + margem * 2) * modulo;
  let d = '';
  for (let i = 0; i < tamanho; i++) for (let j = 0; j < tamanho; j++)
    if (modulos[i][j]) d += `M${(j + margem) * modulo} ${(i + margem) * modulo}h${modulo}v${modulo}h-${modulo}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${cor}"/></svg>`;
}
