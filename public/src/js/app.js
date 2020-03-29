// Here we will register our service worker sw.js

// This make sure we add sw only to browsers which support it

// If path starts with / it means root folder

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => {
      console.log("Service worker registered");
    })
    .catch(err => {
      console.log(err);
    });
}

// Primitive variables are not passed to window object
window.installPrompt = {
  hasBeenShown: false
};

// This prevents default installation of app
window.addEventListener("beforeinstallprompt", function(event) {
  console.log("beforeinstallprompt fired");
  event.preventDefault();
  window.deferredPrompt = event;
  return false;
});
