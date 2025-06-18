console.log('[sendFeedback] Route file loaded', {
    file: 'src/app/api/sendFeedback/route.ts',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    nextVersion: process.env.NEXT_VERSION || 'unknown',
  });
  
  import { NextRequest, NextResponse } from 'next/server';
  import nodemailer from 'nodemailer';
  
  export async function POST(req: NextRequest) {
    console.log('[sendFeedback] API route invoked', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers),
      timestamp: new Date().toISOString(),
    });
  
    try {
      console.log('[sendFeedback] Parsing request body', { timestamp: new Date().toISOString() });
      const { feedback } = await req.json();
  
      console.log('[sendFeedback] Request body parsed', { feedback, timestamp: new Date().toISOString() });
  
      if (!feedback || typeof feedback !== 'string') {
        console.error('[sendFeedback] Invalid feedback', { feedback, timestamp: new Date().toISOString() });
        return NextResponse.json({ message: 'Feedback is required' }, { status: 400 });
      }
  
      console.log('[sendFeedback] Environment variables checked', {
        emailUser: process.env.EMAIL_USER ? 'Set' : 'Not set',
        emailPass: process.env.EMAIL_PASS ? 'Set' : 'Not set',
        timestamp: new Date().toISOString(),
      });
  
      console.log('[sendFeedback] Creating nodemailer transporter', { timestamp: new Date().toISOString() });
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
  
      console.log('[sendFeedback] Preparing to send email', {
        from: '"Your System Feedback" <sodioinfo@gmail.com>',
        to: 'karen.ortizg@yahoo.com',
        subject: 'New Feedback Submission',
        timestamp: new Date().toISOString(),
      });
  
      await transporter.sendMail({
        from: '"Your System Feedback" <sodioinfo@gmail.com>',
        to: 'karen.ortizg@yahoo.com',
        subject: 'New Feedback Submission',
        text: `Feedback: ${feedback}`,
        html: `<p><strong>Feedback:</strong> ${feedback}</p>`,
      });
  
      console.log('[sendFeedback] Email sent successfully', { timestamp: new Date().toISOString() });
      return NextResponse.json({ message: 'Feedback sent successfully' }, { status: 200 });
    } catch (error) {
      console.error('[sendFeedback] Error processing request', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ message: 'Failed to send feedback' }, { status: 500 });
    }
  }