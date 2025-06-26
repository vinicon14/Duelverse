
'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface AdPlayerProps {
  videoUri: string;
  onClose: () => void;
}

export default function AdPlayer({ videoUri, onClose }: AdPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCloseButton(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, 15000);

    const videoElement = videoRef.current;
    const handleTimeUpdate = () => {
      if (videoElement && videoElement.currentTime >= 15) {
        videoElement.pause();
        setShowCloseButton(true);
      }
    };

    videoElement?.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      clearTimeout(timer);
      videoElement?.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
      <div className="relative w-full h-full max-w-5xl max-h-[80vh]">
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute -top-10 right-0 sm:top-2 sm:right-2 z-10 bg-black/50 hover:bg-black/80 text-white hover:text-white h-10 w-10 rounded-full"
            aria-label="Close ad"
          >
            <X className="h-6 w-6" />
          </Button>
        )}
        <video
          ref={videoRef}
          src={videoUri}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
