const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({
  origin: true,
})
const webpush = require('web-push')
var formidable = require('formidable')
var fs = require('fs')
var UUID = require('uuid-v4')

const serviceAccount = require('./pwagram-fb-key.json')

// This will allow access to users that are not on the same server as our app

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var gcconfig = {
  projectId: 'pwagram-a86f0',
  keyFileName: 'pwagram-fb-key.json',
}

var { Storage } = require('@google-cloud/storage')
var gcs = new Storage(gcconfig)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-a86f0.firebaseio.com/',
})

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    var uuid = UUID()
    var formData = new formidable.IncomingForm()
    formData.parse(request, function(err, fields, files) {
      fs.rename(files.file.path, '/tmp/' + files.file.name)
      var bucket = gcs.bucket('pwagram-a86f0.appspot.com')

      bucket.upload(
        '/tmp/' + files.file.name,
        {
          uploadType: 'media',
          metadata: {
            metadata: {
              contentType: files.file.type,
              firebaseStorageDownloadTokens: uuid,
            },
          },
        },
        function(err, file) {
          if (!err) {
            admin
              .database()
              .ref('posts')
              .push({
                id: fields.id,
                title: fields.title,
                location: fields.location,
                image:
                  'https://firebasestorage.googleapis.com/v0/b/' +
                  bucket.name +
                  '/o/' +
                  encodeURIComponent(file.name) +
                  '?alt=media&token=' +
                  uuid,
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
                        openUrl: '/',
                      })
                    )
                    .catch(err => {
                      console.log(err)
                    })
                })

                response.status(201).json({
                  message: 'Data stored',
                  id: fields.id,
                })
              })
              .catch(err => {
                response.status(500).json({ error: err })
              })
          } else {
            console.log(err)
          }
        }
      )
    })
  })
})
