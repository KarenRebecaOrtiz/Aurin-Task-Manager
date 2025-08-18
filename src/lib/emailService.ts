/**
 * Servicio de email para el cliente
 * Usa la API route /api/send-notification-emails para enviar emails
 */

export class EmailService {
  /**
   * Envía una notificación por email
   * @param recipientEmail - Email del destinatario
   * @param subject - Asunto del email
   * @param body - Cuerpo del email (HTML)
   */
  async sendNotificationEmail(recipientEmail: string, subject: string, body: string) {
    try {
      const response = await fetch('/api/send-notification-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: [{ email: recipientEmail, subject, body }]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[EmailService] Notification email sent successfully to: ${recipientEmail}`);
        return result;
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error(`[EmailService] Error sending notification email to ${recipientEmail}:`, error);
      throw error;
    }
  }

  /**
   * Envía múltiples emails en batch
   * @param emails - Array de emails a enviar
   */
  async sendBatchNotificationEmails(emails: Array<{ email: string; subject: string; body: string }>) {
    try {
      if (emails.length === 0) {
        console.log('[EmailService] No emails to send');
        return;
      }

      console.log(`[EmailService] Enviando ${emails.length} emails usando API V2...`);
      
      const response = await fetch('/api/send-notification-emails-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails }),
      });

      console.log(`[EmailService] Respuesta de API V2: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EmailService] Error response details:', errorData);
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[EmailService] Batch notification emails sent successfully to ${emails.length} recipients`);
        return result;
      } else {
        throw new Error(result.error || 'Failed to send batch emails');
      }
    } catch (error) {
      console.error('[EmailService] Error sending batch notification emails:', error);
      throw error;
    }
  }

  // Placeholder para la lógica de envío de correos
  async sendInvite(email: string, inviteLink: string) {
    console.log(`Placeholder: Sending invite to ${email} with link ${inviteLink}`);
    // TODO: Implementar con la API route correspondiente
  }

  async sendDeleteRequest(userId: string, fullName: string, adminEmail: string) {
    console.log(`Placeholder: Sending deletion request for ${fullName} (${userId}) to ${adminEmail}`);
    // TODO: Implementar con la API route correspondiente
  }
}

export const emailService = new EmailService();