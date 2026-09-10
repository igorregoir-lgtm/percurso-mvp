// Percurso — service worker (Fase 2 do plano de IA: PWA).
//
// ESTRATÉGIA: network-first PARA TUDO — o servidor está na mesma máquina/LAN e
// a versão fresca importa mais que milissegundos; o cache é só o plano B
// offline do shell. Cache-first para o shell foi descartado de propósito
// (auditoria do plano, VIABILIDADE-02): serviria app velho durante o
// desenvolvimento e depois de cada atualização.
//
// LIMITAÇÃO DECLARADA: service worker exige secure context — funciona em
// localhost/127.0.0.1 e no deploy HTTPS (Render). Pelo IP da rede local
// (http://IP:3000) o navegador NÃO registra o SW: a página funciona normal,
// sem offline/instalação. Ver README, seção "PWA e acesso pelo celular".
// A VERSAO MUDA quando o SHELL muda. `audio.js` entrou aqui por necessidade, nao
// por completude: `app.js` o IMPORTA no topo, e um modulo que falta derruba o
// arquivo inteiro — o app nao abriria offline, em vez de abrir sem as portas.
const VERSAO = 'percurso-v5';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/fila.js', '/audio.js', '/qr.js', '/manifest.json',
               '/icone.svg', '/icone-192.png', '/icone-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// COMPARTILHAMENTO DO SISTEMA (share target, pedido do campo em 04/09/2026:
// "coloque este web app na lista dos artefatos que permite receber
// compartilhamento de audio").
//
// O sistema operacional POSTA o arquivo em /compartilhar. Nao existe pagina
// aberta para receber isso: quem recebe e' o service worker. Ele guarda os
// bytes num cache proprio e manda o navegador para a tela de registrar, que le'
// o cache e apaga logo em seguida.
//
// O cache e' o unico canal possivel aqui — um POST vindo de fora do app nao tem
// como entregar bytes a uma pagina que ainda nao existe. O arquivo NAO fica: e'
// consumido e apagado, senao seria exatamente a copia que a tela promete nao
// guardar.
const CACHE_COMPARTILHADO = 'percurso-compartilhado';

async function receberCompartilhamento(req) {
  try {
    const form = await req.formData();
    const arq = form.get('audio');
    if (arq && arq.size) {
      const cache = await caches.open(CACHE_COMPARTILHADO);
      await cache.put('/__ultimo-compartilhado', new Response(arq, {
        headers: {
          'Content-Type': arq.type || 'application/octet-stream',
          'X-Percurso-Nome': encodeURIComponent(arq.name || 'audio').replace(/%20/g, ' '),
        },
      }));
      return Response.redirect('/#/registrar?compartilhado=1', 303);
    }
  } catch { /* cai no redirecionamento sem arquivo, abaixo */ }
  // Chegou compartilhamento sem audio (so' texto, ou o formulario falhou): a
  // pessoa vai para a tela de registrar do mesmo jeito, e escolhe o arquivo.
  return Response.redirect('/#/registrar?porta=C', 303);
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname === '/compartilhar') {
    e.respondWith(receberCompartilhamento(e.request));
    return;
  }
  if (e.request.method !== 'GET') return; // POST/DELETE nunca passam por cache

  // API: rede sempre; sem rede, resposta offline explícita (a fila do app já
  // guarda os POSTs; os GETs falham declaradamente, nunca com dado velho).
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ erro: 'Sem conexão com o servidor. O que você registrar fica na fila e sobe quando a rede voltar.' }),
          { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } })));
    return;
  }

  // Shell e estáticos: network-first, cache como fallback offline. O
  // index.html só entra como fallback de NAVEGAÇÃO — devolver HTML no lugar
  // de um CSS/ícone que não está no cache quebraria a página em silêncio.
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok && url.origin === location.origin) {
          const copia = resp.clone();
          e.waitUntil(caches.open(VERSAO).then(c => c.put(e.request, copia)));
        }
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit
          || (e.request.mode === 'navigate'
            ? caches.match('/index.html')
            : new Response('Offline e fora do cache.', { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))));
});
