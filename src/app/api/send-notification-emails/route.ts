/**
 * Send Notification Emails API Route (v1)
 *
 * POST /api/send-notification-emails - Send batch notification emails
 * Requires authentication
 */

import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { config } from '@/lib/config';
import { requireAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, apiServerError, handleApiError } from '@/lib/api/response';
import { sendNotificationEmailsSchema } from '@/lib/api/schemas';

export async function POST(request: NextRequest) {
  // ✅ AUTENTICACIÓN REQUERIDA
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    console.log('[API/send-notification-emails] Request from user:', userId);

    // ✅ VALIDAR REQUEST CON ZOD
    const body = await request.json();
    const validation = sendNotificationEmailsSchema.safeParse({
      ...body,
      userId,
    });

    if (!validation.success) {
      console.error('[API/send-notification-emails] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid email request', validation.error.format());
    }

    const { emails } = validation.data;

    console.log(`[API/send-notification-emails] Sending ${emails.length} notification emails`);

    // ✅ VERIFICAR CONFIGURACIÓN DE EMAIL
    console.log('[API/send-notification-emails] Email config:', {
      user: config.email.user,
      from: config.email.from,
      hasPass: !!config.email.pass,
    });

    if (!config.email.pass) {
      console.error('[API/send-notification-emails] EMAIL_PASS not configured');
      return apiServerError('Email service not configured');
    }

    // ✅ VERIFICAR NODEMAILER
    if (!nodemailer) {
      console.error('[API/send-notification-emails] Nodemailer not available');
      return apiServerError('Email service not available');
    }

    // ✅ CREAR TRANSPORTER
    console.log('[API/send-notification-emails] Creating transporter...');

    if (!nodemailer.createTransport) {
      console.error('[API/send-notification-emails] createTransport not available');
      return apiServerError('Email transport not available');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    // ✅ VERIFICAR TRANSPORTER
    try {
      console.log('[API/send-notification-emails] Verifying transporter...');
      await transporter.verify();
      console.log('[API/send-notification-emails] Transporter verified successfully');
    } catch (verifyError) {
      console.error('[API/send-notification-emails] Transporter verification failed:', verifyError);
      return apiServerError(
        'Email configuration error',
        verifyError instanceof Error ? verifyError.message : 'Unknown error'
      );
    }

    // ✅ ENVIAR EMAILS EN BATCH
    console.log('[API/send-notification-emails] Sending emails...');
    const emailPromises = emails.map(async ({ email, subject, body }) => {
      try {
        const result = await transporter.sendMail({
          from: config.email.from,
          to: email,
          subject,
          html: body,
        });
        console.log(`[API/send-notification-emails] Email sent to ${email}:`, result.messageId);
        return { email, success: true, messageId: result.messageId };
      } catch (error) {
        console.error(`[API/send-notification-emails] Failed to send email to ${email}:`, error);
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

    console.log(`[API/send-notification-emails] Batch complete: ${successful} successful, ${failed} failed`);

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
    return handleApiError(error, 'POST /api/send-notification-emails');
  }
}

/**
 * GET endpoint para verificar que la API funciona
 */
export async function GET() {
  return apiSuccess({
    message: 'Send Notification Emails API (v1)',
    endpoint: '/api/send-notification-emails',
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
