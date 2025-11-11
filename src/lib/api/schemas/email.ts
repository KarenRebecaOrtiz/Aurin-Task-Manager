/**
 * Email API Validation Schemas
 */

import { z } from 'zod';

/**
 * Schema for individual email in batch
 */
const emailItemSchema = z.object({
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(50000, 'Body too long'),
});

/**
 * Schema for /api/send-notification-emails and /api/send-notification-emails-v2
 */
export const sendNotificationEmailsSchema = z.object({
  emails: z
    .array(emailItemSchema)
    .min(1, 'At least one email is required')
    .max(100, 'Maximum 100 emails per request'),
  userId: z.string().optional(), // Added by server after auth
});

export type SendNotificationEmailsInput = z.infer<typeof sendNotificationEmailsSchema>;
export type EmailItem = z.infer<typeof emailItemSchema>;
