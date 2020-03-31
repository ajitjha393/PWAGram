importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

const CACHE_STATIC_NAME = "static-v17";
const CACHE_DYNAMIC_NAME = "dynamic-v2";
const STATIC_FILES = [
  "/",
  "/index.html",
  "/offline.html",
  "/src/js/app.js",
  "/src/js/feed.js",
  "/src/js/idb.js",
  "/src/js/material.min.js",
  "/src/css/app.css",
  "/src/css/feed.css",
  "/src/images/main-image.jpg",
  "https://fonts.googleapis.com/css?family=Roboto:400,700",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css"
];

// Cleaning up dynamic cache a little bit
// Though not necessary for smaller projects
// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName).then(cache => {
//     return cache.keys().then(keys => {
//       if (keys.length > maxItems) {
//         cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
//       }
//     });
//   });
// }

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
      cache.addAll(STATIC_FILES);
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

function isInArray(string, array) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === string) {
      return true;
    }
  }
  return false;
}

// Cache then network

self.addEventListener("fetch", event => {
  let url = "https://pwagram-a86f0.firebaseio.com/posts.json";

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then(res => {
        let clonedRes = res.clone();
        clearAllData("posts")
          .then(() => {
            return clonedRes.json();
          })
          .then(data => {
            for (let key in data) {
              writeData("posts", data[key]);
            }
          });

        return res;
      })
    );
  } // Cache only
  else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(caches.match(event.request));
  }
  // Cache with network fallback
  else {
    event.respondWith(
      //     // in cache (key:value pair is stored) where key = request
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        } else {
          // Adding to cache dynamically
          return fetch(event.request)
            .then(res => {
              return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
                // trimCache(CACHE_DYNAMIC_NAME, 9);
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch(err => {
              return caches.open(CACHE_STATIC_NAME).then(cache => {
                if (event.request.headers.get("accept").includes("text/html"))
                  return cache.match("/offline.html");
              });
            });
        }
      })
    );
  }
});

// Here first we check if what we r fecthing is in the cache just return it from cache or else fetch it bro!

// self.addEventListener("fetch", event => {
//   event.respondWith(
//     // in cache (key:value pair is stored) where key = request
//     caches.match(event.request).then(response => {
//       if (response) {
//         return response;
//       } else {
//         // Adding to cache dynamically
//         return fetch(event.request)
//           .then(res => {
//             return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
//               cache.put(event.request.url, res.clone());
//               return res;
//             });
//           })
//           .catch(err => {
//             return caches.open(CACHE_STATIC_NAME).then(cache => {
//               return cache.match("/offline.html");
//             });
//           });
//       }
//     })
//   );
// });

//  How to unregister service worker

// if ("serviceWorker" in navigator) {
//   navigator.serviceWorker.getRegistration().then(registrations => {
//     for (let i = 0; i < registrations.length; i++) {
//       registrations[i].unregister();
//     }
//   });
// }
