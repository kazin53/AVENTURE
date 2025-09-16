const CACHE_NAME = "world-wow-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/main.js",
  "/icone-512.png",
  "/icone-720.png",
  "/icone-1600.png"
];

// Instalação do Service Worker e cache inicial
self.addEventListener("install", event => {
  console.log("[SW] Instalando...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Cache criado");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // ativa imediatamente
});

// Ativação e limpeza de caches antigos
self.addEventListener("activate", event => {
  console.log("[SW] Ativado!");
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
      return response || fetch(event.request);
    })
  );
});
