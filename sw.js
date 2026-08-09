// CREALLAB · Service Worker
// Solo se encarga de que el sitio sea instalable y de dar una
// pantalla mínima cuando no hay internet. NO cachea nada de Supabase
// (ni datos, ni sesión) — todo lo dinámico siempre va a la red.

const CACHE_NAME = "creallab-shell-v1";

const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./offline.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

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

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nunca intervenir en llamadas a Supabase (ni auth, ni datos, ni
  // storage) — eso siempre debe ir directo a la red, sin caché.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Navegación entre páginas: intenta la red primero (para que
  // siempre vean lo último publicado); si no hay internet, muestra
  // la página offline o, si ya la habían visitado, la versión en caché.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./offline.html"))
        )
    );
    return;
  }

  // Archivos estáticos del shell (íconos, manifest): caché primero,
  // con la red como respaldo.
  if (APP_SHELL.some((path) => req.url.endsWith(path.replace("./", "")))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
