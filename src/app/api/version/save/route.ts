
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserByUsername } from '@/lib/userStore';
import { getCurrentVersion, saveCurrentVersion } from '@/lib/versioning';

const ADMIN_USERNAME = 'vinicon14';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('Authorization');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized: Missing user ID' }, { status: 401 });
    }

    const adminUser = await getUserByUsername(ADMIN_USERNAME);
    if (!adminUser || adminUser.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    const dbPath = path.join(process.cwd(), 'database.json');
    const versionsPath = path.join(process.cwd(), 'versions.json');

    // 1. Read current database and version
    const currentVersion = await getCurrentVersion();
    let dbContent;
    try {
        dbContent = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    } catch (e) {
        return NextResponse.json({ message: 'Could not read main database file.' }, { status: 500 });
    }

    // 2. Read versions file
    let versionsData;
    try {
        await fs.access(versionsPath);
        versionsData = JSON.parse(await fs.readFile(versionsPath, 'utf-8'));
    } catch (e) {
        // If versions.json doesn't exist, create it.
        versionsData = {};
    }

    // 3. Save the current state to the versions file
    versionsData[currentVersion] = dbContent;
    
    // 4. Write back to the versions file
    await fs.writeFile(versionsPath, JSON.stringify(versionsData, null, 2));

    return NextResponse.json({ 
        message: `Version ${currentVersion} saved successfully.`,
        savedVersion: currentVersion 
    }, { status: 200 });

  } catch (error) {
    console.error('Save version failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Save failed: ${errorMessage}` }, { status: 500 });
  }
}
