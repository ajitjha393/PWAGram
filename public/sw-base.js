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

workboxSW.precache([])

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
