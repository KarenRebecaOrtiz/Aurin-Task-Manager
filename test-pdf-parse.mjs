import { PDFParse } from 'pdf-parse';

async function test() {
  const url = 'https://5lo9ijzrei5h1pon.public.blob.vercel-storage.com/attachments/0Iyu1TRhphdTMRXn/1765320392988_PropuestaFicticia.pdf';
  console.log('Testing URL:', url);
  try {
    const parser = new PDFParse({ url });
    const result = await parser.getText();
    console.log('Success! Chars extracted:', result.text?.length || 0);
    console.log('First 500 chars:', result.text?.substring(0, 500));
    await parser.destroy();
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Full error:', e);
  }
}

test();
