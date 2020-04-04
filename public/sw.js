importScripts('/src/js/idb.js')
importScripts('/src/js/utility.js')

const CACHE_STATIC_NAME = 'static-v1'
const CACHE_DYNAMIC_NAME = 'dynamic-v1'
const STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/utility.js',
  '/src/js/idb.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
]

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

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing service worker ...', event)
  // Precaching of app assets (app shell)
  event.waitUntil(
    // This is done for versioning of cache
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      console.log('[Service Worker] Precaching app shell')
      // cache.add("/");
      // cache.add("/index.html");
      // cache.add("/src/js/app.js");

      // Better way
      cache.addAll(STATIC_FILES)
    })
  )
})

// Here we do cleanup of our previous cache
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating service worker ...', event)

  // Wait until we done with cleanup
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] removing old cache ... ', key)
            return caches.delete(key)
          }
        })
      )
    })
  )

  return self.clients.claim()
})

function isInArray(string, array) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === string) {
      return true
    }
  }
  return false
}

// Cache then network

self.addEventListener('fetch', (event) => {
  let url = 'https://pwagram-a86f0.firebaseio.com/posts.json'

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then((res) => {
        let clonedRes = res.clone()
        clearAllData('posts')
          .then(() => {
            return clonedRes.json()
          })
          .then((data) => {
            for (let key in data) {
              writeData('posts', data[key])
            }
          })

        return res
      })
    )
  } // Cache only
  else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(caches.match(event.request))
  }
  // Cache with network fallback
  else {
    event.respondWith(
      //     // in cache (key:value pair is stored) where key = request
      caches.match(event.request).then((response) => {
        if (response) {
          return response
        } else {
          // Adding to cache dynamically
          return fetch(event.request)
            .then((res) => {
              return caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
                // trimCache(CACHE_DYNAMIC_NAME, 9);
                cache.put(event.request.url, res.clone())
                return res
              })
            })
            .catch((err) => {
              return caches.open(CACHE_STATIC_NAME).then((cache) => {
                if (event.request.headers.get('accept').includes('text/html'))
                  return cache.match('/offline.html')
              })
            })
        }
      })
    )
  }
})

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

// let url = "https://pwagram-a86f0.firebaseio.com/posts.json";

self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background syncing', event)
  if (event.tag === 'sync-new-posts') {
    console.log('[Service Worker] Syncing new Posts')
    event.waitUntil(
      readAllData('sync-posts').then((data) => {
        for (let dt of data) {
          var postData = new FormData()
          postData.append('id', dt.id)
          postData.append('title', dt.title)
          postData.append('location', dt.location)

          postData.append('rawLocationLat', dt.rawLocation.lat)
          postData.append('rawLocationLng', dt.rawLocation.lng)
          postData.append('file', dt.picture, dt.id + '.png')

          fetch(
            'https://us-central1-pwagram-a86f0.cloudfunctions.net/storePostData',
            {
              method: 'POST',
              body: postData,
            }
          )
            .then((res) => {
              // Here we clear the queue
              console.log('Sent data ...', res)
              if (res.ok) {
                res.json().then((resData) => {
                  deleteItemFromData('sync-posts', resData.id)
                })
              }
            })
            .catch((err) => {
              console.log('Error while sending data', err)
            })
        }
      })
    )
  }
})

// Notification interaction
self.addEventListener('notificationclick', (event) => {
  let notification = event.notification
  let action = event.action

  console.log(notification)

  if (action === 'confirm') {
    console.log('Confirm was chosen')
  } else {
    console.log(action)
    event.waitUntil(
      clients.matchAll().then((clis) => {
        let client = clis.find((c) => c.visibilityState === 'visible')

        if (client !== undefined) {
          client.navigate(notification.data.url)
          client.focus()
        } else {
          clients.openWindow(notification.data.url)
        }

        notification.close()
      })
    )
  }
})

self.addEventListener('notificationclose', (event) => {
  console.log('Notification was closed', event)
})

// Listening to push messages ... we send push message from our server
self.addEventListener('push', (event) => {
  console.log('Push Notification received...', event)
  // Fallback in case payload data is not sent with push
  let data = {
    title: 'New notifs !',
    content: 'You got some new notications!',
    openUrl: '/',
  }
  if (event.data) {
    data = JSON.parse(event.data.text())
  }

  let options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png',
    badge: '/src/images/icons/app-icon-96x96.png',
    data: {
      url: data.openUrl,
    },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})
