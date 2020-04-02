const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({
  origin: true,
})
const serviceAccount = require('./pwagram-fb-key.json')
const webpush = require('web-push')

// This will allow access to users that are not on the same server as our app

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-a86f0.firebaseio.com/',
})

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    admin
      .database()
      .ref('posts')
      .push({
        id: request.body.id,
        title: request.body.title,
        location: request.body.location,
        image: request.body.image,
      })
      .then(() => {
        webpush.setVapidDetails(
          'mailto:ajitjha393@gmail.com',
          'BEGetTUu4qE2r_SjRlWJerCGMZeeHwwkzODqFfEGbKUMySKSxaH3l3LYTrMlV1EA_UZGnoRucD8JMPzW-WQqUvE',
          'uU1O4wI_FjCbjMzM2lv71GvBCmQMYXiMwSzwCSKevmI'
        )

        return admin
          .database()
          .ref('subscriptions')
          .once('value')
      })
      .then(subscriptions => {
        subscriptions.forEach(sub => {
          // Alternative pushConfig = sub.val()
          let pushConfig = {
            endpoint: sub.val().endpoint,
            keys: {
              auth: sub.val().keys.auth,
              p256dh: sub.val().keys.p256dh,
            },
          }

          webpush
            .sendNotification(
              pushConfig,
              JSON.stringify({
                title: 'New Post',
                content: 'New Post Added 🤩',
              })
            )
            .catch(err => {
              console.log(err)
            })
        })

        response.status(201).json({
          message: 'Data stored',
          id: request.body.id,
        })
      })
      .catch(err => {
        response.status(500).json({ error: err })
      })
  })
})
