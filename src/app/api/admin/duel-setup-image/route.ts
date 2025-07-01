
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserByUsername } from '@/lib/userStore';
import { updateDatabase, getDB } from '@/lib/database';

const ADMIN_USERNAME = 'vinicon14';

async function ensureUploadDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    throw new Error(`Failed to create upload directory.`);
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('Authorization');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized: Missing user ID' }, { status: 401 });
    }

    const adminUser = await getUserByUsername(ADMIN_USERNAME);
    if (!adminUser || adminUser.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const imageType = new URL(request.url).searchParams.get('type');

    if (!file || !imageType || (imageType !== 'left' && imageType !== 'right')) {
      return NextResponse.json({ message: 'Invalid request: Missing image or type' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ message: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'images', 'duel-setup');
    await ensureUploadDir(uploadDir);

    const filename = imageType === 'left' ? 'setup-left-example.png' : 'setup-right-example.png';
    const filePath = path.join(uploadDir, filename);
    const fileUrlPath = `/images/duel-setup/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const db = await getDB();
    if (!db.duelSetupImages) {
        db.duelSetupImages = { left: '', right: '' };
    }
    db.duelSetupImages[imageType] = fileUrlPath;
    await updateDatabase(db);
    
    return NextResponse.json({ 
        message: `Image for ${imageType} side uploaded successfully`, 
        path: fileUrlPath 
    }, { status: 201 });

  } catch (error) {
    console.error('Image upload failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
