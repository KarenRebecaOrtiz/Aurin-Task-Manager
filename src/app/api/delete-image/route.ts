/**
 * Delete Image API Route
 *
 * POST /api/delete-image - Delete a file from Firebase Storage
 * Requires authentication
 */

import { NextRequest } from 'next/server';
import { initializeFirebase } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, apiNotFound, handleApiError } from '@/lib/api/response';
import { deleteFileSchema } from '@/lib/api/schemas';

export async function POST(request: NextRequest) {
  // Authentication check (defense-in-depth)
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  const { bucket } = await initializeFirebase();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = deleteFileSchema.safeParse({
      ...body,
      userId,
    });

    if (!validation.success) {
      console.error('[API/delete-image] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid delete request', validation.error.format());
    }

    const { filePath } = validation.data;

    console.log('[API/delete-image] Attempting to delete file from GCS:', filePath);
    const bucketFile = bucket.file(filePath);

    // Check if file exists
    const [exists] = await bucketFile.exists();
    if (!exists) {
      console.warn('[API/delete-image] File does not exist in GCS:', filePath);
      return apiNotFound('File');
    }

    // Delete the file
    await bucketFile.delete();
    console.log('[API/delete-image] Successfully deleted file from GCS:', filePath);

    return apiSuccess({ message: 'File deleted successfully' });
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/delete-image');
  }
}