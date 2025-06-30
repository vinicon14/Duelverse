
import { NextResponse } from 'next/server';
import { downgradeVersion, restoreVersion } from '@/lib/versioning';
import { getUserByUsername } from '@/lib/userStore';

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
    
    // 1. Get the new (downgraded) version number
    const newVersion = await downgradeVersion();

    // 2. Restore the database from the versions.json file
    const restoredData = await restoreVersion(newVersion);
    if (!restoredData) {
        // If for some reason the version wasn't found in versions.json,
        // we revert the version number change to avoid inconsistency.
        // (This would require implementing an 'upgrade' without the save/clear logic)
        // For now, we'll throw an error.
        throw new Error(`Could not find saved data for version ${newVersion}.`);
    }

    return NextResponse.json({
      message: `Successfully downgraded to version ${newVersion}. Database has been restored.`,
      newVersion: newVersion,
    });

  } catch (error) {
    console.error('Downgrade failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Downgrade failed: ${errorMessage}` }, { status: 500 });
  }
}
