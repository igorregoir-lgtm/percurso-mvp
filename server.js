// Percurso — servidor. Node puro: nenhum framework, nenhuma dependencia.
// Uso:  node server.js        (porta 3000, ou PORT=8080 node server.js)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, get } from './src/db.js';
import { rotas } from './src/api.js';
import { semear } from './src/seed.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(ROOT, 'public');
const PORTA = Number(process.env.PORT) || 3000;
// Em hospedagem, PORT implica bind público (Render e plataformas equivalentes).
// No uso local sem PORT, limita o MVP à própria máquina por segurança.
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

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

async function lerCorpo(req) {
  let dados = '';
  for await (const c of req) {
    dados += c;
    if (dados.length > 1_000_000) throw Object.assign(new Error('Corpo da requisição grande demais.'), { status: 413 });
  }
  if (!dados) return {};
  try { return JSON.parse(dados); }
  catch { throw Object.assign(new Error('JSON inválido no corpo da requisição.'), { status: 400 }); }
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rota = `${req.method} ${url.pathname}`;

  if (url.pathname.startsWith('/api/')) {
    try {
      const handler = rotas[rota];
      if (!handler) return json(res, 404, { erro: `Rota não encontrada: ${rota}` });
      const corpo = ['POST', 'DELETE'].includes(req.method) ? await lerCorpo(req) : {};
      const saida = await handler(req, corpo, url.searchParams);
      const cookie = saida?._cookie;
      if (saida && typeof saida === 'object') delete saida._cookie;
      return json(res, 200, saida ?? { ok: true }, cookie);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error('[percurso]', e);
      return json(res, status, { erro: e.message || 'Erro inesperado no servidor.', ...(e.extra || {}) });
    }
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
});

// Primeira execucao: banco vazio ganha os dados sinteticos automaticamente.
getDb();
if (!get(`SELECT COUNT(*) AS n FROM educador`).n) {
  console.log('Banco vazio — semeando dados sintéticos...');
  semear();
}

servidor.listen(PORTA, HOST, () => console.log(`\n  Percurso rodando em  http://localhost:${PORTA}  (${HOST})\n`));
