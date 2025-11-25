/**
 * Task Utils - CLIENT-SAFE Entry Point
 *
 * This file exports ONLY client-safe utilities.
 * For server-only utilities (deleteTask, archiveTask, unarchiveTask with email),
 * import from '@/lib/taskUtils.server'
 *
 * ✅ Safe to import in client components
 * ✅ Safe to import in server components
 * ✅ Does NOT include any server-only dependencies (mailer, nodemailer, etc.)
 */

// Re-export all client-safe utilities (can be used anywhere)
export * from './taskUtils.client';
