/**
 * Public Upload API Route for Guest Users
 *
 * POST /api/public/upload-blob - Upload files from guest sessions
 * Validates guest identity via JWT session cookie instead of Clerk auth.
 * Restricted to attachment type only with stricter size limits.
 */

import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { getGuestSession } from '@/modules/shareTask/services/session.server';
import { apiSuccess, apiBadRequest, apiUnauthorized, handleApiError } from '@/lib/api/response';

const GUEST_MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

const GUEST_VALID_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];

export async function POST(request: NextRequest) {
  try {
    // Validate guest session via JWT cookie
    const guestSession = await getGuestSession();
    if (!guestSession || !guestSession.taskId) {
      return apiUnauthorized('Guest session required');
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return apiBadRequest('Vercel Blob Storage not configured');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return apiBadRequest('File is required');
    }

    // Guest can only upload to their authorized task
    if (conversationId && conversationId !== guestSession.taskId) {
      return apiUnauthorized('Guest can only upload to their authorized task');
    }

    const taskId = conversationId || guestSession.taskId;

    // Validate file size
    if (file.size > GUEST_MAX_FILE_SIZE) {
      return apiBadRequest(`File must not exceed ${GUEST_MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!GUEST_VALID_EXTENSIONS.includes(fileExtension)) {
      return apiBadRequest('Unsupported file type', {
        allowed: GUEST_VALID_EXTENSIONS,
        received: fileExtension,
      });
    }

    // Build blob path
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `attachments/guest/${taskId}/${timestamp}_${sanitizedFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const blob = await put(blobPath, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      addRandomSuffix: false,
    });

    return apiSuccess({
      url: blob.url,
      pathname: blob.pathname,
      fileName: file.name,
      fileType: file.type,
      size: file.size,
      downloadUrl: blob.downloadUrl,
      contentType: blob.contentType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/public/upload-blob');
  }
}
