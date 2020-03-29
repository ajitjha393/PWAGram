self.addEventListener("install", event => {
  console.log("[Service Worker] Installing service worker ...", event);
  // Precaching of app assets (app shell)
  event.waitUntil(
    caches.open("static").then(cache => {
      console.log("[Service Worker] Precaching app shell");
      // cache.add("/");
      // cache.add("/index.html");
      // cache.add("/src/js/app.js");

      // Better way
      cache.addAll([
        "/",
        "/index.html",
        "/src/js/app.js",
        "/src/js/feed.js",
        "/src/js/material.min.js",
        "/src/css/app.css",
        "/src/css/feed.css",
        "/src/images/main-image.jpg",
        "https://fonts.googleapis.com/css?family=Roboto:400,700",
        "https://fonts.googleapis.com/icon?family=Material+Icons",
        "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css"
      ]);
    })
  );
});

self.addEventListener("activate", event => {
  console.log("[Service Worker] Activating service worker ...", event);
  return self.clients.claim();
});

// Here first we check if what we r fecthing is in the cache just return it from cache or else fetch it bro!

self.addEventListener("fetch", event => {
  event.respondWith(
    // in cache (key:value pair is stored) where key = request
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      } else {
        return fetch(event.request);
      }
    })
  );
});
