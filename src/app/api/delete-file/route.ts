import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './src/config/Aurin Plattform Uploader.json';
const storage = new Storage({ keyFilename: keyPath });
const bucket = storage.bucket('aurin-plattform');

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      console.error('Missing filePath in request body');
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    console.log('Attempting to delete file from GCS:', filePath);
    const bucketFile = bucket.file(filePath);

    // Verifica si el archivo existe antes de intentar eliminarlo
    const [exists] = await bucketFile.exists();
    if (!exists) {
      console.warn('File does not exist in GCS:', filePath);
      return NextResponse.json({ error: 'File not found in GCS' }, { status: 404 });
    }

    // Elimina el archivo
    await bucketFile.delete();
    console.log('Successfully deleted file from GCS:', filePath);

    return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    const errorDetails = error as { code?: string; details?: unknown };
    console.error('Error deleting file from GCS:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: errorDetails.code,
      details: errorDetails.details,
    });
    return NextResponse.json(
      {
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}