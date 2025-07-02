import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserByUsername } from '@/lib/userStore';
import { promises as fs } from 'fs'; // Importa o módulo fs
import path from 'path'; // Importa o módulo path
import { v4 as uuidv4 } from 'uuid'; // Importa uuid para nomes de arquivo únicos

// Helper para garantir que o diretório de upload exista
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
    bodyParser: false, // Desabilita o body-parser para lidar com formData manualmente
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const username = formData.get('username') as string;
    const file = formData.get('profilePicture') as File | null; // Assumindo que o campo se chama 'profilePicture'

    if (!username) {
      return NextResponse.json({ message: 'Nome de usuário é obrigatório.' }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    let profilePictureUrl = existingUser.profilePictureUrl || ''; // Mantém a URL existente ou inicializa vazia

    if (file) {
      // Validação básica do tipo de arquivo
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ message: 'Tipo de arquivo inválido. Por favor, envie uma imagem.' }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), 'public', 'profile-pictures');
      await ensureUploadDir(uploadDir);

      const fileExtension = path.extname(file.name) || '.png';
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      profilePictureUrl = `/profile-pictures/${uniqueFilename}`;

      // Converte o arquivo para buffer e escreve no disco
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
    } else {
      // Se nenhum arquivo for enviado, permite que a URL seja opcionalmente redefinida para vazia
      const clearPicture = formData.get('clearPicture') === 'true';
      if (clearPicture) {
        profilePictureUrl = '';
      }
    }

    const updatedUser = await updateUser(existingUser.id, { profilePictureUrl });

    if (updatedUser) {
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Falha ao atualizar foto de perfil.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/users/update-profile-picture:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar foto de perfil.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
