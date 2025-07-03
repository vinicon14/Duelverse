
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
        // Adiciona um atraso antes de registrar o Service Worker
        setTimeout(() => {
          if ('serviceWorker' in navigator) {
            try {
              navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
                .catch((error) => console.error('Service Worker registration failed:', error));
            } catch (e:any) {
              console.error("Service Worker registration error (try/catch):");
              console.error(e);
            }
          }
        }, 500); // Atraso de 500 milissegundos (ajuste se necessário)
      }}
    />
  );
}
