
// src/lib/serverStore.ts
import { adminDb } from '@/lib/firebaseConfig';
import type { ServerStatus } from './types'; // Supondo que você tenha este tipo em types.ts

const statusDocRef = adminDb.collection('server').doc('status');

async function readStatus(): Promise<ServerStatus> {
  try {
    const doc = await statusDocRef.get();
    if (!doc.exists) {
      // Se o documento não existir, assume 'online' e cria o documento.
      await writeStatus('online');
      return 'online';
    }
    const data = doc.data();
    return data?.status === 'offline' ? 'offline' : 'online';
  } catch (error) {
    console.error('Error reading server status from Firestore, returning "online" as default.', error);
    // Em caso de erro na leitura, é mais seguro assumir que está online.
    return 'online';
  }
}

async function writeStatus(status: ServerStatus): Promise<void> {
  try {
    await statusDocRef.set({ status }, { merge: true });
  } catch (error) {
    console.error(`Failed to write server status "${status}" to Firestore.`, error);
  }
}

export async function getServerStatus(): Promise<ServerStatus> {
  return await readStatus();
}

export async function setServerStatus(status: ServerStatus): Promise<void> {
  await writeStatus(status);
}
