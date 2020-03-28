// Here we will register our service worker sw.js

// This make sure we add sw only to browsers which support it

// If path starts with / it means root folder

var deferredPrompt; // I want window scope thats why used var

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log("Service worker registered");
  });
}

// This prevents default installation of app
window.addEventListener("beforeinstallprompt", function(event) {
  console.log("beforeinstallprompt fired");
  event.preventDefault();
  deferredPrompt = event;
  return false;
});
