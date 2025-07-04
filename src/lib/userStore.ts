import fs from 'fs';
import path from 'path';
import type { User } from '@/lib/types';

// Defining the path for the local database file
const DATABASE_PATH = path.resolve(process.cwd(), 'database.json');
const SERVER_STATUS_PATH = path.resolve(process.cwd(), 'server-status.json');


interface LocalDatabase {
  users: User[];
}

interface ServerStatus {
  status: 'online' | 'offline';
}

// Initialize userCache as null. It will be populated on first read.
let userCache: LocalDatabase | null = null;

// Function to read the local database
async function readDatabase(): Promise<LocalDatabase> {
  // If cache is already populated, return it directly
  if (userCache) {
    return userCache;
  }

  // If database file doesn't exist, create an empty one and initialize cache
  if (!fs.existsSync(DATABASE_PATH)) {
    await fs.promises.writeFile(DATABASE_PATH, JSON.stringify({ users: [] }, null, 2), 'utf8');
    userCache = { users: [] };
    console.log("database.json not found, created an empty one.");
    return userCache;
  }

  try {
    const data = await fs.promises.readFile(DATABASE_PATH, 'utf8');
    // Handle empty or whitespace-only files gracefully
    if (data.trim() === '') {
      userCache = { users: [] };
      console.warn("database.json is empty or contains only whitespace. Initializing with empty users array.");
    } else {
      userCache = JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading or parsing database.json:", error);
    // On any parsing error, reset to an empty database to prevent crashes
    userCache = { users: [] };
    console.warn("Resetting user database to empty due to parsing error.");
  }
  
  return userCache;
}

// Function to write to the local database
async function writeDatabase(data: LocalDatabase): Promise<void> {
  await fs.promises.writeFile(DATABASE_PATH, JSON.stringify(data, null, 2), 'utf8');
  userCache = data; // Update cache after writing
}

export async function getServerStatus(): Promise<'online' | 'offline'> {
  try {
    if (!fs.existsSync(SERVER_STATUS_PATH)) {
      return 'online'; // Default to online if file doesn't exist
    }
    const data = await fs.promises.readFile(SERVER_STATUS_PATH, 'utf8');
    const status: ServerStatus = JSON.parse(data);
    return status.status;
  } catch (error) {
    console.error("Error reading server-status.json:", error);
    return 'online'; // Default to online on error
  }
}

export async function warmUpCache(): Promise<void> {
    await readDatabase();
}

export async function createUser(uid: string, username: string, displayName: string, country: string, passwordPlain: string): Promise<User> {
  const db = await readDatabase();

  const newUser: User = {
    id: uid,
    username,
    displayName,
    country,
    email: `${username.toLowerCase()}@duelverse`, // Fictitious email for local mode
    password: passwordPlain, // Stores the password in plain text
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

  db.users.push(newUser);
  await writeDatabase(db);
  return newUser;
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const db = await readDatabase();
    return db.users.find((user: User) => user.username === username) || null;
}

export async function getUserById(id: string): Promise<User | null> {
    const db = await readDatabase();
    return db.users.find((user: User) => user.id === id) || null;
}

export async function updateUser(uid: string, updates: Partial<User>): Promise<User | null> {
  const db = await readDatabase();
  const userIndex = db.users.findIndex((u: User) => u.id === uid);
  if (userIndex > -1) {
    db.users[userIndex] = { ...db.users[userIndex], ...updates };
    await writeDatabase(db);
    return db.users[userIndex];
  }
  return null;
}

export async function banUser(uid: string): Promise<User | null> {
    const user = await getUserById(uid);
    if (!user) {
        throw new Error('User not found.');
    }
    // Simplified ban logic for local mode
    user.isBanned = true;
    await updateUser(uid, { isBanned: true, bannedAt: Date.now() });
    return { ...user, isBanned: true };
}

export async function deleteExpiredBannedUsers(): Promise<{ deletedCount: number }> {
    console.warn('deleteExpiredBannedUsers: Function disabled in local test mode.');
    return { deletedCount: 0 };
}

export async function getAllUsers(): Promise<User[]> {
    const db = await readDatabase();
    return db.users; // Returns all users from the local database
}
