/**
 * Validation schemas for user-related endpoints
 */

import { z } from 'zod';

/**
 * Schema for user role update
 */
export const updateRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['admin', 'user', 'manager'], {
    errorMap: () => ({ message: 'Role must be one of: admin, user, manager' }),
  }),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/**
 * Schema for generic user metadata update
 */
export const updateUserMetadataSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  metadata: z.record(z.unknown(), {
    errorMap: () => ({ message: 'Metadata must be a valid object' }),
  }),
});

export type UpdateUserMetadataInput = z.infer<typeof updateUserMetadataSchema>;

/**
 * Schema for session revocation
 */
export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;

/**
 * Schema for user deletion request
 */
export const requestDeleteSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().optional(),
});

export type RequestDeleteInput = z.infer<typeof requestDeleteSchema>;

/**
 * Schema for bulk email fetching
 */
export const userEmailsSchema = z.object({
  emails: z.array(z.string().email('Invalid email format')).min(1, 'At least one email is required'),
});

export type UserEmailsInput = z.infer<typeof userEmailsSchema>;
