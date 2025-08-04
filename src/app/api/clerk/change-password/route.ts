import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Contraseña actual y nueva contraseña son requeridas' },
        { status: 400 }
      );
    }

    // Validar que la nueva contraseña tenga al menos 8 caracteres
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Obtener el usuario actual
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario tenga contraseña habilitada
    if (!user.passwordEnabled) {
      return NextResponse.json(
        { error: 'El usuario no tiene contraseña configurada' },
        { status: 400 }
      );
    }

    // Nota: Clerk maneja el cambio de contraseña a través de su interfaz nativa
    // Esta API puede ser usada para validaciones previas
    // El cambio real se hace a través del componente UserProfile de Clerk

    return NextResponse.json({
      success: true,
      message: 'Redirigiendo a la página de cambio de contraseña de Clerk'
    });

  } catch (error) {
    console.error('[API] Error changing password:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 