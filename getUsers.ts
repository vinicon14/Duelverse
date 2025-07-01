import * as admin from 'firebase-admin';

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'duelverse-remote',
});

admin.auth().listUsers(1000)
  .then((listUsersResult) => {
    listUsersResult.users.forEach((user) => {
      console.log(user.email);
    });
  })
  .catch((error) => {
    console.error('Error listing users:', error);
  });
