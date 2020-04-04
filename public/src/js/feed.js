var shareImageButton = document.querySelector('#share-image-button')
var createPostArea = document.querySelector('#create-post')
var closeCreatePostModalButton = document.querySelector(
  '#close-create-post-modal-btn'
)
var sharedMomentsArea = document.querySelector('#shared-moments')

var form = document.querySelector('form')
var titleInput = document.querySelector('#title')
var locationInput = document.querySelector('#location')
var videoPlayer = document.querySelector('#player')
var canvasElement = document.querySelector('#canvas')
var captureButton = document.querySelector('#capture-btn')
var imagePicker = document.querySelector('#image-picker')
var imagePickerArea = document.querySelector('#pick-image')
var picture

// This is progressiveness
function initializeMedia() {
  if (!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {}
  }

  // Creating my own polyfill for accessing camera
  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      let getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia

      if (!getUserMedia) {
        return Promise.reject(new Error('Get User media is not supported :('))
      }

      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject)
      })
    }
  }

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(stream => {
      videoPlayer.srcObject = stream
      videoPlayer.style.display = 'block'
    })
    .catch(err => {
      console.log('Camera can not be accessed :(', err)
      imagePickerArea.style.display = 'block'
    })
}

// Take photo
captureButton.addEventListener('click', event => {
  canvasElement.style.display = 'block'
  videoPlayer.style.display = 'none'
  captureButton.style.display = 'none'

  canvasElement.width = videoPlayer.videoWidth
  canvasElement.height = videoPlayer.videoHeight

  let context = canvasElement.getContext('2d')

  context.drawImage(
    videoPlayer,
    0,
    0,
    videoPlayer.videoWidth,
    videoPlayer.videoHeight // this keeps aspect ratio
  )
  // context.drawImage(
  //   videoPlayer,
  //   0,
  //   0,
  //   canvas.width,
  //   videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width) // this keeps aspect ratio
  // )
  videoPlayer.srcObject.getVideoTracks().forEach(track => {
    track.stop()
  })
  picture = dataURItoBlob(canvasElement.toDataURL())
})

imagePicker.addEventListener('change', (event) => {
  picture = event.target.files[0]
})

function openCreatePostModal() {
  // createPostArea.style.display = "block";

  createPostArea.style.transform = 'translateY(0)'
  initializeMedia()

  if (!window.installPrompt.hasBeenShown) {
    window.deferredPrompt.prompt() //This shows the banner

    window.deferredPrompt.userChoice.then(function(choiceResult) {
      console.log(choiceResult.outcome)

      if (choiceResult.outcome == 'dismissed') {
        console.log('User cancelled installation')
      } else {
        console.log('User added to home screen')
      } // context.drawImage(
      //   videoPlayer,
      //   0,
      //   0,
      //   canvas.width,
      //   videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width) // this keeps aspect ratio
    })
    window.installPrompt.hasBeenShown = true
  }
}

function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)'
  imagePickerArea.style.display = 'none'
  videoPlayer.style.display = 'none'
  canvasElement.style.display = 'none'

  // createPostArea.style.display = "none";
}

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild)
  }
}

shareImageButton.addEventListener('click', openCreatePostModal)

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal)

function createCard(data) {
  var cardWrapper = document.createElement('div')
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp'
  var cardTitle = document.createElement('div')
  cardTitle.className = 'mdl-card__title'
  cardTitle.style.backgroundImage = 'url(' + data.image + ')'
  cardTitle.style.backgroundSize = 'cover'

  cardWrapper.appendChild(cardTitle)
  var cardTitleTextElement = document.createElement('h2')
  cardTitleTextElement.style.color = 'white'
  cardTitleTextElement.className = 'mdl-card__title-text'
  cardTitleTextElement.textContent = data.title
  cardTitle.appendChild(cardTitleTextElement)
  var cardSupportingText = document.createElement('div')
  cardSupportingText.className = 'mdl-card__supporting-text'
  cardSupportingText.textContent = data.location
  cardSupportingText.style.textAlign = 'center'

  // This was for dynamic caching on demand
  // But i currently dont have a use case :(

  // const cardSaveButton = document.createElement("button");
  // cardSaveButton.textContent = "Save";

  // cardSaveButton.addEventListener("click", event => {
  //   console.log("clicked");
  //   if ("caches" in window) {
  //     caches.open("user-requested").then(cache => {
  //       cache.add("https://httpbin.org/get");
  //       cache.add("/src/images/sf-boat.jpg");
  //     });
  //   }
  // });

  //cardSupportingText.appendChild(cardSaveButton);

  cardWrapper.appendChild(cardSupportingText)
  componentHandler.upgradeElement(cardWrapper)
  sharedMomentsArea.appendChild(cardWrapper)
}

const updateUI = data => {
  clearCards()
  for (let i = 0; i < data.length; i++) {
    createCard(data[i])
  }
}

// Cache then network strategy (no fallback)

let url = 'https://pwagram-a86f0.firebaseio.com/posts.json'
let networkDataReceived = false

fetch(url)
  .then(function(res) {
    return res.json()
  })
  .then(function(data) {
    networkDataReceived = true
    console.log('from web ', data)
    let dataArray = []
    for (let key in data) {
      dataArray.push(data[key])
    }

    updateUI(dataArray)
  })

if ('indexedDB' in window) {
  readAllData('posts').then(data => {
    if (!networkDataReceived) {
      console.log('From Cache', data)
      updateUI(data)
    }
  })
}

// Listening to form submit

const sendData = () => {
  var postData = new FormData()
  var id = new Date().toISOString()

  postData.append('id', id)
  postData.append('title', titleInput.value)
  postData.append('location', locationInput.value)
  postData.append('file', picture, id + '.png')

  fetch('https://us-central1-pwagram-a86f0.cloudfunctions.net/storePostData', {
    method: 'POST',

    body: postData,
  }).then(res => {
    console.log('Sent data ...', res)
    updateUI()
  })
}

form.addEventListener('submit', event => {
  event.preventDefault()

  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert(' Please enter valid data! ')
    return
  }

  closeCreatePostModal()

  // SyncManager api providesus with sync features
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(sw => {
      let post = {
        id: new Date().toISOString(),
        title: titleInput.value.trim(),
        location: locationInput.value.trim(),
        picture: picture,
      }
      writeData('sync-posts', post)
        .then(() => {
          return sw.sync.register('sync-new-posts')
        })
        .then(() => {
          let snackbarContainer = document.querySelector('#confirmation-toast')
          let data = {
            message: 'Your post was saved for syncing 🙃 ',
          }

          snackbarContainer.MaterialSnackbar.showSnackbar(data)
        })
        .catch(err => {
          console.log('Something failed... ', err)
        })
    })
  } else {
    // This will directly send data to backend so that our app doesnt crash if backg sync not allowed(... remember one of the features of pwa)
    sendData()
  }
})
