// Here we will register our service worker sw.js

// This make sure we add sw only to browsers which support it

// If path starts with / it means root folder

const enableNotificationsButtons = document.querySelectorAll(
  '.enable-notifications'
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => {
      console.log('Service worker registered')
    })
    .catch((err) => {
      console.log(err)
    })
}

// Primitive variables are not passed to window object
window.installPrompt = {
  hasBeenShown: false,
}

// This prevents default installation of app
window.addEventListener('beforeinstallprompt', function (event) {
  console.log('beforeinstallprompt fired')
  event.preventDefault()
  window.deferredPrompt = event
  return false
})

// Notificaation enable permissison
const displayConfirmNotification = () => {
  if ('serviceWorker' in navigator) {
    // Checks if service worker is ready
    let options = {
      body: 'You successfully subscribed to our Notification service 😉',
      icon: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sf-boat.jpg',
      vibrate: [100, 50, 200],
      badge: '/src/images/icons/app-icon-96x96.png',
      tag: 'confirm-notification',
      renotify: true,
      actions: [
        {
          action: 'confirm',
          title: 'Ok',
          icon: '/src/images/icons/app-icon-96x96.png',
        },
        {
          action: 'cancel',
          title: 'Cancel',
          icon: '/src/images/icons/app-icon-96x96.png', // relative path not works here
        },
      ],
    }

    navigator.serviceWorker.ready.then((swreg) => {
      swreg.showNotification('Successfully subscribed !', options)
    })
  }
}

// Creating a new or accessing created push subscription
const configurePushSub = () => {
  let reg

  if (!('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.ready
    .then((swreg) => {
      reg = swreg
      return swreg.pushManager.getSubscription()
    })
    .then((sub) => {
      if (sub === null) {
        // create new subscription
        // This is for securing who send push messages (only us)
        const vapidPublicKey =
          'BEGetTUu4qE2r_SjRlWJerCGMZeeHwwkzODqFfEGbKUMySKSxaH3l3LYTrMlV1EA_UZGnoRucD8JMPzW-WQqUvE'

        const convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey)

        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidPublicKey,
        })
      } else {
        // We have a subscription
      }
    })
    .then((newSub) => {
      return fetch('https://pwagram-a86f0.firebaseio.com/subscriptions.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(newSub),
      })
    })

    .then((res) => {
      if (res.ok) {
        displayConfirmNotification()
      }
    })
    .catch((err) => {
      console.log('Some error occured...', err)
    })
}

const askForNotificationPermisssion = () => {
  //  Allows both notification and push permission
  Notification.requestPermission((result) => {
    console.log('User Choice', result)
    if (result !== 'granted') {
      console.log('No notification permission granted ')
    } else {
      // displayConfirmNotification()
      configurePushSub()
    }
  })
}

if ('Notification' in window && 'serviceWorker' in navigator) {
  for (let i = 0; i < enableNotificationsButtons.length; i++) {
    enableNotificationsButtons[i].style.display = 'inline-block'
    enableNotificationsButtons[i].addEventListener(
      'click',
      askForNotificationPermisssion
    )
  }
}
