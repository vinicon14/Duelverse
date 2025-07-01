"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var admin = require("firebase-admin");
var serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'duelverse-remote',
});
admin.auth().listUsers(1000)
    .then(function (listUsersResult) {
    listUsersResult.users.forEach(function (user) {
        console.log(user.email);
    });
})
    .catch(function (error) {
    console.error('Error listing users:', error);
});
