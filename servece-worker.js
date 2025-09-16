const CACHE_NAME = "world-wow-v2"; // Mude a versão do cache
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/main.js",
  "/icone-192.png", // Adicionado
  "/icone-512.png"  // Adicionado
];

// Instalação do Service Worker e cache inicial
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Cache criado");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Intercepta requisições para servir do cache
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Retorna a resposta do cache se existir
      if (response) {
        return response;
      }
      
      // Se não, busca na rede
      return fetch(event.request).then(
        response => {
          // Garante que a resposta é válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cria uma cópia da resposta
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }
      );
    })
  );
});
