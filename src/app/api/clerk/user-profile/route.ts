import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener información del usuario desde Clerk usando currentUser()
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Por ahora, no obtenemos sesiones desde el servidor ya que getSessions()
    // no está disponible en la API del servidor de Clerk
    // Las sesiones se manejan en el frontend usando currentUser.getSessions()
    const activeDevices = [];

    const userProfileData = {
      user: {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null
      },
      activeDevices,
      hasPassword: user.passwordEnabled || false,
      twoFactorEnabled: user.twoFactorEnabled || false
    };

    return NextResponse.json(userProfileData);
  } catch (error) {
    console.error('[API] Error getting user profile data:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

 