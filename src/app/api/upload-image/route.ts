import { Storage } from '@google-cloud/storage';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './src/config/aurin-plattform-key.json',
});
const bucket = storage.bucket('aurin-plattform');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `clients/${Date.now()}_${sanitizedFileName}`;
    const bucketFile = bucket.file(filePath);

    const buffer = Buffer.from(await file.arrayBuffer());
    await bucketFile.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Generate public URL
    const imageUrl = `https://storage.googleapis.com/aurin-plattform/${filePath}`;
    console.log('Image uploaded to GCS:', imageUrl);

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}