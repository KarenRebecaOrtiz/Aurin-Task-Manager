/**
 * Public Upload API Route for Guest Users
 *
 * POST /api/public/upload-blob - Upload files from guest sessions
 * Auth: JWT verified via Authorization Bearer header or guest_session cookie
 */

import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { jwtVerify } from 'jose';
import { apiSuccess, apiBadRequest, apiUnauthorized, handleApiError } from '@/lib/api/response';

const GUEST_SESSION_COOKIE = 'guest_session';
const GUEST_MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const GUEST_VALID_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];

const secret = new TextEncoder().encode(
  process.env.GUEST_SESSION_SECRET || 'super-secret-key-for-guest-sessions-dev-only'
);

interface GuestPayload {
  guestName: string;
  avatar: string;
  taskId: string;
}

async function verifyGuestSession(request: NextRequest): Promise<GuestPayload | null> {
  // Strategy 1: Authorization Bearer header (preferred - avoids cookie issues)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as unknown as GuestPayload;
    } catch {
      // Fall through to cookie strategy
    }
  }

  // Strategy 2: Cookie fallback
  const cookie = request.cookies.get(GUEST_SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const { payload } = await jwtVerify(cookie.value, secret);
    return payload as unknown as GuestPayload;
  } catch {
    return null;
  }
}


export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return apiBadRequest('Vercel Blob Storage not configured');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return apiBadRequest('File is required');
    }

    if (!conversationId) {
      return apiBadRequest('conversationId (taskId) is required');
    }

    // Verify guest session via Authorization header or cookie
    const guestSession = await verifyGuestSession(request);
    if (!guestSession) {
      return apiUnauthorized('Valid guest session required');
    }

    // Verify conversationId matches authorized task
    if (conversationId !== guestSession.taskId) {
      return apiUnauthorized('Guest can only upload to their authorized task');
    }

    const taskId = guestSession.taskId;

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
