self.addEventListener("install", (event) => {
  console.log("Service Worker instalado.");
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker ativo.");
});

self.addEventListener("fetch", (event) => {
  // Pode interceptar requisições e adicionar cache no futuro
});