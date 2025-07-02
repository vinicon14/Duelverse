// sw.js

const CACHE_NAME = 'duelverse-cache-v1';
const urlsToCache = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/manifest.json',
  '/icon.svg'
  // Adicione aqui outros recursos estáticos importantes que você queira que funcionem offline.
  // O Next.js gerencia o cache de seus próprios chunks de JS e CSS automaticamente.
];

// Evento de Instalação: Ocorre quando o Service Worker é instalado pela primeira vez.
self.addEventListener('install', event => {
  // O Service Worker espera até que o cache seja completamente preenchido.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Ativação: Limpa caches antigos se uma nova versão do Service Worker for ativada.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento de Fetch: Intercepta todas as requisições de rede.
self.addEventListener('fetch', event => {
  event.respondWith(
    // Tenta primeiro buscar o recurso da rede (para obter a versão mais recente).
    fetch(event.request).catch(() => {
      // Se a rede falhar (offline), tenta buscar o recurso do cache.
      return caches.match(event.request);
    })
  );
});
