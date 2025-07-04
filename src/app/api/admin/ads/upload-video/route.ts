import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { updateAdvertisements, getAdvertisements, getUserById } from '@/lib/userStore';
import { verify } from 'jsonwebtoken';

async function ensureUploadDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    throw new Error(`Failed to create upload directory.`);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não está definido nas variáveis de ambiente');
    return NextResponse.json({ message: 'Erro de configuração do servidor' }, { status: 500 });
  }

  let decoded: { userId: string };
  try {
    decoded = verify(token, secret) as { userId: string };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
  }

  const adminUser = await getUserById(decoded.userId);
  if (!adminUser || (!adminUser.isAdmin && !adminUser.isCoAdmin)) {
    return NextResponse.json({ message: 'Forbidden: Not authorized as Admin or Co-Admin' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('video') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
        return NextResponse.json({ message: 'Invalid file type. Please upload a video.' }, { status: 400 });
    }

    const videosDir = path.join(process.cwd(), 'public', 'videos');
    await ensureUploadDir(videosDir);

    const fileExtension = path.extname(file.name) || '.mp4';
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(videosDir, uniqueFilename);
    const fileUrlPath = `/videos/${uniqueFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const currentAdConfig = await getAdvertisements();
    const newAd = {
      id: uuidv4(),
      url: fileUrlPath,
      duration: 15,
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
