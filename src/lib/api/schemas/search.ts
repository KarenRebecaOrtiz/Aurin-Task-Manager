/**
 * Validation schemas for search endpoint
 */

import { z } from 'zod';

/**
 * Schema for web search request
 */
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500, 'Query is too long'),
  limit: z.number().int().positive().max(100).optional().default(10),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type SearchInput = z.infer<typeof searchSchema>;
