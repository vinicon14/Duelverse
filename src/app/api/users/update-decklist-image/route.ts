
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserById } from '@/lib/userStore';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { verify } from 'jsonwebtoken';

async function ensureUploadDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    throw new Error(`Failed to create upload directory.`);
  }
}

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

  try {
    const userId = decoded.userId;

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const { image } = await request.json(); // Use 'image' as key

    let newDecklistImageUrl = user.decklistImageUrl || '';

    if (image) {
      if (image.startsWith('data:image/')) {
        const matches = image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (!matches) {
          return NextResponse.json({ message: 'Formato de data URL inválido.' }, { status: 400 });
        }
        const imageType = matches[1].split('/')[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        const uploadDir = path.join(process.cwd(), 'public', 'decklists');
        await ensureUploadDir(uploadDir);

        const uniqueFilename = `${uuidv4()}.${imageType}`;
        const filePath = path.join(uploadDir, uniqueFilename);
        newDecklistImageUrl = `/decklists/${uniqueFilename}`;

        await fs.writeFile(filePath, buffer);
      } else if (image.startsWith('http') || image.startsWith('/')) {
        newDecklistImageUrl = image;
      } else {
        return NextResponse.json({ message: 'Formato de imagem inválido. Use data URL ou URL direta.' }, { status: 400 });
      }
    } else {
      newDecklistImageUrl = '';
    }

    const updatedUser = await updateUser(userId, { decklistImageUrl: newDecklistImageUrl }); // Use userId

    if (updatedUser) {
      const { password, ...userWithoutPassword } = updatedUser; // Don't send password back
      return NextResponse.json(userWithoutPassword, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Falha ao atualizar imagem da decklist.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/users/update-decklist-image:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar imagem da decklist.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
