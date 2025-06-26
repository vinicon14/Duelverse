
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useRef, useContext, useEffect, useCallback } from 'react';

interface AudioControlContextType {
  isPlaying: boolean;
  togglePlayPause: () => void;
  audioSrc: string;
  setAudioSrc: (src: string) => void;
  isReady: boolean;
}

const AudioControlContext = createContext<AudioControlContextType | undefined>(undefined);

// Placeholder background music URL - User should replace this with their desired track
const DEFAULT_AUDIO_SRC = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const AudioControlProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState(DEFAULT_AUDIO_SRC);
  const [isReady, setIsReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Cleanup previous audio element if src changes
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Release resources
        audioRef.current.load();
        audioRef.current = null; 
      }

      const audioElement = new Audio(audioSrc);
      audioElement.loop = true;
      audioRef.current = audioElement;
      setIsReady(false); // Set to false until new audio is ready
      
      const handleCanPlayThrough = () => {
        setIsReady(true);
        // If isPlaying was true and src changed, try to resume play
        if (isPlaying) {
            audioElement.play().catch(error => console.error("Error playing new audio src:", error));
        }
      };
      
      audioElement.addEventListener('canplaythrough', handleCanPlayThrough);
      audioElement.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        setIsReady(false); // Audio failed to load
      });
      
      audioElement.load();

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('canplaythrough', handleCanPlayThrough);
          audioRef.current.removeEventListener('error', () => {});
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
    return () => {}; // No-op for server-side
  }, [audioSrc]); // Re-run effect if audioSrc changes

  const togglePlayPause = useCallback(() => {
    if (audioRef.current && isReady) {
      if (audioRef.current.paused && !isPlaying) { // Check current state of element vs desired state
        audioRef.current.play().then(() => {
            setIsPlaying(true);
        }).catch(error => console.error("Error playing audio:", error));
      } else if (!audioRef.current.paused && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else if (audioRef.current.paused && isPlaying) { // Desired playing, but element is paused (e.g. after src change)
         audioRef.current.play().catch(error => console.error("Error resuming audio:", error));
      } else { // Desired not playing, but element is playing (should not happen with this logic)
         audioRef.current.pause();
      }
    }
  }, [isReady, isPlaying]); // isPlaying dependency added

  // This effect synchronizes the audio element's playing state with the `isPlaying` state.
  useEffect(() => {
    if (audioRef.current && isReady) {
      if (isPlaying) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(error => console.error("Error syncing audio to play:", error));
        }
      } else {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    }
  }, [isPlaying, isReady, audioSrc]); // audioSrc added to re-evaluate if source changes

  return (
    <AudioControlContext.Provider value={{ isPlaying, togglePlayPause, audioSrc, setAudioSrc, isReady }}>
      {children}
    </AudioControlContext.Provider>
  );
};

export const useAudioControl = () => {
  const context = useContext(AudioControlContext);
  if (context === undefined) {
    throw new Error('useAudioControl must be used within an AudioControlProvider');
  }
  return context;
};
