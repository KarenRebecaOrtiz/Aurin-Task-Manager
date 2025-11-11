/**
 * AI/GPT API Validation Schemas
 */

import { z } from 'zod';

/**
 * Schema for /api/generate-summary
 */
export const generateSummarySchema = z.object({
  taskContext: z.string().min(10, 'Task context must be at least 10 characters').max(10000, 'Task context too long'),
  activityContext: z.string().min(1, 'Activity context is required').max(10000, 'Activity context too long'),
  timersContext: z.string().min(1, 'Timers context is required').max(5000, 'Timers context too long'),
  interval: z.string().min(1, 'Interval is required').max(100, 'Interval too long'),
  userId: z.string().optional(), // Added by server after auth
});

export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;
