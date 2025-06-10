import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './src/config/Aurin Plattform Uploader.json';
const storage = new Storage({ keyFilename: keyPath });
const bucket = storage.bucket('aurin-plattform');

export async function POST(request: NextRequest) {
  try {
    await fs.access(keyPath);
    console.log('Service account key found at:', keyPath);

    const { filePath } = await request.json();
    if (!filePath) {
      console.error('Missing filePath in request body');
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    console.log('Deleting file from GCS:', filePath);
    await bucket.file(filePath).delete();
    console.log('File deleted from GCS:', filePath);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorDetails = error as { code?: string; details?: unknown };
    console.error('Error deleting file:', {
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