/**
 * Feedback API Route
 *
 * POST /api/sendFeedback - Send user feedback via email
 * Public endpoint (no authentication required)
 */

import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { optionalAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, apiServerError } from '@/lib/api/response';
import { sendFeedbackSchema } from '@/lib/api/schemas';

export async function POST(req: NextRequest) {
  console.log('[sendFeedback] API route invoked', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  try {
    // Optional authentication (captures userId if logged in)
    const userId = await optionalAuth();

    // Parse and validate request body
    const body = await req.json();
    const validation = sendFeedbackSchema.safeParse({
      ...body,
      userId: userId || body.userId,
    });

    if (!validation.success) {
      console.error('[sendFeedback] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid feedback data', validation.error.format());
    }

    const { feedback, userEmail } = validation.data;

    console.log('[sendFeedback] Processing feedback', {
      hasUserId: !!userId,
      hasEmail: !!userEmail,
      feedbackLength: feedback.length,
      timestamp: new Date().toISOString(),
    });

    // Check email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('[sendFeedback] Email not configured');
      return apiServerError('Email service not configured');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: '"Task Manager Feedback" <sodioinfo@gmail.com>',
      to: 'karen.ortizg@yahoo.com',
      subject: 'New Feedback Submission',
      text: `Feedback: ${feedback}\nFrom: ${userEmail || 'Anonymous'}\nUser ID: ${userId || 'Not logged in'}`,
      html: `
        <h2>New Feedback Submission</h2>
        <p><strong>Feedback:</strong> ${feedback}</p>
        <p><strong>From:</strong> ${userEmail || 'Anonymous'}</p>
        <p><strong>User ID:</strong> ${userId || 'Not logged in'}</p>
        <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
      `,
    });

    console.log('[sendFeedback] Email sent successfully', { timestamp: new Date().toISOString() });
    return apiSuccess({ message: 'Feedback sent successfully' });
  } catch (error) {
    console.error('[sendFeedback] Error processing request', {
      error: error instanceof Error ? error.message : JSON.stringify(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return apiServerError('Failed to send feedback', error);
  }
}