/* Service Worker da Minha Playlist: guarda tudo no tablet para funcionar sem internet e sem servidor */
const CORE = 'playlist-core-v1';
const MEDIA = 'playlist-media-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CORE)
      .then(c => c.add(new Request('MinhaPlaylist.html', { cache: 'reload' })))
      .catch(() => {})
  );
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(handle(req, url));
});

async function handle(req, url) {
  // Página: tenta o servidor (para pegar atualizações); sem servidor, usa a cópia salva
  if (req.mode === 'navigate') {
    try {
      const net = await fetch(req);
      if (net.ok && url.pathname.endsWith('MinhaPlaylist.html')) {
        const c = await caches.open(CORE);
        c.put('MinhaPlaylist.html', net.clone());
      }
      return net;
    } catch (err) {
      const saved = await caches.match('MinhaPlaylist.html');
      if (saved) return saved;
      throw err;
    }
  }
  // Imagens, mp3, mp4: usa a cópia salva primeiro
  const cached = await caches.match(req.url);
  if (cached) {
    return req.headers.has('range') ? rangeResponse(req, cached) : cached;
  }
  try {
    return await fetch(req);
  } catch (err) {
    return new Response('Arquivo não disponível offline', { status: 503 });
  }
}

// O player de áudio/vídeo pede pedaços do arquivo (Range); aqui montamos esses pedaços
async function rangeResponse(req, res) {
  const blob = await res.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
  let start = 0, end = size - 1;
  if (m) {
    if (m[1] !== '') {
      start = parseInt(m[1], 10);
      if (m[2] !== '') end = parseInt(m[2], 10);
    } else if (m[2] !== '') {
      start = Math.max(0, size - parseInt(m[2], 10));
    }
  }
  end = Math.min(end, size - 1);
  if (start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}
