import { Storage } from '@google-cloud/storage';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './src/config/Aurin Plattform Uploader.json';

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: keyPath,
});
const bucket = storage.bucket('aurin-plattform');

export async function POST(request: NextRequest) {
  try {
    // Verify service account key
    try {
      await fs.access(keyPath);
      console.log('Service account key found at:', keyPath);
    } catch (error) {
      console.error('Service account key not found:', error);
      throw new Error(`Service account key not found at ${keyPath}`);
    }

    console.log('Received upload request');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('No file provided in formData');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', file.name, file.type, file.size);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `clients/${Date.now()}_${sanitizedFileName}`;
    const bucketFile = bucket.file(filePath);

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Uploading file to GCS:', filePath, buffer.length, 'bytes');

    await bucketFile.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    const imageUrl = `https://storage.googleapis.com/aurin-plattform/${filePath}`;
    console.log('Image uploaded to GCS:', imageUrl);

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error uploading image:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any).code,
      details: (error as any).details,
    });
    return NextResponse.json({ error: 'Failed to upload image', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}