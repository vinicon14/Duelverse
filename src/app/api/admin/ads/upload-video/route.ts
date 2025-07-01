
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getUserByUsername } from '@/lib/userStore';
import { updateAdvertisements, getAdvertisements } from '@/lib/userStore';

const ADMIN_USERNAME = 'vinicon14';

// Helper to ensure the upload directory exists
async function ensureUploadDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    // This is a server-side error, so we throw to stop the process
    throw new Error(`Failed to create upload directory.`);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Increase limit to 100MB for video uploads
    },
  },
};

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('Authorization');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized: Missing user ID' }, { status: 401 });
    }

    // In a real app, you'd look up the user by their actual ID from a session
    const adminUser = await getUserByUsername(ADMIN_USERNAME);
    if (!adminUser || adminUser.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('video') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Basic validation
    if (!file.type.startsWith('video/')) {
        return NextResponse.json({ message: 'Invalid file type. Please upload a video.' }, { status: 400 });
    }

    const videosDir = path.join(process.cwd(), 'public', 'videos');
    await ensureUploadDir(videosDir);

    const fileExtension = path.extname(file.name) || '.mp4';
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(videosDir, uniqueFilename);
    const fileUrlPath = `/videos/${uniqueFilename}`;

    // Convert file to buffer and write to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Update the database
    const currentAdConfig = await getAdvertisements();
    const newAd = {
      id: uuidv4(),
      url: fileUrlPath,
      duration: 15, // Assuming 15s for now as per requirement
      originalName: file.name,
    };
    
    currentAdConfig.videos.push(newAd);

    await updateAdvertisements(currentAdConfig);
    
    return NextResponse.json({ 
        message: 'Video uploaded successfully', 
        advertisement: newAd 
    }, { status: 201 });

  } catch (error) {
    console.error('Video upload failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
