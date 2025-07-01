
import { NextResponse } from 'next/server';
import { getAdvertisements, updateAdvertisements } from '@/lib/userStore';
import type { AdvertisementConfig } from '@/lib/types';

export async function GET() {
  try {
    const adsConfig = await getAdvertisements();
    return NextResponse.json(adsConfig);
  } catch (error) {
    console.error('Error fetching ad configuration:', error);
    return NextResponse.json({ message: 'Failed to fetch ad configuration.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const adConfig: AdvertisementConfig = await request.json();
        
        if (typeof adConfig?.enabled !== 'boolean' || !Array.isArray(adConfig?.videos)) {
             return NextResponse.json({ message: 'Invalid ad configuration format.' }, { status: 400 });
        }

        await updateAdvertisements(adConfig);
        
        return NextResponse.json(adConfig, { status: 200 });
    } catch (error) {
        console.error('Error updating advertisement configuration:', error);
        return NextResponse.json({ message: 'Failed to update ad configuration.' }, { status: 500 });
    }
}
