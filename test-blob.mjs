import { put } from '@vercel/blob';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

async function test() {
  try {
    console.log('Testing Vercel Blob upload...');
    console.log('Token exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log('Token starts with:', process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 25));
    
    const { url } = await put('test/hello.txt', 'Hello World Test ' + new Date().toISOString(), { 
      access: 'public'
    });
    
    console.log('SUCCESS! URL:', url);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
  }
}

test();
