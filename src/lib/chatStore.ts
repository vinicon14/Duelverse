// src/lib/chatStore.ts

/**
 * This file is deprecated. Chat functionality has been removed.
 * It is kept to avoid breaking imports in files that might not be part of this change.
 */

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  profilePictureUrl?: string;
  text: string;
  timestamp: number;
}

// In-memory store is no longer used.
export const chatRooms: Map<string, ChatMessage[]> = new Map();

export function addMessageToRoom(roomId: string, message: ChatMessage) {
  // Deprecated
}

export function getMessagesForRoom(roomId: string): ChatMessage[] {
  // Deprecated
  return [];
}
