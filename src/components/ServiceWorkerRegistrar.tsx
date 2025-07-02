
'use client';

import Script from 'next/script';
import React from 'react';

export default function ServiceWorkerRegistrar() {
  return (
    <Script
      src="/sw.js"
      strategy="afterInteractive"
      onError={(e) => {
        console.error('Script failed to load', e);
      }}
      onLoad={() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
            .catch((error) => console.error('Service Worker registration failed:', error));
        }
      }}
    />
  );
}
