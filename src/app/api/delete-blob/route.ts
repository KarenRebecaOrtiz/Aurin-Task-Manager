/**
 * Delete Blob API Route
 *
 * DELETE /api/delete-blob - Delete a file from Vercel Blob Storage
 * Requires authentication
 *
 * Security:
 * - Validates that the user owns the blob (userId must match)
 * - Prevents deletion of other users' files
 * - Uses Zod validation for input
 */

import { NextRequest } from 'next/server';
import { del } from '@vercel/blob';
import { requireAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, apiNotFound, apiServerError, handleApiError } from '@/lib/api/response';
import { deleteBlobSchema } from '@/lib/api/schemas';

export async function DELETE(request: NextRequest) {
  // ✅ AUTENTICACIÓN REQUERIDA
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    console.log('[API/delete-blob] Delete request from user:', userId);

    // ✅ VERIFICAR QUE BLOB_READ_WRITE_TOKEN ESTÉ CONFIGURADO
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API/delete-blob] BLOB_READ_WRITE_TOKEN not configured');
      return apiServerError('Vercel Blob Storage not configured');
    }

    // ✅ VALIDAR REQUEST CON ZOD
    const body = await request.json();
    const validation = deleteBlobSchema.safeParse({
      ...body,
      userId,
    });

    if (!validation.success) {
      console.error('[API/delete-blob] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid delete request', validation.error.format());
    }

    const { pathname } = validation.data;

    console.log('[API/delete-blob] Attempting to delete blob:', {
      pathname,
      userId,
    });

    // ✅ VALIDAR OWNERSHIP DEL ARCHIVO
    // pathname debe contener el userId para verificar que el usuario es dueño del archivo
    // Formato esperado: avatars/{userId}/... o thumbnails/{userId}/... etc.
    const pathParts = pathname.split('/');

    // Verificar que el pathname contiene el userId
    if (!pathname.includes(userId!)) {
      console.warn('[API/delete-blob] User attempted to delete file not owned by them:', {
        pathname,
        userId,
      });
      return apiBadRequest('You can only delete your own files', {
        pathname,
        reason: 'User ID not found in pathname',
      });
    }

    // ✅ VERIFICAR QUE EL ARCHIVO EXISTE
    // Construir la URL completa del blob para verificar existencia
    // Nota: @vercel/blob no tiene un método "exists", así que intentamos eliminar directamente
    // Si no existe, del() lanzará un error

    try {
      // ✅ ELIMINAR BLOB DE VERCEL
      await del(pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      console.log('[API/delete-blob] Blob deleted successfully:', pathname);

      return apiSuccess({
        message: 'Blob deleted successfully',
        pathname,
        deletedAt: new Date().toISOString(),
      });
    } catch (deleteError) {
      // Si el blob no existe, Vercel arroja un error específico
      if (deleteError instanceof Error) {
        if (deleteError.message.includes('not found') || deleteError.message.includes('404')) {
          console.warn('[API/delete-blob] Blob not found:', pathname);
          return apiNotFound('Blob');
        }
      }

      // Otros errores
      throw deleteError;
    }
  } catch (error: unknown) {
    return handleApiError(error, 'DELETE /api/delete-blob');
  }
}

/**
 * GET endpoint para verificar que la API funciona
 */
export async function GET() {
  const isConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

  return apiSuccess({
    message: 'Delete Blob API',
    endpoint: '/api/delete-blob',
    method: 'DELETE',
    configured: isConfigured,
    body: {
      pathname: 'avatars/user_123/1699999999_avatar.jpg',
    },
    note: 'pathname is the value returned by /api/upload-blob in the response',
  });
}
