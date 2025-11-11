/**
 * Validation schemas for file upload endpoints
 */

import { z } from 'zod';

/**
 * Valid file upload types
 */
export const uploadTypes = ['profile', 'cover', 'message'] as const;

/**
 * Schema for file upload request validation
 */
export const uploadSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' }),
  type: z.enum(uploadTypes, {
    errorMap: () => ({ message: 'Type must be one of: profile, cover, message' }),
  }),
  conversationId: z.string().optional(),
});

export type UploadInput = z.infer<typeof uploadSchema>;

/**
 * Schema for file deletion request
 */
export const deleteFileSchema = z.object({
  filePath: z.string().min(1, 'File path is required'),
  userId: z.string().min(1, 'User ID is required'),
});

export type DeleteFileInput = z.infer<typeof deleteFileSchema>;

/**
 * Schema for Vercel Blob deletion request
 */
export const deleteBlobSchema = z.object({
  pathname: z.string().min(1, 'Blob pathname is required'),
  userId: z.string().min(1, 'User ID is required'),
});

export type DeleteBlobInput = z.infer<typeof deleteBlobSchema>;

/**
 * Validate FormData for file upload
 *
 * @param formData - FormData from request
 * @returns Parsed and validated upload data
 *
 * @example
 * ```typescript
 * const formData = await request.formData();
 * const result = validateUploadFormData(formData);
 *
 * if (!result.success) {
 *   return apiBadRequest('Validation failed', result.error.format());
 * }
 *
 * const { file, type } = result.data;
 * ```
 */
export function validateUploadFormData(formData: FormData) {
  return uploadSchema.safeParse({
    file: formData.get('file'),
    type: formData.get('type'),
    conversationId: formData.get('conversationId') || undefined,
  });
}
