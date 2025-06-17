import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { initializeFirebase } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const { storage, bucket } = await initializeFirebase();

  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filePath } = await request.json();
    if (!filePath) {
      console.error('[API/delete-image] Missing filePath in request body');
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    console.log('[API/delete-image] Attempting to delete file from GCS:', filePath);
    const bucketFile = bucket.file(filePath);

    const [exists] = await bucketFile.exists();
    if (!exists) {
      console.warn('[API/delete-image] File does not exist in GCS:', filePath);
      return NextResponse.json({ error: 'File not found in GCS' }, { status: 404 });
    }

    await bucketFile.delete();
    console.log('[API/delete-image] Successfully deleted file from GCS:', filePath);

    return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    const errorDetails = error as { code?: string; details?: unknown };
    console.error('[API/delete-image] Error deleting file from GCS:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: errorDetails.code,
      details: errorDetails.details,
    });
    return NextResponse.json(
      { error: 'Failed to delete file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}