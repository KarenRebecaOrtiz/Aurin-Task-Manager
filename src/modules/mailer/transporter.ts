/**
 * Mailer Module - Transporter (Infrastructure Layer)
 *
 * Singleton pattern for NodeMailer connection.
 * This is the ONLY file that knows about NodeMailer.
 * If you switch to SendGrid/Resend/etc, only modify this file.
 *
 * Follows:
 * - Single Responsibility Principle (only handles email transport)
 * - Dependency Inversion (rest of app doesn't know about nodemailer)
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { mailConfig, validateMailConfig, type MailOptions } from './config';

// Singleton instance
let transporterInstance: Transporter | null = null;

/**
 * Get or create the nodemailer transporter instance (Singleton)
 * Lazy initialization - only creates when first needed
 */
function getTransporter(): Transporter {
  if (!transporterInstance) {
    // Validate config before creating transporter
    validateMailConfig();

    transporterInstance = nodemailer.createTransport({
      service: mailConfig.service,
      auth: mailConfig.auth,
    });

    console.log('[Mailer] Transporter initialized');
  }

  return transporterInstance;
}

/**
 * Send email using NodeMailer
 *
 * This is the infrastructure abstraction.
 * The application layer (services) calls this without knowing it's NodeMailer.
 *
 * @param options - Email options (to, subject, html)
 * @returns Promise with send result
 */
export async function sendEmailInternal(
  options: MailOptions
): Promise<{ success: boolean; messageId?: string; error?: unknown }> {
  try {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: options.from || mailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`[Mailer] Email sent successfully: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[Mailer] Error sending email:', error);

    return {
      success: false,
      error,
    };
  }
}

/**
 * Verify transporter connection (useful for health checks)
 * Non-throwing - returns boolean
 */
export async function verifyTransporter(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('[Mailer] Transporter verified successfully');
    return true;
  } catch (error) {
    console.error('[Mailer] Transporter verification failed:', error);
    return false;
  }
}

/**
 * Close transporter connection (useful for testing/cleanup)
 */
export function closeTransporter(): void {
  if (transporterInstance) {
    transporterInstance.close();
    transporterInstance = null;
    console.log('[Mailer] Transporter closed');
  }
}
