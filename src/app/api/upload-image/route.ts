import { NextRequest, NextResponse } from 'next/server';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app'; // Solo necesitamos esto
import { firebaseConfig } from '@/lib/firebaseConfig';

// Inicializar Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('[API] Firebase app initialized successfully');
} catch (error) {
  console.error('[API] Failed to initialize Firebase app:', error);
}

const storage = app ? getStorage(app) : null;

export async function POST(request: NextRequest) {
  if (!storage) {
    console.error('[API] Firebase Storage not initialized');
    return NextResponse.json({ error: 'Firebase Storage not initialized' }, { status: 500 });
  }

  try {
    console.log('[API] Received upload request');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const type = formData.get('type') as 'cover' | 'profile' | null;

    // Validar parámetros
    if (!file) {
      console.error('[API] No file provided in formData');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!userId) {
      console.error('[API] No userId provided in formData');
      return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
    }
    if (!type || !['cover', 'profile'].includes(type)) {
      console.error('[API] Invalid or missing type provided in formData', { type });
      return NextResponse.json({ error: 'Invalid or missing type (must be "cover" or "profile")' }, { status: 400 });
    }

    // Verificar autenticación (confiar en credentials: 'include' del cliente)
    const clerkUserId = request.headers.get('x-clerk-user-id');
    console.log('[API] Request headers:', request.headers);
    console.log('[API] Authenticated userId from header:', clerkUserId);

    if (!clerkUserId || clerkUserId !== userId) {
      console.error('[API] Authentication mismatch:', { clerkUserId, userId });
      return NextResponse.json({ error: 'Authentication mismatch' }, { status: 403 });
    }

    console.log('[API] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId,
      imageType: type,
    });

    // Obtener la extensión del archivo
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedFileName = `${type}.${fileExtension}`;
    const storagePath = `users/${userId}/${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[API] Uploading file to Firebase Storage:', {
      path: storagePath,
      size: buffer.length,
      contentType: file.type,
    });

    // Subir archivo
    await uploadBytes(storageRef, buffer, {
      contentType: file.type || 'image/jpeg',
      customMetadata: { userId },
    });

    // Obtener URL de descarga
    const imageUrl = await getDownloadURL(storageRef);
    console.log('[API] Image uploaded to Firebase Storage:', { imageUrl });

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error: unknown) {
    const errorDetails = error as { code?: string; details?: unknown };
    console.error('[API] Error uploading image:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: errorDetails.code,
      details: errorDetails.details,
    });
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}