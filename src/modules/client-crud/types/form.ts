/**
 * Client Form Types
 */

import { Client } from '@/types';
import { PhoneNumber } from '../utils/validation';

/**
 * Structured phone value for the form
 * Can be string (legacy) or PhoneNumber (structured with country code)
 */
export type PhoneValue = string | PhoneNumber;

export interface ClientFormData {
  name: string;
  email?: string;
  /** Phone can be legacy string or structured {country, number} */
  phone?: PhoneValue;
  /** ISO country code for phone (e.g., "MX", "US") */
  phoneCountry?: string;
  address?: string;
  industry?: string;
  website?: string;
  /** Mexican RFC (Tax ID) - 12 chars (empresa) or 13 chars (persona física) */
  taxId?: string;
  notes?: string;
  imageUrl?: string;
  gradientId?: string; // Gradient identifier for avatar
  gradientColors?: string[]; // Array of 3 gradient colors
  projects?: string[];
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  lastModified?: string;
  lastModifiedBy?: string;
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
