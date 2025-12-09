// src/modules/shareTask/schemas/validation.schemas.ts
import { z } from 'zod';
import { COMMENT_CONFIG, TOKEN_CONFIG } from '../utils/constants';

/**
 * Public Task Schema
 * Defines what fields are safe to expose publicly
 * Deliberately EXCLUDES: budget, cost, internalNotes, userId, etc.
 */
export const PublicTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  project: z.string(),
  createdAt: z.string(),
  // Task activity status (based on startDate/endDate)
  isActive: z.boolean(),
  // Comments enabled flag
  commentsEnabled: z.boolean().default(false),
  // Participants (for displaying in chat)
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string(),
  })).default([]),
});

export type PublicTask = z.infer<typeof PublicTaskSchema>;

/**
 * Guest Comment Input Schema
 * Validates guest comment submissions
 */
export const GuestCommentInputSchema = z.object({
  content: z
    .string()
    .min(COMMENT_CONFIG.MIN_LENGTH, 'El comentario no puede estar vacio')
    .max(
      COMMENT_CONFIG.MAX_LENGTH,
      `El comentario no puede exceder ${COMMENT_CONFIG.MAX_LENGTH} caracteres`
    )
    .trim(),
  guestName: z
    .string()
    .min(COMMENT_CONFIG.MIN_GUEST_NAME_LENGTH, 'El nombre es requerido')
    .max(
      COMMENT_CONFIG.MAX_GUEST_NAME_LENGTH,
      `El nombre no puede exceder ${COMMENT_CONFIG.MAX_GUEST_NAME_LENGTH} caracteres`
    )
    .trim(),
  guestEmail: z.string().email('Email invalido').optional().or(z.literal('')),
  shareToken: z
    .string()
    .length(
      TOKEN_CONFIG.TOKEN_LENGTH,
      `Token invalido (debe tener ${TOKEN_CONFIG.TOKEN_LENGTH} caracteres)`
    ),
});

export type GuestCommentInput = z.infer<typeof GuestCommentInputSchema>;

/**
 * Guest Identity Schema
 * For localStorage persistence
 */
export const GuestIdentitySchema = z.object({
  name: z
    .string()
    .min(COMMENT_CONFIG.MIN_GUEST_NAME_LENGTH)
    .max(COMMENT_CONFIG.MAX_GUEST_NAME_LENGTH),
  email: z.string().email().optional().or(z.literal('')),
  lastUsed: z.string().datetime(),
});

export type GuestIdentity = z.infer<typeof GuestIdentitySchema>;

/**
 * Public Comment Schema (what guests see)
 */
export const PublicCommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorName: z.string(),
  isStaff: z.boolean(),
  createdAt: z.string(),
  editedAt: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

export type PublicComment = z.infer<typeof PublicCommentSchema>;

/**
 * Share Token Validation Schema
 */
export const ShareTokenSchema = z
  .string()
  .length(
    TOKEN_CONFIG.TOKEN_LENGTH,
    `Token debe tener exactamente ${TOKEN_CONFIG.TOKEN_LENGTH} caracteres`
  )
  .regex(
    /^[a-zA-Z0-9]+$/,
    'Token contiene caracteres invalidos (solo alfanumericos permitidos)'
  );

/**
 * Toggle Sharing Input Schema
 */
export const ToggleSharingInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID es requerido'),
  enabled: z.boolean(),
  commentsEnabled: z.boolean().default(false),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type ToggleSharingInput = z.infer<typeof ToggleSharingInputSchema>;

/**
 * Regenerate Token Input Schema
 */
export const RegenerateTokenInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID es requerido'),
});

export type RegenerateTokenInput = z.infer<typeof RegenerateTokenInputSchema>;

/**
 * Revoke Access Input Schema
 */
export const RevokeAccessInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID es requerido'),
});

export type RevokeAccessInput = z.infer<typeof RevokeAccessInputSchema>;

/**
 * Generate Guest Token Input Schema
 */
export const GenerateGuestTokenInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID es requerido'),
  tokenName: z.string().min(2, 'El nombre del token debe tener al menos 2 caracteres').max(50, 'El nombre no puede tener más de 50 caracteres').optional(),
});

export type GenerateGuestTokenInput = z.infer<typeof GenerateGuestTokenInputSchema>;

/**
 * Revoke Guest Token Input Schema
 */
export const RevokeGuestTokenInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID es requerido'),
  tokenId: z.string().min(1, 'Token ID es requerido'),
});

export type RevokeGuestTokenInput = z.infer<typeof RevokeGuestTokenInputSchema>;

/**
 * Redeem Guest Token Input Schema
 */
export const RedeemGuestTokenInputSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
  guestName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'El nombre no puede tener más de 50 caracteres'),
  avatar: z.string().url('La URL del avatar no es válida'),
});

export type RedeemGuestTokenInput = z.infer<typeof RedeemGuestTokenInputSchema>;


/**
 * Helper: Convert Firestore Timestamp to ISO string
 */
function timestampToString(timestamp: any): string | null {
  if (!timestamp) return null;
  
  // If it's already a string, return it
  if (typeof timestamp === 'string') return timestamp;
  
  // If it's a Firestore Timestamp object with toDate method
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // If it's a Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // If it has _seconds (Firebase Admin SDK format)
  if (timestamp?._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  
  // If it has seconds (Firestore Timestamp-like)
  if (timestamp?.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  
  return null;
}

/**
 * Sanitization Function: Task to PublicTask
 * Removes sensitive fields and adds computed properties
 * Converts Firestore Timestamps to ISO strings
 */
export function sanitizeTaskForPublic(task: any, participants?: any[]): PublicTask {
  // Convert timestamps to strings BEFORE checking isActive
  const startDateStr = timestampToString(task.startDate);
  const endDateStr = timestampToString(task.endDate);
  const createdAtStr = timestampToString(task.createdAt) || new Date().toISOString();
  
  const isActive = isTaskActiveNow(startDateStr, endDateStr);

  const sanitized = {
    id: task.id,
    name: task.name,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    startDate: startDateStr,
    endDate: endDateStr,
    project: task.project,
    createdAt: createdAtStr,
    isActive,
    commentsEnabled: task.commentsEnabled || false,
    participants: participants || [],
  };

  // Validate with Zod to ensure type safety
  return PublicTaskSchema.parse(sanitized);
}

/**
 * Helper: Check if task is within active date range
 */
function isTaskActiveNow(
  startDate: string | null,
  endDate: string | null
): boolean {
  if (!startDate || !endDate) {
    // If no dates, consider always active
    return true;
  }

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set end date to end of day (23:59:59)
  end.setHours(23, 59, 59, 999);

  return now >= start && now <= end;
}

/**
 * Sanitization Function: Comment to PublicComment
 */
export function sanitizeCommentForPublic(comment: any): PublicComment {
  return PublicCommentSchema.parse({
    id: comment.id,
    content: comment.content,
    authorName: comment.guestName || comment.user?.fullName || 'Usuario',
    isStaff: !!comment.userId, // If has userId, it's from staff
    createdAt: comment.createdAt,
    editedAt: comment.editedAt || null,
    avatar: comment.user?.imageUrl || null,
  });
}

/**
 * Validation Result Type
 */
export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Safe Parse Wrapper
 * Returns consistent validation result format
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const firstError = result.error.errors[0];
  return {
    success: false,
    error: firstError?.message || 'Datos invalidos',
  };
}
