// ==============================================
// SERVICE WORKER COMPARTILHADO — vários apps offline na MESMA porta
// ==============================================
// ⚠️ SEMPRE MUDE O NÚMERO DA VERSÃO AO ATUALIZAR QUALQUER ARQUIVO!
const VERSAO = 'meu-app-v16';
const CDN_CACHE = 'meu-app-cdn';          // guarda o FFmpeg (versão fixa; não é apagado ao atualizar)
const CDN_HOSTS = ['cdn.jsdelivr.net'];   // ➡️ outro CDN usado por algum app? Acrescente aqui.
const BASE = self.registration.scope;     // funciona em localhost:8080/ e em github.io/repositorio/

// ==============================================
// 🧩 COMO ACRESCENTAR OUTROS APLICATIVOS (mesma porta, ex.: 8080)
// ==============================================
// Em cada endereço/porta só pode haver UM service worker por pasta (escopo).
// Um segundo registro na mesma pasta SUBSTITUI o primeiro. Por isso, todos os
// apps da mesma pasta/porta usam ESTE MESMO sw.js:
//   1) Coloque o novo .html na mesma pasta deste sw.js.
//   2) Acrescente o nome dele na lista PAGINAS abaixo.
//   3) Se o app usar bibliotecas/arquivos próprios, acrescente em RECURSOS_FIXOS.
//   4) Se tiver pastas de músicas/vídeos/imagens, acrescente em PASTAS_MIDIAS.
//   5) No <script> do novo .html registre assim:  navigator.serviceWorker.register('./sw.js');
//   6) Mude o número de VERSAO (ex.: 'meu-app-v4') para o navegador atualizar.
// Dica: se um app tiver a PRÓPRIA pasta (ex.: /outro-app/), ele pode ter o seu
// próprio sw.js dentro dela, sem conflito com este.

// ✅ PÁGINAS PRINCIPAIS (use "./" no começo; sem "/" absoluto)
const PAGINAS = [
  './',
  './index.html',
  './MinhaPlaylist.html',
  './Icone%20de%20Musica.png'
  // ➡️ NOVO APP AQUI, por exemplo: './MeuNovoApp.html',
];

// As capas e faixas selecionadas são salvas pela própria playlist no cache
// "playlist-media-v1"; não cacheie pastas inteiras para evitar ocupar todo o disco.

// ==============================================
// NÃO ALTERE ABAIXO DESTA LINHA ⬇️
// ==============================================

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSAO);
    // Tolerante: se um arquivo da lista não existir, os outros continuam sendo salvos.
    const r = await Promise.allSettled(PAGINAS.map(u =>
      cache.add(new Request(new URL(u, BASE).href, { cache: 'reload' }))));
    r.forEach((x, i) => { if (x.status === 'rejected') console.warn('⚠️ Não salvo no cache:', PAGINAS[i]); });
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n !== VERSAO && n.startsWith('meu-app-v')).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  // CDN (FFmpeg): cache primeiro — são arquivos de versão fixa, então é seguro.
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CDN_CACHE);
      const salvo = await cache.match(req);
      if (salvo) return salvo;
      const resp = await fetch(req);
      if (resp.ok || resp.type === 'opaque') cache.put(req, resp.clone()).catch(() => {});
      return resp;
    })());
    return;
  }

  if (url.origin !== location.origin) return;

  // Arquivos do próprio site: internet primeiro; sem internet, usa o cache.
  e.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp.status === 200) caches.open(VERSAO).then(c => c.put(req, resp.clone())).catch(() => {});
      return resp;
    } catch (_) {
      const salvo = await caches.match(req, { ignoreSearch: true });
      if (salvo) return salvo;
      if (req.mode === 'navigate') {
        for (const p of PAGINAS) { // abre o primeiro app salvo da lista
          const app = await caches.match(new URL(p, BASE).href);
          if (app) return app;
        }
      }
      return new Response('Conteúdo indisponível offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
