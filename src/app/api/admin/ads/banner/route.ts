
import { NextResponse, type NextRequest } from 'next/server';
import { getPopupBannerAd, updatePopupBannerAd } from '@/lib/userStore';
import { getUserById } from '@/lib/userStore'; // Assuming you have this function
import type { PopupBannerAd } from '@/lib/types';

// Helper to check for admin privileges
async function isAdmin(request: NextRequest): Promise<boolean> {
    const userId = request.headers.get('Authorization');
    if (!userId) return false;
    
    const user = await getUserById(userId);
    return !!user && (user.isCoAdmin || user.isJudge); // Assuming judges can also manage ads
}

/**
 * GET handler to fetch the current popup banner ad configuration.
 * Accessible only by admins.
 */
export async function GET(request: NextRequest) {
    if (!await isAdmin(request)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    try {
        const bannerConfig = await getPopupBannerAd();
        return NextResponse.json(bannerConfig);
    } catch (error) {
        console.error("Error fetching popup banner config:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST handler to update the popup banner ad configuration.
 * Accessible only by admins.
 */
export async function POST(request: NextRequest) {
    if (!await isAdmin(request)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const newConfig = await request.json() as PopupBannerAd;

        // Basic validation
        if (typeof newConfig.enabled !== 'boolean' || typeof newConfig.imageUrl !== 'string' || typeof newConfig.targetUrl !== 'string') {
            return NextResponse.json({ message: 'Invalid configuration format.' }, { status: 400 });
        }
        
        await updatePopupBannerAd(newConfig);

        return NextResponse.json({ message: 'Popup banner configuration updated successfully.', ...newConfig });

    } catch (error) {
        console.error("Error updating popup banner config:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
