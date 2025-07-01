import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb, getAdminStorage } from '@/lib/firebaseAdmin';
import { getAllUsers, updateUser } from '@/lib/userStore';
import * as fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const db = getAdminDb();
    const storage = getAdminStorage().bucket();

    const databaseJsonPath = path.resolve(process.cwd(), 'database.json');
    let database;
    try {
      const databaseRawData = fs.readFileSync(databaseJsonPath, 'utf8');
      database = JSON.parse(databaseRawData);
    } catch (readError) {
      console.error('Error reading database.json:', readError);
      return NextResponse.json({ message: 'Error reading local database file.' }, { status: 500 });
    }

    if (!database.users || !Array.isArray(database.users)) {
      return NextResponse.json({ message: 'Invalid database.json format: missing or invalid users array.' }, { status: 400 });
    }

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

    // Delete the database.json file after successful migration
    fs.unlinkSync(databaseJsonPath);
    console.log('database.json deleted successfully.');

    return NextResponse.json({ message: 'Migration completed successfully!' }, { status: 200 });
  } catch (error) {
    console.error('Migration failed:', error);
    const message = error instanceof Error ? error.message : 'Internal error during migration.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
