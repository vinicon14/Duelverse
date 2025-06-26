
// src/lib/userStore.ts
import type { User, Advertisement, AdvertisementConfig, DuelInvitation } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

// Path to the JSON file that will act as our simple database
const dbPath = path.join(process.cwd(), 'src/lib/database.json');
const logsDir = path.join(process.cwd(), 'src/lib/datastore_logs');

interface Database {
  users: User[];
  adminNotifications: string[];
  serverStatus: 'online' | 'offline';
  advertisements: AdvertisementConfig;
  duelInvitations: DuelInvitation[];
}

// --- Data Guardian AI ---
/**
 * Logs a data change event to both a user-specific versioned file and a central audit log.
 * This is the core of the "IA Guardiã de Dados" system.
 * @param details - The details of the event to log.
 */
async function logDataChangeEvent(details: {
  userId?: string;
  eventType: string;
  changeContext?: any;
  before?: any;
  after?: any;
}) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const { userId, eventType, changeContext, before, after } = details;

  try {
    // Ensure base log directory exists
    if (!fs.existsSync(logsDir)) {
      await fs.mkdir(logsDir);
    }
    
    // Central audit log entry
    let auditMessage = `[${new Date().toISOString()}] Event: ${eventType}`;

    // User-specific versioned log file
    if (userId) {
      const userLogDir = path.join(logsDir, userId);
      if (!fs.existsSync(userLogDir)) {
        await fs.mkdir(userLogDir, { recursive: true });
      }
      
      const logFilePath = path.join(userLogDir, `${eventType}_${timestamp}.json`);
      const logContent = { 
        eventType, 
        timestamp: new Date().toISOString(), 
        context: changeContext, 
        before, 
        after 
      };
      await fs.writeFile(logFilePath, JSON.stringify(logContent, null, 2));
      
      auditMessage += ` | UserID: ${userId}`;
    }
    
    if (changeContext?.summary) {
        auditMessage += ` | Summary: ${changeContext.summary}`;
    }

    await fs.appendFile(path.join(logsDir, 'audit_log.txt'), auditMessage + '\n');

  } catch (error) {
    console.error(`[DataGuardian] Failed to write log for event ${eventType}:`, error);
    // Logging failure should not stop the main operation.
  }
}
// --- End of Data Guardian AI ---


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

  await logDataChangeEvent({
    userId: newUser.id,
    eventType: 'user_created',
    changeContext: { summary: `User ${newUser.username} registered.` },
    before: null,
    after: newUser
  });

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

  const oldUser = { ...db.users[userIndex] };

  const safeUpdates = { ...updates };
  delete safeUpdates.id;
  delete safeUpdates.username;

  db.users[userIndex] = { ...db.users[userIndex], ...safeUpdates };

  await logDataChangeEvent({
    userId: db.users[userIndex].id,
    eventType: 'user_updated',
    changeContext: { summary: `Updated fields for ${username}: ${Object.keys(safeUpdates).join(', ')}` },
    before: oldUser,
    after: db.users[userIndex]
  });

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

  const oldUser = { ...db.users[userIndex] };
  db.users[userIndex].isBanned = true;
  const bannedUser = db.users[userIndex];
  
  db.adminNotifications.push(`O usuário ${bannedUser.displayName} (@${bannedUser.username}) foi banido.`);
  
  await logDataChangeEvent({
    userId: bannedUser.id,
    eventType: 'user_banned',
    changeContext: { summary: `User ${bannedUser.username} was banned.`},
    before: oldUser,
    after: bannedUser
  });
  
  await writeDb(db);
  console.log(`[UserStore - banUser] SUCCESS: User "${bannedUser.username}" banned and notification sent.`);
  return bannedUser;
}

export async function getAllUsers(): Promise<User[]> {
    const db = await readDb();
    return db.users || [];
}

export async function addPaymentNotification(username: string): Promise<void> {
    const db = await readDb();
    const user = await getUserByUsername(username);
    db.adminNotifications.push(`O usuário ${username} enviou um comprovante de pagamento para o status PRO.`);
    
    await logDataChangeEvent({
      userId: user?.id,
      eventType: 'payment_notified',
      changeContext: { summary: `User ${username} notified payment for PRO status.`}
    });

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
  await logDataChangeEvent({ eventType: 'admin_notifications_cleared', changeContext: { summary: 'Admin notifications were cleared.' } });
}

// --- Server Status Management ---
export async function getServerStatus(): Promise<'online' | 'offline'> {
  const db = await readDb();
  return db.serverStatus;
}

export async function setServerStatus(status: 'online' | 'offline'): Promise<void> {
  const db = await readDb();
  const oldStatus = db.serverStatus;
  db.serverStatus = status;
  await writeDb(db);
  await logDataChangeEvent({
    eventType: 'server_status_changed',
    changeContext: { summary: `Server status changed to ${status}.`},
    before: { status: oldStatus },
    after: { status: status }
  });
  console.log(`[UserStore - setServerStatus] SUCCESS: Server status set to "${status}" in database file.`);
}

// --- Advertisement Management ---
export async function getAdvertisements(): Promise<AdvertisementConfig> {
  const db = await readDb();
  return db.advertisements;
}

export async function updateAdvertisements(newConfig: AdvertisementConfig): Promise<void> {
  const db = await readDb();
  const oldConfig = { ...db.advertisements };
  db.advertisements = newConfig;
  await writeDb(db);
  await logDataChangeEvent({
      eventType: 'advertisement_config_updated',
      changeContext: { summary: `Ad config updated. Enabled: ${newConfig.enabled}`},
      before: oldConfig,
      after: newConfig
  });
}

export async function addAdvertisement(ad: Omit<Advertisement, 'id'>): Promise<Advertisement> {
    const db = await readDb();
    const oldVideos = [...db.advertisements.videos];
    const newAd: Advertisement = { ...ad, id: uuidv4() };
    db.advertisements.videos.push(newAd);
    await writeDb(db);
    await logDataChangeEvent({
      eventType: 'advertisement_video_added',
      changeContext: { summary: `New ad video added: ${newAd.name}`},
      before: { videos: oldVideos },
      after: { videos: db.advertisements.videos }
    });
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
  
  await logDataChangeEvent({
      eventType: 'duel_invitation_created',
      changeContext: { summary: `Invitation from ${fromUser.displayName} to ${toUser.displayName}`},
      after: newInvitation
  });

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

  const oldInvitation = { ...db.duelInvitations[invitationIndex] };
  db.duelInvitations[invitationIndex] = { ...db.duelInvitations[invitationIndex], ...updates };
  
  await logDataChangeEvent({
    eventType: 'duel_invitation_updated',
    changeContext: { summary: `Invitation ${invitationId} status changed to ${updates.status}`},
    before: oldInvitation,
    after: db.duelInvitations[invitationIndex]
  });

  await writeDb(db);
  return db.duelInvitations[invitationIndex];
}
