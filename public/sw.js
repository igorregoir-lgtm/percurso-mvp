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
const VERSAO = 'percurso-v2';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/fila.js', '/manifest.json',
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

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
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
