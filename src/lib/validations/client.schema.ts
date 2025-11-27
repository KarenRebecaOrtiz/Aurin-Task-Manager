/**
 * Client Validation Schemas
 * Zod schemas for client data validation
 */

import { z } from 'zod';

/**
 * Schema for creating a new client
 */
export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es requerido').max(100, 'El nombre es demasiado largo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  taxId: z.string().optional(), // RFC
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
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
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  website?: string;
  taxId?: string;
  notes?: string;
  projects: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  lastModified?: string;
  lastModifiedBy?: string;
}
