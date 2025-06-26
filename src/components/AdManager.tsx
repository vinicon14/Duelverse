
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAd } from '@/contexts/AdContext';
import AdPlayer from './AdPlayer';

export default function AdManager() {
    const { isAdVisible, currentAdUri, triggerAdCheck, hideAd } = useAd();
    const pathname = usePathname();
    const previousPathnameRef = useRef(pathname);

    useEffect(() => {
        if (pathname !== previousPathnameRef.current) {
            // Ensure we don't trigger a new ad if one is already visible from a previous navigation
            if (!isAdVisible) {
                triggerAdCheck();
            }
            previousPathnameRef.current = pathname;
        }
    }, [pathname, triggerAdCheck, isAdVisible]);

    if (!isAdVisible || !currentAdUri) {
        return null;
    }

    return <AdPlayer videoUri={currentAdUri} onClose={hideAd} />;
}
