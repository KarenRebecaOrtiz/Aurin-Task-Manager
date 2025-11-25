/**
 * Send Notification Emails API Route (v2 - Dynamic Import)
 *
 * POST /api/send-notification-emails-v2 - Send batch notification emails
 * Requires authentication
 * Uses dynamic import for nodemailer
 */

import { NextRequest } from 'next/server';
import { config } from '@/lib/config';
import { requireAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, apiServerError, handleApiError } from '@/lib/api/response';
import { sendNotificationEmailsSchema } from '@/lib/api/schemas';

export async function POST(request: NextRequest) {
  // ✅ AUTENTICACIÓN REQUERIDA
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    console.log('[API/send-notification-emails-v2] Request from user:', userId);

    // ✅ VALIDAR REQUEST CON ZOD
    const body = await request.json();
    const validation = sendNotificationEmailsSchema.safeParse({
      ...body,
      userId,
    });

    if (!validation.success) {
      console.error('[API/send-notification-emails-v2] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid email request', validation.error.format());
    }

    const { emails } = validation.data;

    console.log(`[API/send-notification-emails-v2] Sending ${emails.length} notification emails`);

    // ✅ VERIFICAR CONFIGURACIÓN DE EMAIL
    console.log('[API/send-notification-emails-v2] Email config:', {
      user: config.email.user,
      from: config.email.from,
      hasPass: !!config.email.pass,
    });

    if (!config.email.pass) {
      console.error('[API/send-notification-emails-v2] EMAIL_PASS not configured');
      return apiServerError('Email service not configured');
    }

    // ✅ IMPORTAR NODEMAILER DINÁMICAMENTE
    console.log('[API/send-notification-emails-v2] Importing Nodemailer dynamically...');
    const nodemailer = await import('nodemailer');
    console.log('[API/send-notification-emails-v2] Nodemailer imported successfully');

    // ✅ CREAR TRANSPORTER
    console.log('[API/send-notification-emails-v2] Creating transporter...');
    console.log('[API/send-notification-emails-v2] Nodemailer available:', !!nodemailer);
    console.log('[API/send-notification-emails-v2] Nodemailer methods:', Object.keys(nodemailer));

    if (!nodemailer.default || !nodemailer.default.createTransport) {
      console.error('[API/send-notification-emails-v2] createTransport not available');
      return apiServerError('Email transport not available');
    }

    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    // ✅ VERIFICAR TRANSPORTER
    try {
      console.log('[API/send-notification-emails-v2] Verifying transporter...');
      await transporter.verify();
      console.log('[API/send-notification-emails-v2] Transporter verified successfully');
    } catch (verifyError) {
      console.error('[API/send-notification-emails-v2] Transporter verification failed:', verifyError);
      return apiServerError(
        'Email configuration error',
        verifyError instanceof Error ? verifyError.message : 'Unknown error'
      );
    }

    // ✅ ENVIAR EMAILS EN BATCH
    console.log('[API/send-notification-emails-v2] Sending emails...');
    const emailPromises = emails.map(async ({ email, subject, body }) => {
      try {
        const result = await transporter.sendMail({
          from: config.email.from,
          to: email,
          subject,
          html: body,
        });
        console.log(`[API/send-notification-emails-v2] Email sent to ${email}:`, result.messageId);
        return { email, success: true, messageId: result.messageId };
      } catch (error) {
        console.error(`[API/send-notification-emails-v2] Failed to send email to ${email}:`, error);
        return {
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[API/send-notification-emails-v2] Batch complete: ${successful} successful, ${failed} failed`);

    return apiSuccess({
      results,
      summary: {
        total: emails.length,
        successful,
        failed,
      },
      userId, // Para tracking
    });
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/send-notification-emails-v2');
  }
}

/**
 * GET endpoint para verificar que la API funciona
 */
export async function GET() {
  return apiSuccess({
    message: 'Send Notification Emails API (v2 - Dynamic Import)',
    endpoint: '/api/send-notification-emails-v2',
    method: 'POST',
    authenticated: true,
    body: {
      emails: [
        {
          email: 'user@example.com',
          subject: 'Test Subject',
          body: '<p>Test HTML body</p>',
        },
      ],
    },
    config: {
      user: config.email.user,
      from: config.email.from,
      hasPass: !!config.email.pass,
    },
  });
}
