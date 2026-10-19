// ==============================================
// SERVICE WORKER — VERSÃO AUTO-ATUALIZÁVEL
// ==============================================
// ⚠️ SEMPRE MUDE O NÚMERO DA VERSÃO AO ATUALIZAR!
const VERSAO = 'meu-app-v2';

// ✅ LISTA DAS PÁGINAS PRINCIPAIS
// Adicione TODOS os seus arquivos .html aqui!
const PAGINAS = [
  '/',
  '/index.html',
  '/MeusJogosRetro.html',
  '/MinhaPlaylist.html',
  '/video_tools_frontend.html'        // ← ✅ Novo app adicionado!
];

// ✅ ARQUIVOS FIXOS (ex: emulador, bibliotecas, CSS, JS)
const RECURSOS_FIXOS = [
  "emulatorjs/data/extract7z.js",
  "emulatorjs/data/compression/extractzip.js",
  "emulatorjs/data/compression/libunrar.js",
  "emulatorjs/data/compression/libunrar.wasm",
  "emulatorjs/data/cores/fceumm-legacy-wasm.data",
  "emulatorjs/data/cores/fceumm-wasm.data",
  "emulatorjs/data/cores/genesis_plus_gx-legacy-wasm.data",
  "emulatorjs/data/cores/genesis_plus_gx-wasm.data",
  "emulatorjs/data/cores/mupen64plus_next-legacy-wasm.data",
  "emulatorjs/data/cores/mupen64plus_next-wasm.data",
  "emulatorjs/data/emulator.min.css",
  "emulatorjs/data/emulator.min.js",
  "emulatorjs/data/loader.js"
];

// ✅ PASTAS DE MÍDIA (músicas, imagens, vídeos, etc.)
// Arquivos dentro dessas pastas são salvos AUTOMATICAMENTE quando acessados
const PASTAS_MIDIAS = [
  '/BRITNEY SPEARS/',
  '/LADY GAGA/',
  '/Jogos/'
  // ➡️ Adicione pastas novas aqui se quiser controle total
  // Exemplo: '/VIDEOS/'
];

// Junta tudo
const ARQUIVOS_CACHE = [...PAGINAS, ...RECURSOS_FIXOS];

// ==============================================
// NÃO ALTERE ABAIXO DESTA LINHA ⬇️
// ==============================================

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSAO);
    await cache.addAll(ARQUIVOS_CACHE);
    await self.skipWaiting();
    console.log(`✅ Versão ${VERSAO} instalada!`);
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const todosCaches = await caches.keys();
    await Promise.all(
      todosCaches.filter(nome => nome !== VERSAO && nome.startsWith('meu-app-v'))
        .map(nomeAntigo => caches.delete(nomeAntigo))
    );
    await self.clients.claim();
    console.log('✅ Caches antigos limpos!');
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Estratégia: Tenta buscar da internet, senão usa o cache
  e.respondWith(
    fetch(req)
      .then(resposta => {
        const copia = resposta.clone();
        caches.open(VERSAO).then(cache => cache.put(req, copia));
        return resposta;
      })
      .catch(() => {
        // Se não tiver internet, busca no cache
        return caches.match(req).then(encontrado => {
          if (encontrado) return encontrado;
          console.log('⚠️ Arquivo não encontrado offline:', url.pathname);
        })
      })
  );
});
