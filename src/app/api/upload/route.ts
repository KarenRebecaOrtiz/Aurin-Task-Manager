import { NextRequest } from 'next/server';
import { initializeFirebase } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api/auth';
import { apiSuccess, handleApiError, apiBadRequest } from '@/lib/api/response';
import { validateUploadFormData } from '@/lib/api/schemas';

const MAX_SIZES = {
  profile: 5 * 1024 * 1024,
  cover: 10 * 1024 * 1024,
  message: 10 * 1024 * 1024,
  chatbot: 10 * 1024 * 1024, // 10MB para archivos del chatbot
};

const VALID_EXTENSIONS = {
  profile: ['jpg', 'jpeg', 'png', 'gif'],
  cover: ['jpg', 'jpeg', 'png', 'gif'],
  message: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
  chatbot: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt'], // Archivos permitidos para chatbot
};

function getStoragePath(type: string, userId: string, conversationId?: string) {
  switch (type) {
    case 'profile':
      return `users/${userId}/profile_${Date.now()}`;
    case 'cover':
      return `users/${userId}/cover_${Date.now()}`;
    case 'message':
      if (!conversationId) throw new Error('conversationId is required for message uploads');
      return `messages/${conversationId}/${Date.now()}_${Date.now()}`;
    case 'chatbot':
      // Archivos del chatbot se guardan en carpeta dedicada
      return `chatbot/${userId}/${Date.now()}`;
    default:
      throw new Error('Invalid upload type');
  }
}

export async function POST(request: NextRequest) {
  // Authentication check (defense-in-depth)
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  const { bucket } = await initializeFirebase();

  try {
    console.log('[API/upload] Received upload request from user:', userId);

    // Parse and validate FormData
    const formData = await request.formData();
    const validation = validateUploadFormData(formData);

    if (!validation.success) {
      console.error('[API/upload] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid upload data', validation.error.format());
    }

    const { file, type, conversationId } = validation.data;

    console.log('[API/upload] File received:', {
      name: file.name,
      fileType: file.type,
      size: file.size,
      userId,
      uploadType: type,
      conversationId,
    });

    // Validate file size
    const maxSize = MAX_SIZES[type] || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error(`[API/upload] ${type} exceeds ${maxSize / (1024 * 1024)}MB limit`, {
        fileSize: file.size
      });
      return apiBadRequest(
        `${type} must not exceed ${maxSize / (1024 * 1024)}MB`,
        { maxSize, actualSize: file.size }
      );
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const validExtensions = VALID_EXTENSIONS[type];
    if (!validExtensions.includes(fileExtension)) {
      console.error(`[API/upload] Unsupported file extension for ${type}`, { fileExtension });
      return apiBadRequest(
        `Unsupported file extension for ${type}`,
        { allowed: validExtensions, received: fileExtension }
      );
    }

    // Upload to Firebase Storage
    const storagePath = `${getStoragePath(type, userId!, conversationId)}.${fileExtension}`;
    const storageFile = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('[API/upload] Uploading file to Firebase Storage:', {
      path: storagePath,
      size: buffer.length,
      contentType: file.type,
    });

    await storageFile.save(buffer, {
      metadata: {
        contentType: file.type || 'application/octet-stream',
        userId: userId!,
        type,
      },
    });

    console.log('[API/upload] File uploaded successfully');
    const imageUrl = storageFile.publicUrl();

    return apiSuccess({
      url: imageUrl,
      fileName: file.name,
      fileType: file.type,
      filePath: storagePath,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/upload');
  }
}