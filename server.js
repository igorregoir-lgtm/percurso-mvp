// Percurso — servidor. Node puro: nenhum framework, nenhuma dependencia.
// Uso:  node server.js        (porta 3000, ou PORT=8080 node server.js)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, get } from './src/db.js';
import { rotas, usuarioDa } from './src/api.js';
import { invalidarSinais } from './src/passo/sinais.js';
import * as EVI from './src/evidencia.js';
import { semear } from './src/seed.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(ROOT, 'public');
const PORTA = Number(process.env.PORT) || 3000;
// Em hospedagem, PORT implica bind público (Render e plataformas equivalentes).
// No uso local sem PORT, limita o MVP à própria máquina por segurança.
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function json(res, status, corpo, cookie) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (cookie) h['Set-Cookie'] = cookie;
  res.writeHead(status, h);
  res.end(JSON.stringify(corpo));
}

// O vídeo do consentimento e áudios sobem como bytes crus, não como JSON:
// base64 num corpo JSON inflaria 33% um arquivo de dezenas de MB.
async function lerBytes(req, teto) {
  const partes = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > teto) throw Object.assign(new Error('Arquivo grande demais.'), { status: 413 });
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

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rota = `${req.method} ${url.pathname}`;

  if (url.pathname.startsWith('/api/')) {
    try {
      const handler = rotas[rota];
      if (!handler) return json(res, 404, { erro: `Rota não encontrada: ${rota}` });
      const binaria = req.method === 'POST'
        && ['/api/transcrever', '/api/consentimento/evidencia'].includes(url.pathname);
      const corpo = binaria
        ? await lerBytes(req, 32 * 1024 * 1024)
        : (['POST', 'DELETE'].includes(req.method) ? await lerCorpo(req) : {});
      const saida = await handler(req, corpo, url.searchParams);
      // Todo POST/DELETE bem-sucedido pode ter mudado o estado que alimenta o
      // painel do Passo. Sem esta linha, o memo de 30 s de src/passo/sinais.js
      // nunca era invalidado e o painel mostrava estado velho depois de a
      // chamada ser salva — o `invalidarSinais` estava importado e nunca
      // chamado, que é a pior forma de cache: a que parece existir.
      if (['POST', 'DELETE'].includes(req.method) && !url.pathname.startsWith('/api/passo/'))
        invalidarSinais(usuarioDa(req)?.id ?? null);
      const cookie = saida?._cookie;
      if (saida && typeof saida === 'object') delete saida._cookie;
      // Saída BINÁRIA (o vídeo da prova de consentimento): nunca é estático de
      // public/ — sai por aqui, depois do controle de acesso e do log.
      if (saida && typeof saida === 'object' && Buffer.isBuffer(saida._arquivo)) {
        res.writeHead(200, {
          'Content-Type': saida._mime || 'application/octet-stream',
          'Content-Length': saida._arquivo.length,
          'Cache-Control': 'no-store, private',
        });
        return res.end(saida._arquivo);
      }
      // Saída em arquivo (a planilha socioemocional, decisão 34): a rota
      // devolve `_csv` e o nome; tudo o mais continua JSON.
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

try {
  const r = EVI.reconciliar();
  if (r.sem_linha.length || r.sem_arquivo.length) {
    console.warn(`  [consentimento] ${r.sem_linha.length} arquivo(s) sem linha e `
      + `${r.sem_arquivo.length} linha(s) sem arquivo em data/consentimento/. `
      + `Nada foi apagado — isso é prova, e a decisão é da coordenação.`);
  }
} catch { /* diretório ainda não existe: nada a reconciliar */ }

servidor.listen(PORTA, HOST, () => console.log(`\n  Percurso rodando em  http://localhost:${PORTA}  (${HOST})\n`));
