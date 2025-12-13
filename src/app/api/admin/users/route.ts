/**
 * Admin Users API Route
 *
 * POST /api/admin/users - Create a new user (admin only)
 * DELETE /api/admin/users - Delete a user (admin only)
 *
 * Requires admin authentication
 */

import { clerkClient, auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, apiForbidden, apiBadRequest } from '@/lib/api/response';

/**
 * Verify that the current user is an admin
 */
async function verifyAdmin(): Promise<{ isAdmin: boolean; userId: string | null; error?: NextResponse }> {
  const { userId } = await auth();

  if (!userId) {
    return {
      isAdmin: false,
      userId: null,
      error: NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      ),
    };
  }

  const client = await clerkClient();
  const currentUser = await client.users.getUser(userId);
  const isAdmin = currentUser.publicMetadata?.access === 'admin';

  if (!isAdmin) {
    return {
      isAdmin: false,
      userId,
      error: apiForbidden('No tienes permisos para gestionar usuarios'),
    };
  }

  return { isAdmin: true, userId };
}

/**
 * POST /api/admin/users - Create a new user
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin permissions
    const { isAdmin, userId, error } = await verifyAdmin();
    if (!isAdmin || error) return error;

    // Parse request body
    const body = await req.json();
    const { firstName, lastName, email, username, password, isAdmin: makeAdmin } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !username || !password) {
      return apiBadRequest('Todos los campos son requeridos');
    }

    // Validate password length
    if (password.length < 8) {
      return apiBadRequest('La contraseña debe tener al menos 8 caracteres');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiBadRequest('El formato del email no es válido');
    }

    // Initialize Clerk client and create user
    const client = await clerkClient();

    const newUser = await client.users.createUser({
      firstName,
      lastName,
      emailAddress: [email],
      username,
      password,
      publicMetadata: {
        access: makeAdmin ? 'admin' : 'user',
      },
      privateMetadata: {
        createdBy: userId,
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`[Admin API] User created by ${userId}: ${newUser.id}`);

    // Return created user (without sensitive data)
    return apiSuccess({
      id: newUser.id,
      username: newUser.username,
      email: newUser.emailAddresses[0]?.emailAddress,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      imageUrl: newUser.imageUrl,
      access: newUser.publicMetadata?.access,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('[Admin API] Error creating user:', error);

    // Handle Clerk-specific errors
    if (error && typeof error === 'object' && 'errors' in error) {
      const clerkError = error as { errors: Array<{ message: string; code: string }> };
      const firstError = clerkError.errors[0];

      if (firstError?.code === 'form_identifier_exists') {
        return apiBadRequest('El email o nombre de usuario ya está en uso');
      }

      return apiBadRequest(firstError?.message || 'Error al crear usuario');
    }

    return apiError('Error al crear el usuario', { status: 500 });
  }
}

/**
 * DELETE /api/admin/users - Delete a user
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verify admin permissions
    const { isAdmin, userId, error } = await verifyAdmin();
    if (!isAdmin || error) return error;

    // Parse request body
    const body = await req.json();
    const { userIdToDelete } = body;

    if (!userIdToDelete) {
      return apiBadRequest('ID de usuario requerido');
    }

    // Prevent self-deletion
    if (userId === userIdToDelete) {
      return apiBadRequest('No puedes eliminar tu propia cuenta de administrador');
    }

    // Initialize Clerk client
    const client = await clerkClient();

    // Verify user exists and check if it's an admin
    const userToDelete = await client.users.getUser(userIdToDelete);

    if (!userToDelete) {
      return apiError('Usuario no encontrado', { status: 404 });
    }

    // Prevent deletion of other admins
    const targetIsAdmin = userToDelete.publicMetadata?.access === 'admin';
    if (targetIsAdmin) {
      return apiForbidden('No puedes eliminar a otros administradores');
    }

    // Delete the user
    await client.users.deleteUser(userIdToDelete);

    console.log(`[Admin API] User ${userIdToDelete} deleted by ${userId}`);

    return apiSuccess({
      success: true,
      message: 'Usuario eliminado exitosamente',
      deletedUserId: userIdToDelete,
    });

  } catch (error: unknown) {
    console.error('[Admin API] Error deleting user:', error);

    // Handle Clerk-specific errors
    if (error && typeof error === 'object' && 'status' in error) {
      const clerkError = error as { status: number };
      if (clerkError.status === 404) {
        return apiError('Usuario no encontrado', { status: 404 });
      }
    }

    return apiError('Error al eliminar el usuario', { status: 500 });
  }
}
