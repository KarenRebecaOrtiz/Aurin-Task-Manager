import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

// Importación estática de Nodemailer
import nodemailer from 'nodemailer';

/**
 * API Route para enviar emails de notificación
 * POST /api/send-notification-emails
 * Body: { emails: Array<{ email: string; subject: string; body: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST request recibido');
    
    // Verificar que Nodemailer esté disponible
    if (!nodemailer) {
      console.error('[API] Error: Nodemailer no está disponible');
      return NextResponse.json(
        { error: 'Servicio de email no disponible' },
        { status: 500 }
      );
    }
    
    const { emails } = await request.json();
    console.log('[API] Emails recibidos:', emails);
    
    if (!emails || !Array.isArray(emails)) {
      console.log('[API] Error: emails debe ser un array');
      return NextResponse.json(
        { error: 'emails debe ser un array' },
        { status: 400 }
      );
    }

    // Limitar el número de emails por request para evitar abuso
    if (emails.length > 100) {
      console.log('[API] Error: máximo 100 emails por request');
      return NextResponse.json(
        { error: 'Máximo 100 emails por request' },
        { status: 400 }
      );
    }

    console.log(`[API] Enviando ${emails.length} emails de notificación`);

    // Verificar configuración
    console.log(`[API] Configuración de email:`, {
      user: config.email.user,
      from: config.email.from,
      hasPass: !!config.email.pass
    });

    if (!config.email.pass) {
      console.error('[API] Error: EMAIL_PASS no configurada');
      return NextResponse.json(
        { error: 'EMAIL_PASS no configurada' },
        { status: 500 }
      );
    }

    // Crear transporter de Nodemailer
    console.log('[API] Creando transporter...');
    console.log('[API] Nodemailer disponible:', !!nodemailer);
    console.log('[API] Nodemailer methods:', Object.keys(nodemailer));
    
    if (!nodemailer.createTransporter) {
      console.error('[API] Error: createTransporter no está disponible en nodemailer');
      return NextResponse.json(
        { error: 'Método createTransporter no disponible' },
        { status: 500 }
      );
    }
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    // Verificar que el transporter esté configurado correctamente
    try {
      console.log('[API] Verificando transporter...');
      await transporter.verify();
      console.log('[API] Transporter verificado correctamente');
    } catch (verifyError) {
      console.error('[API] Error verificando transporter:', verifyError);
      return NextResponse.json(
        { 
          error: 'Error de configuración de email',
          details: verifyError instanceof Error ? verifyError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Enviar emails en batch
    console.log('[API] Enviando emails...');
    const emailPromises = emails.map(async ({ email, subject, body }) => {
      try {
        const result = await transporter.sendMail({
          from: config.email.from,
          to: email,
          subject,
          html: body,
        });
        console.log(`[API] Email enviado exitosamente a ${email}:`, result.messageId);
        return { email, success: true, messageId: result.messageId };
      } catch (error) {
        console.error(`[API] Error enviando email a ${email}:`, error);
        return { email, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[API] Emails enviados: ${successful} exitosos, ${failed} fallidos`);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: emails.length,
        successful,
        failed,
      },
    });

  } catch (error) {
    console.error('[API] Error general enviando emails de notificación:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para verificar que la API funciona
 */
export async function GET() {
  console.log('[API] GET request recibido');
  return NextResponse.json({
    message: 'API de envío de emails funcionando',
    endpoint: '/api/send-notification-emails',
    method: 'POST',
    body: '{ "emails": [{ "email": "user@example.com", "subject": "Test", "body": "<p>Test</p>" }] }',
    config: {
      user: config.email.user,
      from: config.email.from,
      hasPass: !!config.email.pass
    }
  });
}
