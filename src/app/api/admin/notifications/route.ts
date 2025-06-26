// src/app/api/admin/notifications/route.ts
import { NextResponse } from 'next/server';
import { getAdminNotifications, clearAdminNotifications } from '@/lib/userStore';

// In a real app, you MUST protect this route to ensure only admins can access it.
export async function GET() {
  try {
    const notifications = await getAdminNotifications();
    console.log(`[API /admin/notifications] GET request received. Returning ${notifications.length} notifications.`);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json({ message: 'Failed to fetch notifications.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const notifications = await getAdminNotifications();
    console.log(`[API /admin/notifications] DELETE request received. Clearing ${notifications.length} notifications.`);
    await clearAdminNotifications();
    return NextResponse.json({ message: 'Notificações limpas com sucesso.' });
  } catch (error) {
    console.error('Error clearing admin notifications:', error);
    return NextResponse.json({ message: 'Failed to clear notifications.' }, { status: 500 });
  }
}
