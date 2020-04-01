var shareImageButton = document.querySelector("#share-image-button");
var createPostArea = document.querySelector("#create-post");
var closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
var sharedMomentsArea = document.querySelector("#shared-moments");

var form = document.querySelector("form");
var titleInput = document.querySelector("#title");
var locationInput = document.querySelector("#location");

function openCreatePostModal() {
  // createPostArea.style.display = "block";

  createPostArea.style.transform = "translateY(0)";

  if (!window.installPrompt.hasBeenShown) {
    window.deferredPrompt.prompt(); //This shows the banner

    window.deferredPrompt.userChoice.then(function (choiceResult) {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome == "dismissed") {
        console.log("User cancelled installation");
      } else {
        console.log("User added to home screen");
      }
    });
    window.installPrompt.hasBeenShown = true;
  }
}

function closeCreatePostModal() {
  createPostArea.style.transform = "translateY(100vh)";
  // createPostArea.style.display = "none";
}

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

shareImageButton.addEventListener("click", openCreatePostModal);

closeCreatePostModalButton.addEventListener("click", closeCreatePostModal);

function createCard(data) {
  var cardWrapper = document.createElement("div");
  cardWrapper.className = "shared-moment-card mdl-card mdl-shadow--2dp";
  var cardTitle = document.createElement("div");
  cardTitle.className = "mdl-card__title";
  cardTitle.style.backgroundImage = "url(" + data.image + ")";
  cardTitle.style.backgroundSize = "cover";

  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement("h2");
  cardTitleTextElement.style.color = "white";
  cardTitleTextElement.className = "mdl-card__title-text";
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement("div");
  cardSupportingText.className = "mdl-card__supporting-text";
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = "center";

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

  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

const updateUI = data => {
  clearCards();
  for (let i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
};

// Cache then network strategy (no fallback)

let url = "https://pwagram-a86f0.firebaseio.com/posts.json";
let networkDataReceived = false;

fetch(url)
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    networkDataReceived = true;
    console.log("from web ", data);
    let dataArray = [];
    for (let key in data) {
      dataArray.push(data[key]);
    }

    updateUI(dataArray);
  });

if ("indexedDB" in window) {
  readAllData("posts").then(data => {
    if (!networkDataReceived) {
      console.log("From Cache", data);
      updateUI(data);
    }
  });
}

// Listening to form submit

const sendData = () => {
  fetch("https://us-central1-pwagram-a86f0.cloudfunctions.net/storePostData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      id: new Date().toISOString(),
      title: titleInput.value.trim(),
      location: locationInput.value.trim(),
      image:
        "https://firebasestorage.googleapis.com/v0/b/pwagram-a86f0.appspot.com/o/sf-boat.jpg?alt=media&token=fd21de64-14bb-442b-9a9a-2ec7aa785c60"
    })
  }).then(res => {
    console.log("Sent data ...", res);
    updateUI();
  });
};

form.addEventListener("submit", event => {
  event.preventDefault();

  if (titleInput.value.trim() === "" || locationInput.value.trim() === "") {
    alert(" Please enter valid data! ");
    return;
  }

  closeCreatePostModal();

  // SyncManager api providesus with sync features
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready.then(sw => {
      let post = {
        id: new Date().toISOString(),
        title: titleInput.value.trim(),
        location: locationInput.value.trim()
      };
      writeData("sync-posts", post)
        .then(() => {
          return sw.sync.register("sync-new-posts");
        })
        .then(() => {
          let snackbarContainer = document.querySelector("#confirmation-toast");
          let data = {
            message: "Your post was saved for syncing 🙃 "
          };

          snackbarContainer.MaterialSnackbar.showSnackbar(data);
        })
        .catch(err => {
          console.log("Something failed... ", err);
        });
    });
  } else {
    // This will directly send data to backend so that our app doesnt crash if backg sync not allowed(... remember one of the features of pwa)
    sendData();
  }
});
