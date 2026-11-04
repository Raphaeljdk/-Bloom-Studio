// ========================================================
// Service Worker — Bloom Studio PWA
// Cache de assets para funcionamento offline + instalação
// ========================================================

const CACHE_NAME = "bloom-studio-v2-public-assets";
const ASSETS_TO_CACHE = [
  "/manifest.json",
  "/logo.svg",
];

// Install — pré-cacheia assets essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate — limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — estratégia: network first, fallback para cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignora requisições não GET
  if (request.method !== "GET") return;

  // Nunca armazene conteúdos privados, páginas autenticadas ou endpoints de API.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin ||
      !(url.pathname.startsWith("/_next/static/") || ASSETS_TO_CACHE.includes(url.pathname))) return;

  // Ignora chrome-extension
  if (request.url.startsWith("chrome-extension://")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cacheia respostas OK (apenas same-origin)
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
