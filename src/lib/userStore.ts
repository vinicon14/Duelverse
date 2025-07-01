import { getAdminDb, getAdminAuth, getAdminStorage } from '@/lib/firebaseAdmin';
import type { User } from '@/lib/types';

// Função para obter a referência da coleção de usuários, garantindo que o Firestore está inicializado.
const getUsersCollection = () => getAdminDb().collection('users');

export async function createUserInFirestore(uid: string, username: string, displayName: string, country: string): Promise<User> {
  const newUser: User = {
    id: uid,
    username,
    displayName,
    country,
    email: '', 
    score: 1000,
    profilePictureUrl: '',
    decklistImageUrl: '',
    friendUsernames: [],
    lastActiveAt: Date.now(),
    isVerified: false,
    isJudge: false,
    isBanned: false,
    isPro: false,
    isCoAdmin: false,
  };

  await getUsersCollection().doc(uid).set(newUser);
  return newUser;
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const usersCollection = getUsersCollection();
    const snapshot = await usersCollection.where('username', '==', username).limit(1).get();
    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data() as User;
}

export async function getUserById(id: string): Promise<User | null> {
    const doc = await getUsersCollection().doc(id).get();
    return doc.exists ? doc.data() as User : null;
}

export async function updateUser(uid: string, updates: Partial<User>): Promise<User | null> {
  const userRef = getUsersCollection().doc(uid);
  await userRef.update(updates);
  const updatedDoc = await userRef.get();
  return updatedDoc.exists ? updatedDoc.data() as User : null;
}

export async function banUser(uid: string): Promise<User | null> {
    const user = await getUserById(uid);
    if (!user) {
        throw new Error('User not found.');
    }
    
    const auth = getAdminAuth();
    await auth.updateUser(uid, { disabled: true });
    await getUsersCollection().doc(uid).update({ isBanned: true, bannedAt: Date.now() });

    return { ...user, isBanned: true };
}

export async function deleteExpiredBannedUsers(): Promise<{ deletedCount: number }> {
    const now = Date.now();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff = now - thirtyDaysInMs;

    const usersCollection = getUsersCollection();
    const snapshot = await usersCollection.where('isBanned', '==', true).where('bannedAt', '<', cutoff).get();
    
    if (snapshot.empty) {
        return { deletedCount: 0 };
    }

    const batch = getAdminDb().batch();
    const uidsToDelete: string[] = [];
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        uidsToDelete.push(doc.id);
    });
    await batch.commit();
    
    const auth = getAdminAuth();
    await auth.deleteUsers(uidsToDelete);

    return { deletedCount: snapshot.size };
}

export async function getAllUsers(): Promise<User[]> {
    const snapshot = await getUsersCollection().orderBy('username').get();
    return snapshot.docs.map(doc => doc.data() as User);
}
// ... (O restante das funções que usam o Firestore devem ser adaptadas de forma similar se existirem)
