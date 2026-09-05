// Percurso — servidor. Node puro: nenhum framework, nenhuma dependencia.
// Uso:  node server.js                        (HTTP, so' nesta maquina)
//       PERCURSO_HTTPS=1 node server.js       (HTTPS na LAN — exige certs/)
//
// POR QUE HTTPS: `getUserMedia` so' funciona em CONTEXTO SEGURO. `localhost`
// conta; o IP da LAN, que e' como o celular alcanca o servidor do Instituto,
// nao conta. Sem isto, a captura de audio nao existe no aparelho dela.
// Gerar o certificado: node scripts/gerar-certificado.mjs
//
// HTTPS e' OPT-IN de proposito: o CI e a bateria smoke batem em
// http://localhost:3000, e um certificado esquecido no disco nao pode mudar o
// comportamento padrao do servidor sem alguem pedir.
import { createServer } from 'node:http';
import { createServer as createServerHttps } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { getDb, get } from './src/db.js';
import * as EVI from './src/evidencia.js';
import { rotas, usuarioDa } from './src/api.js';
import { varrerOrfaos } from './src/transcricao.js';
import { invalidarSinais } from './src/aurora/sinais.js';
import { semear } from './src/seed.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(ROOT, 'public');
const PORTA = Number(process.env.PORT) || 3000;
const HTTPS = process.env.PERCURSO_HTTPS === '1';
// Em hospedagem, PORT implica bind público (Render e plataformas equivalentes).
// No uso local sem PORT, limita o MVP à própria máquina por segurança.
// HTTPS existe PARA a LAN — pedir HTTPS e continuar preso a 127.0.0.1 seria
// gerar certificado para ninguém —, então ele implica bind na rede.
const HOST = process.env.HOST || ((process.env.PORT || HTTPS) ? '0.0.0.0' : '127.0.0.1');

const CERT = { chave: join(ROOT, 'certs', 'percurso.key'), cert: join(ROOT, 'certs', 'percurso.crt') };
if (HTTPS && !(existsSync(CERT.chave) && existsSync(CERT.cert))) {
  console.error(`
  PERCURSO_HTTPS=1 pedido, mas não há certificado em certs/.

    node scripts/gerar-certificado.mjs

  Sem ele o servidor não sobe em HTTPS — e sem HTTPS a captura de áudio não
  funciona no celular, porque getUserMedia exige contexto seguro.
`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png',
};

function json(res, status, corpo, cookie) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (cookie) h['Set-Cookie'] = cookie;
  res.writeHead(status, h);
  res.end(JSON.stringify(corpo));
}

// O audio sobe como bytes crus, nao como JSON: base64 num corpo JSON inflaria
// 33% um arquivo que ja' pode ter dezenas de MB, e o teto de 1 MB do lerCorpo
// existe justamente para nao aceitar isso.
async function lerBytes(req, teto) {
  const partes = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > teto) throw Object.assign(new Error('Áudio grande demais.'), { status: 413 });
    partes.push(c);
  }
  return Buffer.concat(partes);
}

async function lerCorpo(req) {
  let dados = '';
  for await (const c of req) {
    dados += c;
    if (dados.length > 1_000_000) throw Object.assign(new Error('Corpo da requisição grande demais.'), { status: 413 });
  }
  if (!dados) return {};
  // `JSON.parse('null')` (ou número/string/array) passa no parse mas não é um
  // corpo utilizável — vira {} para o handler nunca estourar TypeError em 500.
  try {
    const corpo = JSON.parse(dados);
    return (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) ? corpo : {};
  }
  catch { throw Object.assign(new Error('JSON inválido no corpo da requisição.'), { status: 400 }); }
}

const tratar = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rota = `${req.method} ${url.pathname}`;

  if (url.pathname.startsWith('/api/')) {
    try {
      const handler = rotas[rota];
      if (!handler) return json(res, 404, { erro: `Rota não encontrada: ${rota}` });
      // Duas rotas recebem BYTES, nao JSON: o audio da transcricao (efemero) e
      // o video do consentimento (decisao 41 — este fica). Tetos diferentes de
      // proposito: prova de consentimento nao precisa de 120 MB.
      const binaria = req.method === 'POST'
        && ['/api/transcrever', '/api/consentimento/evidencia'].includes(url.pathname);
      const corpo = binaria
        ? await lerBytes(req, url.pathname === '/api/transcrever' ? 120 * 1024 * 1024 : 32 * 1024 * 1024)
        : (['POST', 'DELETE'].includes(req.method) ? await lerCorpo(req) : {});
      const saida = await handler(req, corpo, url.searchParams);
      // Todo POST/DELETE bem-sucedido pode ter mudado o estado que alimenta o
      // painel da Aurora. Sem esta linha, o memo de 30 s de src/aurora/sinais.js
      // nunca era invalidado e o painel mostrava estado velho depois de a
      // chamada ser salva — o `invalidarSinais` estava importado e nunca
      // chamado, que é a pior forma de cache: a que parece existir.
      if (['POST', 'DELETE'].includes(req.method) && !url.pathname.startsWith('/api/aurora/'))
        invalidarSinais(usuarioDa(req)?.id ?? null);
      const cookie = saida?._cookie;
      if (saida && typeof saida === 'object') delete saida._cookie;
      // Saída em arquivo (a planilha socioemocional, decisão 34): a rota
      // devolve `_csv` e o nome; tudo o mais continua JSON.
      // Saida BINARIA (o video da prova de consentimento): nunca e' estatico de
      // public/ — sai por aqui, depois do controle de acesso e do log.
      if (saida && typeof saida === 'object' && Buffer.isBuffer(saida._arquivo)) {
        res.writeHead(200, {
          'Content-Type': saida._mime || 'application/octet-stream',
          'Content-Length': saida._arquivo.length,
          'Cache-Control': 'no-store, private',
        });
        return res.end(saida._arquivo);
      }
      if (saida && typeof saida === 'object' && typeof saida._csv === 'string') {
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
          'Content-Disposition': `attachment; filename="${saida._nome || 'percurso.csv'}"`,
        });
        return res.end(saida._csv);
      }
      return json(res, 200, saida ?? { ok: true }, cookie);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error('[percurso]', e);
      return json(res, status, { erro: e.message || 'Erro inesperado no servidor.', ...(e.extra || {}) });
    }
  }

  // COMPARTILHAMENTO DO SISTEMA sem service worker ativo. O share target so'
  // funciona de verdade pelo SW (que exige contexto seguro); quando ele nao
  // esta' registrado, o POST cai aqui — e a resposta honesta e' levar a pessoa
  // a' porta de importar, nao um 404 que parece o aplicativo quebrado.
  if (url.pathname === '/compartilhar') {
    res.writeHead(303, { Location: '/#/registrar?porta=C' });
    return res.end();
  }

  try {
    const caminho = url.pathname === '/' ? '/index.html' : url.pathname;
    const destino = join(PUBLICO, normalize(caminho).replace(/^(\.\.[/\\])+/, ''));
    if (!destino.startsWith(PUBLICO)) { res.writeHead(403); return res.end('Acesso negado.'); }
    await stat(destino);
    res.writeHead(200, {
      'Content-Type': MIME[extname(destino)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(await readFile(destino));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página não encontrada.');
  }
};

const servidor = HTTPS
  ? createServerHttps({ key: readFileSync(CERT.chave), cert: readFileSync(CERT.cert) }, tratar)
  : createServer(tratar);

// Varredura de orfaos de audio no boot. E' a defesa que cobre a queda do
// processo NO MEIO de uma transcricao — o `finally` do modulo nao roda se o
// processo morre, e sem esta linha o arquivo ficaria em disco para sempre.
const orfaos = varrerOrfaos();

// A prova do consentimento nao e' varrida: e' RECONCILIADA (OPAR 05/09/2026).
// Arquivo de audio orfao e' lixo e some; arquivo de video orfao e' prova
// desgarrada, e apagar seria a pior resposta. O boot conta e avisa; decidir e'
// de gente.
try {
  const r = EVI.reconciliar();
  if (r.sem_linha.length || r.sem_arquivo.length) {
    console.warn(`  [consentimento] ${r.sem_linha.length} arquivo(s) sem linha e `
      + `${r.sem_arquivo.length} linha(s) sem arquivo em data/consentimento/. `
      + `Nada foi apagado — isso e' prova, e a decisao e' da coordenacao.`);
  }
} catch { /* diretorio ainda nao existe: nada a reconciliar */ }
if (orfaos.apagados) console.log(`  ${orfaos.apagados} áudio(s) órfão(s) de execução anterior apagado(s).`);

// Primeira execucao: banco vazio ganha os dados sinteticos automaticamente.
getDb();
if (!get(`SELECT COUNT(*) AS n FROM educador`).n) {
  console.log('Banco vazio — semeando dados sintéticos...');
  semear();
}

const esquema = HTTPS ? 'https' : 'http';
servidor.listen(PORTA, HOST, () => {
  console.log(`\n  Percurso rodando em  ${esquema}://localhost:${PORTA}  (${HOST})`);
  if (HTTPS) {
    for (const lista of Object.values(networkInterfaces())) {
      for (const i of lista || []) {
        if (i.family === 'IPv4' && !i.internal) console.log(`  No celular:          ${esquema}://${i.address}:${PORTA}`);
      }
    }
    console.log('  O aviso de "conexão não privada" é esperado: o certificado é desta máquina.');
  } else {
    console.log('  Sem HTTPS: a captura de áudio não funciona fora de localhost.');
  }
  console.log('');
});
