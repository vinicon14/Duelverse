// src/app/api/users/update-profile-picture/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserByUsername } from '@/lib/userStore';
import { getAdminStorage } from '@/lib/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const username = formData.get('username') as string;
    const imageFile = formData.get('profilePicture') as Blob | null; // Assuming the field name is 'profilePicture'

    if (!username) {
      return NextResponse.json({ message: 'Nome de usuário e URL da foto de perfil são obrigatórios.' }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    let profilePictureUrl = '';

    if (imageFile) {
      // Upload the image to Firebase Storage
      const bucket = getAdminStorage().bucket();
      const filename = `profile-pictures/${username}/${uuidv4()}.${imageFile.type.split('/')[1]}`; // Unique filename
      const file = bucket.file(filename);

      const buffer = await imageFile.arrayBuffer();

      await file.save(Buffer.from(buffer), {
        metadata: {
          contentType: imageFile.type,
        },
      });

      profilePictureUrl = await file.getSignedUrl({
        action: 'read',
        expires: '12-31-2499',
      })[0];
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
