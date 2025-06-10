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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file || !conversationId) {
      console.error('Missing file or conversationId in formData');
      return NextResponse.json({ error: 'File and conversationId are required' }, { status: 400 });
    }

    console.log('File received:', file.name, file.type, file.size);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `messages/${conversationId}/${Date.now()}_${sanitizedFileName}`;
    const bucketFile = bucket.file(filePath);

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Uploading file to GCS:', filePath, buffer.length, 'bytes');

    await bucketFile.save(buffer, {
      metadata: { contentType: file.type || 'application/octet-stream' },
    });

    const [signedUrl] = await bucketFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });
    console.log('File uploaded to GCS:', signedUrl);

    return NextResponse.json({
      url: signedUrl,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      filePath, // Added for deletion
    }, { status: 200 });
  } catch (error: unknown) {
    const errorDetails = error as { code?: string; details?: unknown };
    console.error('Error uploading file:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: errorDetails.code,
      details: errorDetails.details,
    });
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}