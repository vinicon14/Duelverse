
export interface User {
  id: string;
  username: string;
  displayName: string;
  country: string;
  email: string;
  score: number;
  profilePictureUrl?: string;
  decklistImageUrl?: string;
  friendUsernames?: string[];
  lastActiveAt: number; // Timestamp of last known activity
  isVerified?: boolean;
  isJudge?: boolean; 
  isBanned?: boolean;
  bannedAt?: number; // Timestamp when the user was banned
  isPro?: boolean;
  isCoAdmin?: boolean;
}

export interface RankingEntry {
  id: string; // User ID
  username: string;
  displayName: string;
  country: string;
  email?: string;
  score: number;
  profilePictureUrl?: string;
  isVerified?: boolean;
  isJudge?: boolean;
  isBanned?: boolean;
  isCoAdmin?: boolean;
}

// --- Public Matchmaking Types ---
export type MatchmakingStatus = 'idle' | 'searching' | 'matched' | 'error' | 'cancelled' | 'reporting';
export type MatchmakingMode = 'ranked' | 'casual';

export interface MatchmakingQueueEntry {
  userId: string;
  displayName: string;
  timestamp: number;
  mode: MatchmakingMode;
}

export interface MatchedGame {
  gameId: string;
  players: [MatchmakingQueueEntry, MatchmakingQueueEntry];
  jitsiRoomName: string;
  createdAt: number;
  mode: MatchmakingMode;
}

export interface JoinMatchmakingResponse {
  status: MatchmakingStatus;
  game?: MatchedGame;
  message?: string;
}

export interface MatchmakingStatusResponse {
  status: MatchmakingStatus;
  game?: MatchedGame;
  message?: string;
}

// --- Private Room Types ---
export type PrivateRoomStatus = 'idle' | 'waiting_for_opponent' | 'ready_to_start' | 'full' | 'not_found' | 'error' | 'cancelled' | 'reporting' | 'joined';

export interface PrivateGamePlayer {
  userId: string;
  displayName: string;
}
export interface PrivateGame {
  roomId: string; // This will serve as gameId for private matches
  player1: PrivateGamePlayer;
  player2?: PrivateGamePlayer;
  jitsiRoomName: string;
  createdAt: number;
}

export interface CreatePrivateRoomResponse {
  status: PrivateRoomStatus;
  roomId?: string;
  jitsiRoomName?: string;
  message?: string;
}

export interface JoinPrivateRoomResponse {
  status: PrivateRoomStatus;
  roomId?: string;
  jitsiRoomName?: string;
  opponent?: PrivateGamePlayer;
  message?: string;
}

export interface PrivateRoomStatusResponse {
  status: PrivateRoomStatus;
  roomId?: string;
  jitsiRoomName?: string;
  opponent?: PrivateGamePlayer;
  isRoomCreator?: boolean;
  message?: string;
}

export interface LeavePrivateRoomResponse {
    message: string;
}

// --- Match Result Reporting Types ---
export type ReportedOutcome = 'win' | 'loss' | 'draw';

export interface PlayerOutcome {
  userId: string;
  outcome: ReportedOutcome;
}

export interface StoredMatchResult {
  player1Id: string;
  player2Id: string;
  player1Outcome?: ReportedOutcome;
  player2Outcome?: ReportedOutcome;
  // gameType: 'public' | 'private'; // Could be useful if logic differs
}

export interface ReportResultRequest {
  gameId: string;
  userId: string;
  outcome: ReportedOutcome;
  opponentId?: string; // For reconstructing a match after server restart
  isRanked?: boolean; // For reconstructing a match after server restart
}

export interface ReportResultResponse {
  status: 'success' | 'waiting' | 'conflict' | 'error' | 'already_submitted';
  message: string;
  updatedUser?: User; // Optionally return updated user score
}

// --- Quiz Types ---
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // This should be one of the strings from the options array
  // Optional: add an id if needed for keying in React, though index can also work
  id?: string; 
}

export interface QuizInput {
  numberOfQuestions: number;
  language?: string;
}

export interface QuizOutput {
  questions: QuizQuestion[];
}

// --- Advertisement Types ---
export interface Advertisement {
  id: string;
  name: string;
  videoDataUri: string;
}

export interface AdvertisementConfig {
  enabled: boolean;
  videos: Advertisement[];
}

export interface PopupBannerAd {
  enabled: boolean;
  imageUrl: string;
  targetUrl: string;
}


// --- Duel Invitation Types ---
export type DuelInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'error';

export interface DuelInvitation {
  id: string;
  fromUserId: string;
  fromUserDisplayName: string;
  fromUserPfp?: string;
  toUserId: string;
  status: DuelInvitationStatus;
  createdAt: number;
  gameId?: string; // Populated when accepted
  jitsiRoomName?: string; // Populated when accepted
}
