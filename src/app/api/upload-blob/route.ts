/**
 * Vercel Blob Storage Upload API Route
 *
 * POST /api/upload-blob - Upload small files to Vercel Blob Storage
 * Ideal para archivos pequeños (< 4.5MB por defecto) que no requieren Google Cloud Storage
 *
 * Ventajas de Vercel Blob:
 * - Más rápido que GCS para archivos pequeños
 * - Integración nativa con Vercel
 * - CDN automático
 * - Más económico para archivos temporales/pequeños
 *
 * Casos de uso:
 * - Avatares temporales
 * - Thumbnails
 * - Archivos de cache
 * - Adjuntos pequeños de chat
 */

import { NextRequest } from 'next/server';
import { put, PutBlobResult } from '@vercel/blob';
import { requireAuth } from '@/lib/api/auth';
import { apiSuccess, handleApiError, apiBadRequest } from '@/lib/api/response';
import { validateUploadFormData } from '@/lib/api/schemas';

// Límites de tamaño para Vercel Blob (más conservadores que GCS)
const MAX_SIZES = {
  avatar: 2 * 1024 * 1024,     // 2MB - avatares pequeños
  thumbnail: 1 * 1024 * 1024,  // 1MB - thumbnails
  attachment: 4 * 1024 * 1024, // 4MB - adjuntos pequeños
  cache: 5 * 1024 * 1024,      // 5MB - archivos de cache
};

// Extensiones permitidas (más restrictivo para seguridad)
const VALID_EXTENSIONS = {
  avatar: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  thumbnail: ['jpg', 'jpeg', 'png', 'webp'],
  attachment: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
  cache: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'webp'],
};

/**
 * Genera la ruta de almacenamiento en Vercel Blob
 * Estructura: {type}/{userId}/{timestamp}_{filename}
 */
function getBlobPath(
  type: string,
  userId: string,
  filename: string,
  conversationId?: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

  switch (type) {
    case 'avatar':
      return `avatars/${userId}/${timestamp}_${sanitizedFilename}`;

    case 'thumbnail':
      return `thumbnails/${userId}/${timestamp}_${sanitizedFilename}`;

    case 'attachment':
      if (!conversationId) {
        throw new Error('conversationId is required for attachment uploads');
      }
      return `attachments/${conversationId}/${timestamp}_${sanitizedFilename}`;

    case 'cache':
      return `cache/${userId}/${timestamp}_${sanitizedFilename}`;

    default:
      throw new Error(`Invalid upload type: ${type}`);
  }
}

export async function POST(request: NextRequest) {
  // Authentication check (defense-in-depth)
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    console.log('[API/upload-blob] Received upload request from user:', userId);

    // Verificar que BLOB_READ_WRITE_TOKEN esté configurado
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API/upload-blob] BLOB_READ_WRITE_TOKEN not configured');
      return apiBadRequest('Vercel Blob Storage not configured', {
        error: 'BLOB_READ_WRITE_TOKEN environment variable is missing'
      });
    }

    // Parse and validate FormData
    const formData = await request.formData();
    const validation = validateUploadFormData(formData);

    if (!validation.success) {
      console.error('[API/upload-blob] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid upload data', validation.error.format());
    }

    const { file, type, conversationId } = validation.data;

    console.log('[API/upload-blob] File received:', {
      name: file.name,
      fileType: file.type,
      size: file.size,
      userId,
      uploadType: type,
      conversationId,
    });

    // Validar que el tipo sea compatible con Vercel Blob
    const validBlobTypes = ['avatar', 'thumbnail', 'attachment', 'cache'];
    if (!validBlobTypes.includes(type)) {
      console.error('[API/upload-blob] Invalid type for Vercel Blob:', type);
      return apiBadRequest(
        `Type "${type}" is not supported by Vercel Blob. Use /api/upload for other types.`,
        { supportedTypes: validBlobTypes }
      );
    }

    // Validate file size
    const maxSize = MAX_SIZES[type as keyof typeof MAX_SIZES] || 2 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error(`[API/upload-blob] ${type} exceeds ${maxSize / (1024 * 1024)}MB limit`, {
        fileSize: file.size,
      });
      return apiBadRequest(
        `${type} must not exceed ${maxSize / (1024 * 1024)}MB`,
        { maxSize, actualSize: file.size }
      );
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const validExtensions = VALID_EXTENSIONS[type as keyof typeof VALID_EXTENSIONS];
    if (!validExtensions.includes(fileExtension)) {
      console.error(`[API/upload-blob] Unsupported file extension for ${type}`, { fileExtension });
      return apiBadRequest(
        `Unsupported file extension for ${type}`,
        { allowed: validExtensions, received: fileExtension }
      );
    }

    // Upload to Vercel Blob Storage
    const blobPath = getBlobPath(type, userId!, file.name, conversationId);
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('[API/upload-blob] Uploading file to Vercel Blob:', {
      path: blobPath,
      size: buffer.length,
      contentType: file.type,
    });

    // Usar @vercel/blob para subir el archivo
    const blob: PutBlobResult = await put(blobPath, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      addRandomSuffix: false, // Ya agregamos timestamp manualmente
    });

    console.log('[API/upload-blob] File uploaded successfully to Vercel Blob:', {
      url: blob.url,
      pathname: blob.pathname,
    });

    return apiSuccess({
      url: blob.url,           // URL pública del archivo
      pathname: blob.pathname, // Ruta interna del blob
      fileName: file.name,
      fileType: file.type,
      size: file.size,
      downloadUrl: blob.downloadUrl, // URL de descarga directa
      contentType: blob.contentType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/upload-blob');
  }
}

/**
 * GET endpoint para verificar que la API funciona
 */
export async function GET() {
  const isConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

  return apiSuccess({
    message: 'Vercel Blob Storage API',
    endpoint: '/api/upload-blob',
    method: 'POST',
    configured: isConfigured,
    supportedTypes: ['avatar', 'thumbnail', 'attachment', 'cache'],
    maxSizes: {
      avatar: '2MB',
      thumbnail: '1MB',
      attachment: '4MB',
      cache: '5MB',
    },
    body: {
      file: '<File>',
      type: 'avatar | thumbnail | attachment | cache',
      conversationId: 'string (required for attachment)',
    },
  });
}
