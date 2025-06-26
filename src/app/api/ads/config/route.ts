
// src/app/api/ads/config/route.ts
import { NextResponse } from 'next/server';
import { getAdvertisements } from '@/lib/userStore';

export async function GET() {
  try {
    const adsConfig = await getAdvertisements();
    // Only return data if the system is enabled
    if (adsConfig.enabled) {
      return NextResponse.json(adsConfig);
    } else {
      // Return disabled status so client knows not to try again
      return NextResponse.json({ enabled: false, videos: [] });
    }
  } catch (error) {
    console.error('Error fetching ad configuration:', error);
    return NextResponse.json({ message: 'Failed to fetch ad configuration.' }, { status: 500 });
  }
}
