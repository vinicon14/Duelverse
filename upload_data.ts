import admin from 'firebase-admin';

const serviceAccount = require('./serviceAccountKey.json');
const databaseJson = require('./database.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'duelverse-remote',
});

const db = admin.firestore();

async function uploadData() {
  try {
    for (const collectionName in databaseJson) {
      const collectionData = databaseJson[collectionName];

      if (Array.isArray(collectionData)) {
        // Handle arrays as collections with auto-generated document IDs
        for (const documentData of collectionData) {
          await db.collection(collectionName).add(documentData);
          console.log(`Uploaded document to ${collectionName}`);
        }
      } else {
        // Handle other data types as a single document
        await db.collection(collectionName).doc('main').set(collectionData);
        console.log(`Uploaded document to ${collectionName}`);
      }
    }

    console.log('Data upload complete!');
  } catch (error) {
    console.error('Error uploading data: ', error);
  }
}

uploadData();
