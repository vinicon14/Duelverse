
import { NextResponse, type NextRequest } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserByUsername, updateUser } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
    }

    // Since Firebase Auth uses email, we construct the email from the username
    const email = `${username.toLowerCase()}@duelverse.app`;

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const user = await getUserByUsername(username);
    if (user && user.isBanned) {
        return NextResponse.json({ message: 'You have been banned.', errorCode: 'USER_BANNED' }, { status: 403 });
    }

    if (user) {
        await updateUser(user.id, { lastActiveAt: Date.now() });
    }

    const idToken = await firebaseUser.getIdToken();

    return NextResponse.json({ token: idToken, user }, { status: 200 });

  } catch (error: any) {
    console.error("Login error:", error);
    let message = 'Invalid username or password.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        // Keep the error message generic for security
        message = 'Invalid credentials.';
    }
    return NextResponse.json({ message }, { status: 401 });
  }
}
