/**
 * Client Validation Schemas
 * Zod schemas for client data validation
 */

import { z } from 'zod';

/**
 * Mexican RFC (Tax ID) validation pattern
 * - Persona Física (individual): 4 letters + 6 digits (birthdate) + 3 alphanumeric = 13 chars
 * - Persona Moral (company): 3 letters + 6 digits + 3 alphanumeric = 12 chars
 */
const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

/**
 * Phone storage format: "COUNTRY_CODE:NUMBER" (e.g., "MX:5551234567")
 * Also accepts legacy formats for backward compatibility
 */
const phoneStoragePattern = /^([A-Z]{2}:\d{7,15}|\+?\d{7,15}|\d{3}[-.]?\d{3}[-.]?\d{2}[-.]?\d{2})$/;

/**
 * Schema for creating a new client
 */
export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es requerido').max(100, 'El nombre es demasiado largo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  // Phone can be in storage format "MX:5551234567" or legacy format
  phone: z.string().optional(),
  // ISO country code for phone (e.g., "MX", "US")
  phoneCountry: z.string().length(2).optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  // Mexican RFC (Tax ID) - 12 chars (empresa) or 13 chars (persona física)
  taxId: z.string()
    .refine(
      (val) => !val || val === '' || rfcPattern.test(val),
      { message: 'RFC inválido. Debe tener formato válido (12-13 caracteres)' }
    )
    .optional()
    .or(z.literal('')),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  gradientId: z.string().optional(), // Gradient identifier for avatar
  gradientColors: z.array(z.string()).optional(), // Array of 3 gradient colors
  projects: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

/**
 * Schema for updating an existing client
 */
export const updateClientSchema = createClientSchema.partial();

/**
 * Schema for query parameters when listing clients
 */
export const clientQuerySchema = z.object({
  isActive: z.boolean().optional(),
  industry: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

/**
 * Type inference from schemas
 */
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientQueryParams = z.infer<typeof clientQuerySchema>;

/**
 * Client type (extends the basic Client type with all fields)
 */
export interface Client {
  id: string;
  name: string;
  imageUrl?: string;
  gradientId?: string;
  gradientColors?: string[];
  email?: string;
  /** Phone in storage format "COUNTRY:NUMBER" (e.g., "MX:5551234567") or legacy format */
  phone?: string;
  /** ISO country code for phone (e.g., "MX", "US") */
  phoneCountry?: string;
  address?: string;
  industry?: string;
  website?: string;
  /** Mexican RFC (Tax ID) */
  taxId?: string;
  notes?: string;
  projects: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  lastModified?: string;
  lastModifiedBy?: string;
}
