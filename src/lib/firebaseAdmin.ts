import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let adminApp: admin.app.App;

function initializeFirebaseAdmin() {
  if (!adminApp) {
    try {
      const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'duelverse-remote',
      });
      console.log('Firebase Admin SDK initialized');
    } catch (error: any) {
      console.error('Firebase Admin initialization error', error);
    }
  }
}

initializeFirebaseAdmin();

export function getAdminAuth() {
  return admin.auth(adminApp);
}

export function getAdminDb() {
  return admin.firestore(adminApp);
}

export function getAdminStorage() {
  return admin.storage(adminApp);
}
