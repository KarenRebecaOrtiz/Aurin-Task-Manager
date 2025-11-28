/**
 * Client CRUD Module
 * Public API for client creation, viewing, and editing
 */

// ClientDialog is now centralized in @/modules/dialogs
export { ClientDialog } from '@/modules/dialogs';
export { clientService } from './services/clientService';
export type { ClientFormData, ClientDialogProps } from './types/form';
