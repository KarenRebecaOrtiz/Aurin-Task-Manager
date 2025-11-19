/**
 * Validation schemas for notification endpoints
 */

import { z } from 'zod';

/**
 * Schema for task summary generation request
 */
export const generateSummarySchema = z.object({
  taskContext: z.string().min(1, 'Task context is required'),
  activityContext: z.string().optional().default(''),
  timersContext: z.string().optional().default(''),
  interval: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: 'Interval must be one of: daily, weekly, monthly' }),
  }),
});

export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;

/**
 * Schema for notification email sending (legacy - for notification batches)
 */
export const sendNotificationBatchSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  notifications: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      message: z.string(),
      createdAt: z.string().or(z.date()),
    })
  ).min(1, 'At least one notification is required'),
  userEmail: z.string().email('Valid email is required'),
});

export type SendNotificationBatchInput = z.infer<typeof sendNotificationBatchSchema>;

/**
 * Schema for initializing unread notifications
 */
export const initializeUnreadSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  taskId: z.string().min(1, 'Task ID is required'),
});

export type InitializeUnreadInput = z.infer<typeof initializeUnreadSchema>;

/**
 * Schema for feedback submission
 */
export const sendFeedbackSchema = z.object({
  feedback: z.string().min(1, 'Feedback is required').max(5000, 'Feedback is too long'),
  userEmail: z.string().email('Valid email is required').optional(),
  userId: z.string().optional(),
});

export type SendFeedbackInput = z.infer<typeof sendFeedbackSchema>;
