
// src/lib/userStore.ts
import type { User, Advertisement, AdvertisementConfig, DuelInvitation } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

// Path to the JSON file that will act as our simple database
const dbPath = path.join(process.cwd(), 'private/database.json');

interface Database {
  users: User[];
  adminNotifications: string[];
  serverStatus: 'online' | 'offline';
  advertisements: AdvertisementConfig;
  duelInvitations: DuelInvitation[];
}

// NOTE: The logDataChangeEvent function has been temporarily removed to resolve a critical build error.
// The audit logging functionality is currently disabled.

// Helper to read the entire database from the JSON file
async function readDb(): Promise<Database> {
  try {
    await fs.access(dbPath);
    const fileContent = await fs.readFile(dbPath, 'utf-8');
    const data = JSON.parse(fileContent) as Partial<Database>;
    // Provide defaults for missing top-level keys
    return {
      users: data.users || [],
      adminNotifications: data.adminNotifications || [],
      serverStatus: data.serverStatus || 'online',
      advertisements: data.advertisements || { enabled: false, videos: [] },
      duelInvitations: data.duelInvitations || [],
    };
  } catch (error) {
    // If the file doesn't exist, create it with a default structure
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log("Database file not found, creating a new one.");
        const defaultDb: Database = { users: [], adminNotifications: [], serverStatus: 'online', advertisements: { enabled: false, videos: [] }, duelInvitations: [] };
        await writeDb(defaultDb);
        return defaultDb;
    }
    console.error("Could not read database file, returning empty structure.", error);
    return { users: [], adminNotifications: [], serverStatus: 'online', advertisements: { enabled: false, videos: [] }, duelInvitations: [] };
  }
}

// Helper to write the entire database to the JSON file
async function writeDb(data: Database): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}


// --- User Management Functions ---

export async function addUser(
  userData: Pick<User, 'username' | 'displayName' | 'country'>
): Promise<User> {
  const db = await readDb();
  const trimmedUsernameInput = userData.username.trim();
  const usernameKey = trimmedUsernameInput.toLowerCase();

  const userExists = db.users.some(u => u.username.toLowerCase() === usernameKey);
  if (userExists) {
    throw new Error('Nome de usuário já existe.');
  }

  const newUser: User = {
    id: uuidv4(),
    username: trimmedUsernameInput,
    displayName: userData.displayName.trim(),
    country: userData.country.trim(),
    email: `${usernameKey.replace(/\s/g, '.')}@duelverse.app`,
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
  db.adminNotifications.push(`New User: ${newUser.username}`);

  await writeDb(db);
  console.log(`[UserStore - addUser] SUCCESS: User "${newUser.username}" added to database file.`);
  return newUser;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = await readDb();
  const trimmedUsernameInput = username.trim();
  const usernameKey = trimmedUsernameInput.toLowerCase();
  const user = db.users.find(u => u.username.toLowerCase() === usernameKey);
  return user || null;
}

export async function getUserById(id: string): Promise<User | null> {
    const db = await readDb();
    const user = db.users.find(u => u.id === id);
    return user || null;
}

export async function updateUser(username: string, updates: Partial<User>): Promise<User | null> {
  const db = await readDb();
  const trimmedUsernameForLookup = username.trim();
  const usernameKeyForLookup = trimmedUsernameForLookup.toLowerCase();
  
  const userIndex = db.users.findIndex(u => u.username.toLowerCase() === usernameKeyForLookup);

  if (userIndex === -1) {
    console.warn(`[UserStore - updateUser] FAILED: User with key "${usernameKeyForLookup}" not found for update.`);
    return null;
  }

  const safeUpdates = { ...updates };
  delete safeUpdates.id;
  delete safeUpdates.username;

  db.users[userIndex] = { ...db.users[userIndex], ...safeUpdates };

  await writeDb(db);
  console.log(`[UserStore - updateUser] SUCCESS: User "${db.users[userIndex].username}" updated in database file with updates:`, safeUpdates);
  return db.users[userIndex];
}

export async function banUser(username: string): Promise<User> {
  const db = await readDb();
  const userIndex = db.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

  if (userIndex === -1) {
    throw new Error('Usuário não encontrado.');
  }
  
  if (db.users[userIndex].isBanned) {
    return db.users[userIndex];
  }

  db.users[userIndex].isBanned = true;
  db.users[userIndex].bannedAt = Date.now();
  const bannedUser = db.users[userIndex];
  
  db.adminNotifications.push(`O usuário ${bannedUser.displayName} (@${bannedUser.username}) foi banido.`);
  
  await writeDb(db);
  console.log(`[UserStore - banUser] SUCCESS: User "${bannedUser.username}" banned and notification sent.`);
  return bannedUser;
}

export async function deleteExpiredBannedUsers(): Promise<{ deletedCount: number }> {
  const db = await readDb();
  const now = Date.now();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  
  const usersToKeep = db.users.filter(user => {
    // Keep user if they are not banned
    if (!user.isBanned) return true;
    // Keep user if they were banned, but no timestamp exists (legacy data)
    if (!user.bannedAt) return true;
    // Keep user if they were banned less than 30 days ago
    const timeSinceBan = now - user.bannedAt;
    if (timeSinceBan < thirtyDaysInMs) return true;
    
    // Otherwise, filter them out (for deletion)
    console.log(`[Maintenance] Deleting user ${user.username} (banned on ${new Date(user.bannedAt as number).toISOString()})`);
    return false;
  });

  const deletedCount = db.users.length - usersToKeep.length;

  if (deletedCount > 0) {
    db.users = usersToKeep;
    db.adminNotifications.push(`${deletedCount} usuário(s) banido(s) há mais de 30 dias foram permanentemente excluídos.`);
    await writeDb(db);
  }

  return { deletedCount };
}

export async function getAllUsers(): Promise<User[]> {
    const db = await readDb();
    return db.users || [];
}

export async function addPaymentNotification(username: string): Promise<void> {
    const db = await readDb();
    db.adminNotifications.push(`O usuário ${username} enviou um comprovante de pagamento para o status PRO.`);
    await writeDb(db);
    console.log(`[UserStore - addPaymentNotification] SUCCESS: Notification added for ${username}.`);
}


export async function getAdminNotifications(): Promise<string[]> {
  const db = await readDb();
  return db.adminNotifications || [];
}

export async function clearAdminNotifications(): Promise<void> {
  const db = await readDb();
  db.adminNotifications = [];
  await writeDb(db);
}

// --- Server Status Management ---
export async function getServerStatus(): Promise<'online' | 'offline'> {
  const db = await readDb();
  return db.serverStatus;
}

export async function setServerStatus(status: 'online' | 'offline'): Promise<void> {
  const db = await readDb();
  db.serverStatus = status;
  await writeDb(db);
  console.log(`[UserStore - setServerStatus] SUCCESS: Server status set to "${status}" in database file.`);
}

// --- Advertisement Management ---
export async function getAdvertisements(): Promise<AdvertisementConfig> {
  const db = await readDb();
  return db.advertisements;
}

export async function updateAdvertisements(newConfig: AdvertisementConfig): Promise<void> {
  const db = await readDb();
  db.advertisements = newConfig;
  await writeDb(db);
}

export async function addAdvertisement(ad: Omit<Advertisement, 'id'>): Promise<Advertisement> {
    const db = await readDb();
    const newAd: Advertisement = { ...ad, id: uuidv4() };
    db.advertisements.videos.push(newAd);
    await writeDb(db);
    return newAd;
}


// --- Server-Side Data Fetching ---

export async function getAdminDashboardData() {
  const db = await readDb();
  const allUsers = db.users || [];
  const rankedUsers = allUsers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    users: rankedUsers,
    notifications: db.adminNotifications || [],
    serverStatus: db.serverStatus || 'online',
    adConfig: db.advertisements || { enabled: false, videos: [] },
  };
}

// --- Duel Invitation Functions ---

export async function createDuelInvitation(fromUser: User, toUser: User): Promise<DuelInvitation> {
  const db = await readDb();
  
  const now = Date.now();
  const INVITATION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  db.duelInvitations = db.duelInvitations.filter(inv => inv.status === 'pending' && (now - inv.createdAt) < INVITATION_EXPIRY_MS);
  
  const existingInvite = db.duelInvitations.find(inv => 
    inv.status === 'pending' &&
    ((inv.fromUserId === fromUser.id && inv.toUserId === toUser.id) ||
     (inv.fromUserId === toUser.id && inv.toUserId === fromUser.id))
  );

  if (existingInvite) {
    throw new Error('Já existe um convite pendente entre vocês.');
  }

  const newInvitation: DuelInvitation = {
    id: uuidv4(),
    fromUserId: fromUser.id,
    fromUserDisplayName: fromUser.displayName,
    fromUserPfp: fromUser.profilePictureUrl,
    toUserId: toUser.id,
    status: 'pending',
    createdAt: now,
  };

  db.duelInvitations.push(newInvitation);

  await writeDb(db);
  return newInvitation;
}

export async function getPendingInvitationForUser(userId: string): Promise<DuelInvitation | null> {
  const db = await readDb();
  return db.duelInvitations.find(inv => inv.toUserId === userId && inv.status === 'pending') || null;
}

export async function getInvitationById(invitationId: string): Promise<DuelInvitation | null> {
  const db = await readDb();
  return db.duelInvitations.find(inv => inv.id === invitationId) || null;
}

export async function updateInvitation(invitationId: string, updates: Partial<DuelInvitation>): Promise<DuelInvitation | null> {
  const db = await readDb();
  const invitationIndex = db.duelInvitations.findIndex(inv => inv.id === invitationId);
  if (invitationIndex === -1) {
    return null;
  }

  db.duelInvitations[invitationIndex] = { ...db.duelInvitations[invitationIndex], ...updates };
  
  await writeDb(db);
  return db.duelInvitations[invitationIndex];
}
