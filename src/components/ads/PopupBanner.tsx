
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { PopupBannerAd } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

const SESSION_STORAGE_KEY = 'popupAdShown';

export default function PopupBanner() {
  const [banner, setBanner] = useState<PopupBannerAd | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Don't show the ad to PRO users
    if (user?.isPro) {
      return;
    }

    const adShownInSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    
    if (!adShownInSession) {
      const fetchBanner = async () => {
        try {
          const response = await fetch('/api/ads/banner');
          // status 204 means the ad is disabled or not found
          if (response.ok && response.status !== 204) {
            const data: PopupBannerAd = await response.json();
            if (data.enabled && data.imageUrl && data.targetUrl) {
              setBanner(data);
              setIsVisible(true);
              sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
            }
          }
        } catch (error) {
          console.error("Failed to fetch popup banner ad:", error);
        }
      };

      // Delay the fetch slightly to not interfere with initial page load
      const timer = setTimeout(fetchBanner, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!isVisible || !banner) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[200] animate-fadeIn" onClick={() => setIsVisible(false)}>
      <div 
        className="relative bg-background p-4 rounded-lg shadow-2xl max-w-lg w-11/12 transform transition-all animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsVisible(false)}
          className="absolute -top-3 -right-3 bg-primary text-primary-foreground rounded-full p-1.5 z-10 hover:bg-primary/90 transition-transform hover:scale-110"
          aria-label="Close ad"
        >
          <X className="h-5 w-5" />
        </button>
        <Link href={banner.targetUrl} target="_blank" rel="noopener noreferrer" onClick={() => setIsVisible(false)}>
          <div className="aspect-video w-full overflow-hidden rounded">
            <Image
              src={banner.imageUrl}
              alt="Advertisement"
              width={1280}
              height={720}
              className="object-cover w-full h-full"
              priority
            />
          </div>
        </Link>
         <p className="text-xs text-muted-foreground text-center mt-2">
            Este é um anúncio. Clique na imagem para saber mais.
          </p>
      </div>
    </div>
  );
}
