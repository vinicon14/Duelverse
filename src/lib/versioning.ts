
// src/lib/versioning.ts
import { promises as fs } from 'fs';
import path from 'path';

const VERSION_FILE_PATH = path.join(process.cwd(), 'versions.json');

interface VersionHistory {
  currentVersion: string;
  history: string[];
}

async function readVersionFile(): Promise<VersionHistory> {
  try {
    const data = await fs.readFile(VERSION_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, create it with an initial version
    const initialVersion: VersionHistory = {
      currentVersion: 'beta 1.1.1',
      history: ['beta 1.1.1'],
    };
    await writeVersionFile(initialVersion);
    return initialVersion;
  }
}

async function writeVersionFile(data: VersionHistory): Promise<void> {
  await fs.writeFile(VERSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getCurrentVersion(): Promise<string> {
  const versions = await readVersionFile();
  return versions.currentVersion;
}

export async function upgradeVersion(): Promise<string> {
  const versions = await readVersionFile();
  const currentVersion = versions.currentVersion;
  const versionParts = currentVersion.split(' ');
  const versionNumbers = versionParts[1].split('.').map(Number);
  
  versionNumbers[2]++; // Increment the patch version
  
  const newVersion = `${versionParts[0]} ${versionNumbers.join('.')}`;
  
  versions.currentVersion = newVersion;
  versions.history.push(newVersion);
  
  await writeVersionFile(versions);
  
  return newVersion;
}

export async function downgradeVersion(): Promise<string> {
    const versions = await readVersionFile();
    
    if (versions.history.length <= 1) {
        throw new Error("Cannot downgrade further. Already at the initial version.");
    }
    
    // Pop the current version from history
    versions.history.pop();
    
    // Get the previous version
    const previousVersion = versions.history[versions.history.length - 1];
    
    versions.currentVersion = previousVersion;
    
    await writeVersionFile(versions);
    
    return previousVersion;
}
