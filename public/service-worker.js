importScripts('/src/js/idb.js')
importScripts('/src/js/utility.js')
importScripts('workbox-sw.prod.v2.1.3.js')

const workboxSW = new self.WorkboxSW()

workboxSW.router.registerRoute(
  /.*(?:googleapis|gstatic)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'google-fonts',
    cacheExpiration: {
      maxEntries: 6,
      maxAgeSeconds: 60 * 60 * 24 * 30, // Fetch every new month
    },
  })
)

workboxSW.router.registerRoute(
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'material-css',
  })
)

workboxSW.router.registerRoute(
  /.*(?:firebasestorage\.googleapis)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'post-images',
  })
)

// Indexed db caching for post syncing
workboxSW.router.registerRoute(
  'https://pwagram-a86f0.firebaseio.com/posts.json',
  (args) => {
    return fetch(args.event.request).then((res) => {
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
  }
)

// Fallback offline.html

workboxSW.router.registerRoute(
  function (routeData) {
    return routeData.event.request.headers.get('accept').includes('text/html')
  },
  (args) => {
    return caches.match(args.event.request).then((response) => {
      if (response) {
        return response
      } else {
        // Adding to cache dynamically
        return fetch(args.event.request)
          .then((res) => {
            return caches.open('dynamic').then((cache) => {
              // trimCache(CACHE_DYNAMIC_NAME, 9);
              cache.put(args.event.request.url, res.clone())
              return res
            })
          })
          .catch((err) => {
            return caches.match('/offline.html').then((res) => {
              return res
            })
          })
      }
    })
  }
)

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "2e5a342c95b5def76862239c7534bf4a"
  },
  {
    "url": "manifest.json",
    "revision": "6bbe0a417a11afe9288a564fbc45962d"
  },
  {
    "url": "offline.html",
    "revision": "b26fba4220cdaff87bbdd5f54b3556eb"
  },
  {
    "url": "service-worker.js",
    "revision": "9a1dcb9a999088bd5579af86a440ad78"
  },
  {
    "url": "src/css/app.css",
    "revision": "59d917c544c1928dd9a9e1099b0abd71"
  },
  {
    "url": "src/css/feed.css",
    "revision": "e1c3ad7247d973a0a47974321092169e"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/js/app.js",
    "revision": "513e3f766f5d5355840ef25f4bda853c"
  },
  {
    "url": "src/js/feed.js",
    "revision": "fbd5bb4d889e68674cf1d029245661ae"
  },
  {
    "url": "src/js/idb.js",
    "revision": "1818aa6374cad60f3330fc0cb9808de8"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/utility.js",
    "revision": "95cafe83b472e0d1a5ea6d5161423f8c"
  },
  {
    "url": "sw-base.js",
    "revision": "2b202ea5b74133de503060b0817a7ba3"
  },
  {
    "url": "sw.js",
    "revision": "c2b5d11aaba162a0aa50ebf4c7ef26da"
  },
  {
    "url": "workbox-sw.prod.v2.1.3.js",
    "revision": "a9890beda9e5f17e4c68f42324217941"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  }
])

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
