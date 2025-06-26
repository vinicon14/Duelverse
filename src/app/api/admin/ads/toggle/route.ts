
// src/app/api/admin/ads/toggle/route.ts
import { NextResponse } from 'next/server';
import { getAdvertisements, updateAdvertisements } from '@/lib/userStore';

// In a real app, you MUST protect this route to ensure only admins can access it.
export async function POST(request: Request) {
  try {
    const { enabled } = await request.json() as { enabled: boolean };
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ message: 'O status "enabled" (booleano) é obrigatório.' }, { status: 400 });
    }

    const currentConfig = await getAdvertisements();
    currentConfig.enabled = enabled;
    await updateAdvertisements(currentConfig);

    return NextResponse.json({ message: 'Status do anúncio atualizado.', enabled: currentConfig.enabled });
  } catch (error) {
    console.error('Error toggling ad status:', error);
    return NextResponse.json({ message: 'Falha ao atualizar o status do anúncio.' }, { status: 500 });
  }
}
