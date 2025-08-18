import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';

/**
 * API Route para obtener emails de usuarios
 * POST /api/user-emails
 * Body: { userIds: string[] }
 * Response: Array<{ userId: string; email: string | null }>
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener userIds del body
    const { userIds } = await request.json();
    
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds debe ser un array' },
        { status: 400 }
      );
    }

    // Limitar el número de usuarios para evitar abuso
    if (userIds.length > 100) {
      return NextResponse.json(
        { error: 'Máximo 100 usuarios por request' },
        { status: 400 }
      );
    }

    console.log(`[API] Obteniendo emails para ${userIds.length} usuarios`);

    // Obtener emails de los usuarios desde Clerk
    const client = await clerkClient();
    const userEmails = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const user = await client.users.getUser(userId);
          const email = user.emailAddresses?.[0]?.emailAddress || null;
          return { userId, email };
        } catch (error) {
          console.error(`[API] Error obteniendo usuario ${userId}:`, error);
          return { userId, email: null };
        }
      })
    );

    // Filtrar usuarios con email válido
    const validEmails = userEmails.filter(user => user.email !== null);
    
    console.log(`[API] Emails obtenidos: ${validEmails.length}/${userIds.length} válidos`);

    return NextResponse.json({
      success: true,
      data: userEmails,
      validCount: validEmails.length,
      totalCount: userIds.length,
    });

  } catch (error) {
    console.error('[API] Error obteniendo emails de usuarios:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para verificar que la API funciona
 */
export async function GET() {
  return NextResponse.json({
    message: 'API de emails de usuarios funcionando',
    endpoint: '/api/user-emails',
    method: 'POST',
    body: '{ "userIds": ["user1", "user2"] }'
  });
}
