import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { initializeFirebase } from '@/lib/firebase-admin';

const MAX_SIZES = {
  profile: 5 * 1024 * 1024,
  cover: 10 * 1024 * 1024,
  message: 10 * 1024 * 1024,
};

const VALID_EXTENSIONS = {
  profile: ['jpg', 'jpeg', 'png', 'gif'],
  cover: ['jpg', 'jpeg', 'png', 'gif'],
  message: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
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
    default:
      throw new Error('Invalid upload type');
  }
}

export async function POST(request: NextRequest) {
  const { storage, bucket } = await initializeFirebase();
  let formData: FormData; // Declare outside try block

  try {
    console.log('[API/upload] Received upload request, URL:', request.url);

    const { userId } = getAuth(request);
    if (!userId) {
      console.error('[API/upload] No user authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    formData = await request.formData(); // Assign inside try block
    const file = formData.get('file');
    if (!(file instanceof File)) {
      console.error('[API/upload] Invalid file object in formData', { file });
      return NextResponse.json({ error: 'Invalid or missing file' }, { status: 400 });
    }
    const type = formData.get('type')?.toString();
    const conversationId = formData.get('conversationId')?.toString();

    if (!type) {
      console.error('[API/upload] Missing type in formData', { formData: Object.fromEntries(formData) });
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    console.log('[API/upload] File received:', {
      name: file.name,
      fileType: file.type,
      size: file.size,
      userId,
      uploadType: type,
      conversationId,
    });

    const maxSize = MAX_SIZES[type as keyof typeof MAX_SIZES] || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error(`[API/upload] ${type} exceeds ${maxSize / (1024 * 1024)}MB limit`, { fileSize: file.size });
      return NextResponse.json({ error: `${type} must not exceed ${maxSize / (1024 * 1024)}MB` }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const validExtensions = VALID_EXTENSIONS[type as keyof typeof VALID_EXTENSIONS];
    if (!validExtensions.includes(fileExtension)) {
      console.error(`[API/upload] Unsupported file extension for ${type}`, { fileExtension });
      return NextResponse.json({ error: `Unsupported file extension for ${type}. Allowed: ${validExtensions.join(', ')}` }, { status: 400 });
    }

    const storagePath = `${getStoragePath(type, userId, conversationId)}.${fileExtension}`;
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
        userId,
        type,
      },
    });

    console.log('[API/upload] File uploaded successfully to Firebase Storage');
    const imageUrl = storageFile.publicUrl();
    console.log('[API/upload] Image URL obtained:', { imageUrl });

    return NextResponse.json(
      {
        url: imageUrl,
        fileName: file.name,
        fileType: file.type,
        filePath: storagePath,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API/upload] Error processing request:', {
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      formData: formData ? Object.fromEntries(formData) : 'Not available due to error', // Now in scope
    });
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}