import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, sessionId: currentSessionId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID de sesión requerido' },
        { status: 400 }
      );
    }

    // Verificar que no se esté intentando cerrar la sesión actual
    if (sessionId === currentSessionId) {
      return NextResponse.json(
        { error: 'No puedes cerrar tu sesión actual desde aquí' },
        { status: 400 }
      );
    }

    try {
      const client = await clerkClient();
      await client.sessions.revokeSession(sessionId);
      return NextResponse.json({
        success: true,
        message: 'Sesión revocada exitosamente'
      });
    } catch (error) {
      console.error('[API] Error revoking session:', error);
      return NextResponse.json(
        { error: 'Error al cerrar sesión' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Error revoking session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 