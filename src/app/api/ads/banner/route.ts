
import { NextResponse } from 'next/server';
import { getPopupBannerAd } from '@/lib/userStore';

/**
 * GET handler to fetch the current popup banner ad configuration for public consumption.
 */
export async function GET() {
    try {
        const bannerConfig = await getPopupBannerAd();
        
        // Only return the ad if it is enabled.
        if (bannerConfig.enabled) {
            return NextResponse.json(bannerConfig);
        } else {
            // If the ad is disabled, return a clear response indicating so.
            // Using 204 No Content is appropriate here.
            return new NextResponse(null, { status: 204 });
        }

    } catch (error) {
        console.error("Error fetching public banner config:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
