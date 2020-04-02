// Here we will register our service worker sw.js

// This make sure we add sw only to browsers which support it

// If path starts with / it means root folder

const enableNotificationsButtons = document.querySelectorAll(
  '.enable-notifications'
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => {
      console.log('Service worker registered')
    })
    .catch(err => {
      console.log(err)
    })
}

// Primitive variables are not passed to window object
window.installPrompt = {
  hasBeenShown: false,
}

// This prevents default installation of app
window.addEventListener('beforeinstallprompt', function(event) {
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

    navigator.serviceWorker.ready.then(swreg => {
      swreg.showNotification('Successfully subscribed (From SW)!', options)
    })
  }
}

// Creating a new or accessing created push subscription
const configurePushSub = () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.ready
    .then(swreg => {
      return swreg.pushManager.getSubscription()
    })
    .then(sub => {
      if (sub === null) {
        // create new subscription
      } else {
        // We have a subscription
      }
    })
}

const askForNotificationPermisssion = () => {
  //  Allows both notification and push permission
  Notification.requestPermission(result => {
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
