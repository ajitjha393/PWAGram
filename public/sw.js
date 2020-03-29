const CACHE_STATIC_NAME = "static-v10";
const CACHE_DYNAMIC_NAME = "dynamic-v2";

self.addEventListener("install", event => {
  console.log("[Service Worker] Installing service worker ...", event);
  // Precaching of app assets (app shell)
  event.waitUntil(
    // This is done for versioning of cache
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log("[Service Worker] Precaching app shell");
      // cache.add("/");
      // cache.add("/index.html");
      // cache.add("/src/js/app.js");

      // Better way
      cache.addAll([
        "/",
        "/index.html",
        "/offline.html",
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

// Here we do cleanup of our previous cache
self.addEventListener("activate", event => {
  console.log("[Service Worker] Activating service worker ...", event);

  // Wait until we done with cleanup
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log("[Service Worker] removing old cache ... ", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

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
        // Adding to cache dynamically
        return fetch(event.request)
          .then(res => {
            return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
              cache.put(event.request.url, res.clone());
              return res;
            });
          })
          .catch(err => {
            return caches.open(CACHE_STATIC_NAME).then(cache => {
              return cache.match("/offline.html");
            });
          });
      }
    })
  );
});
