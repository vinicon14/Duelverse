
// src/app/api/admin/ads/route.ts
import { NextResponse } from 'next/server';
import { getAdvertisements, addAdvertisement } from '@/lib/userStore';
import type { Advertisement } from '@/lib/types';

// In a real app, you MUST protect this route to ensure only admins can access it.
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
        const { name, videoDataUri } = await request.json() as { name: string; videoDataUri: string };

        if (!name || !videoDataUri) {
            return NextResponse.json({ message: 'Nome e dados do vídeo são obrigatórios.' }, { status: 400 });
        }

        await addAdvertisement({ name, videoDataUri });
        const updatedConfig = await getAdvertisements();

        return NextResponse.json(updatedConfig, { status: 201 });
    } catch (error) {
        console.error('Error uploading advertisement:', error);
        return NextResponse.json({ message: 'Falha ao enviar o anúncio.' }, { status: 500 });
    }
}
