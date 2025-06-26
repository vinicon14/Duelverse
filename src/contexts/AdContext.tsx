
'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AdvertisementConfig } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

interface AdContextType {
  adConfig: AdvertisementConfig | null;
  isAdVisible: boolean;
  currentAdUri: string | null;
  triggerAdCheck: () => void;
  hideAd: () => void;
  fetchAdConfig: () => Promise<void>;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export const AdProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [adConfig, setAdConfig] = useState<AdvertisementConfig | null>(null);
  const [isAdVisible, setIsAdVisible] = useState(false);
  const [currentAdUri, setCurrentAdUri] = useState<string | null>(null);

  const fetchAdConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/ads/config');
      if (response.ok) {
        const data = await response.json();
        setAdConfig(data);
      } else {
        setAdConfig(null);
      }
    } catch (error) {
      console.error("Failed to fetch ad config:", error);
      setAdConfig(null);
    }
  }, []);

  useEffect(() => {
    fetchAdConfig();
  }, [fetchAdConfig]);

  const triggerAdCheck = useCallback(() => {
    if (user?.isPro) return; // Do not show ads for PRO users
    if (isAdVisible) return; // Don't show an ad if one is already showing or user is navigating away from it
    
    if (adConfig && adConfig.enabled && adConfig.videos.length > 0) {
      if (Math.random() < 0.2) { // 1 in 5 chance
        const randomIndex = Math.floor(Math.random() * adConfig.videos.length);
        setCurrentAdUri(adConfig.videos[randomIndex].videoDataUri);
        setIsAdVisible(true);
      }
    }
  }, [adConfig, isAdVisible, user]);

  const hideAd = useCallback(() => {
    setIsAdVisible(false);
    setCurrentAdUri(null);
  }, []);

  const value = { adConfig, isAdVisible, currentAdUri, triggerAdCheck, hideAd, fetchAdConfig };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
};

export const useAd = () => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAd must be used within an AdProvider');
  }
  return context;
};
