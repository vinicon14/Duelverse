
import { NextResponse } from 'next/server';
import { upgradeVersion } from '@/lib/versioning';
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

    // Upgrade to the new version number, without clearing the data
    const newVersion = await upgradeVersion();

    return NextResponse.json({
      message: `Successfully upgraded to version ${newVersion}. You can now save this new state.`,
      newVersion: newVersion,
    });

  } catch (error) {
    console.error('Upgrade failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Upgrade failed: ${errorMessage}` }, { status: 500 });
  }
}
