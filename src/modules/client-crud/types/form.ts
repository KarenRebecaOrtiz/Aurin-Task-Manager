/**
 * Client Form Types
 */

import { Client } from '@/types';

export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  website?: string;
  taxId?: string;
  notes?: string;
  imageUrl?: string;
  projects?: string[];
}

export interface ClientDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onClientCreated?: () => void;
  onClientUpdated?: () => void;
  clientId?: string;
  mode?: 'create' | 'view' | 'edit';
}

export const STEP_FIELDS = [
  ['name', 'industry', 'taxId'],
  ['email', 'phone', 'website', 'address', 'notes'],
  ['projects'],
] as const;

export const FORM_PERSISTENCE_KEYS = {
  CREATE: 'client-create-form',
  EDIT: (id: string) => `client-edit-form-${id}`,
};
