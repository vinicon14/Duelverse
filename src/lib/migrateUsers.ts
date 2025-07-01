// src/lib/migrateUsers.ts
import { adminFirestore } from './firebaseConfig';
import { promises as fs } from 'fs';
import path from 'path';
import type { User } from './types';

async function migrateUsers() {
  try {
    console.log('Starting user migration...');

    // Path to the old database file
    const dbPath = path.join(process.cwd(), 'database.json');
    const fileContent = await fs.readFile(dbPath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!data.users || !Array.isArray(data.users)) {
      console.log('No users array found in database.json. Nothing to migrate.');
      return;
    }

    const usersToMigrate: User[] = data.users;
    const usersCollection = adminFirestore.collection('users');
    const batch = adminFirestore.batch();

    console.log(`Found ${usersToMigrate.length} users to migrate.`);

    for (const user of usersToMigrate) {
      if (!user.id) {
        console.warn('Skipping user with no ID:', user.username);
        continue;
      }
      // Use the existing user ID as the document ID in Firestore
      const userRef = usersCollection.doc(user.id);
      batch.set(userRef, user);
    }

    await batch.commit();

    console.log(`Successfully migrated ${usersToMigrate.length} users to Firestore.`);
    console.log('Migration complete.');

  } catch (error) {
    console.error('An error occurred during migration:', error);
    process.exit(1);
  }
}

migrateUsers();
