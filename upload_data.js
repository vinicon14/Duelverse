import * as fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function migrateUsers() {
  try {
    // Dynamically import firebaseAdmin and userStore
    const firebaseAdmin = await import(path.resolve(process.cwd(), 'src/lib/firebaseAdmin.js'));
    const userStore = await import(path.resolve(process.cwd(), 'src/lib/userStore.js'));

    const getAdminDb = firebaseAdmin.getAdminDb;
    const getAdminAuth = firebaseAdmin.getAdminAuth;
    const getAdminStorage = firebaseAdmin.getAdminStorage;
    const createUserInFirestore = userStore.createUserInFirestore;
    const getUserByUsername = userStore.getUserByUsername;
    const getUserById = userStore.getUserById;
    const updateUser = userStore.updateUser;
    const banUser = userStore.banUser;
    const deleteExpiredBannedUsers = userStore.deleteExpiredBannedUsers;
    const getAllUsers = userStore.getAllUsers;

    const db = getAdminDb();
    const storage = getAdminStorage().bucket();

    const databaseJsonPath = path.resolve(process.cwd(), 'database.json');
    const databaseRawData = fs.readFileSync(databaseJsonPath, 'utf8');
    const database = JSON.parse(databaseRawData);

    for (const user of database.users) {
      if (user.profilePictureUrl && typeof user.profilePictureUrl === 'string' && !user.profilePictureUrl.startsWith('https://')) {
        // Upload the image to Firebase Storage
        const base64Data = user.profilePictureUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const contentType = user.profilePictureUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        const filename = `profile-pictures/${user.username}/${uuidv4()}.${contentType.split('/')[1]}`;
        const file = storage.file(filename);

        await file.save(buffer, {
          metadata: {
            contentType: contentType,
          },
        });

        const profilePictureUrl = await file.getSignedUrl({
          action: 'read',
          expires: '12-31-2499',
        })[0];

        // Update the user in Firestore
        await db.collection('users').doc(user.id).update({ profilePictureUrl });
        console.log(`Updated profile picture for user ${user.username}`);
      }
    }

    // Delete the database.json file
    fs.unlinkSync(databaseJsonPath);
    console.log('database.json deleted successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateUsers();