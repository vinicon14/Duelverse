
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getUserByUsername, updatePopupBannerAd } from '@/lib/userStore';

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
    const file = formData.get('banner') as File | null;
    const targetUrl = formData.get('targetUrl') as string | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ message: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    const imagesDir = path.join(process.cwd(), 'public', 'images');
    await ensureUploadDir(imagesDir);

    const fileExtension = path.extname(file.name) || '.png';
    const uniqueFilename = `banner-${uuidv4()}${fileExtension}`;
    const filePath = path.join(imagesDir, uniqueFilename);
    const fileUrlPath = `/images/${uniqueFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    await updatePopupBannerAd({
      enabled: true, // Automatically enable when a new banner is uploaded
      imageUrl: fileUrlPath,
      targetUrl: targetUrl || '',
    });
    
    return NextResponse.json({ 
        message: 'Banner uploaded successfully', 
        banner: { imageUrl: fileUrlPath, targetUrl }
    }, { status: 201 });

  } catch (error) {
    console.error('Banner upload failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
