/**
 * Task Validation Schemas
 *
 * Centralized Zod schemas for task validation across API routes.
 * 
 * This is a TASK CRUD SCHEMA 
 * Ensures consistent validation between client and server.
 */

import { z } from 'zod';

/**
 * Base task schema with all required and optional fields
 */
export const taskSchema = z.object({
  // Client Info
  clientId: z.string().min(1, { message: "Selecciona una cuenta*" }),
  project: z.string().min(1, { message: "Selecciona una carpeta*" }),

  // Basic Info
  name: z.string().min(1, { message: "El nombre es obligatorio*" }),
  description: z.string().min(1, { message: "La descripción es obligatoria*" }),
  objectives: z.string().optional(),
  startDate: z.coerce.date({ required_error: "La fecha de inicio es obligatoria*" }).nullable(),
  endDate: z.coerce.date({ required_error: "La fecha de finalización es obligatoria*" }).nullable(),
  status: z.enum([
    "Por Iniciar",
    "En Proceso",
    "Backlog",
    "Por Finalizar",
    "Finalizado",
    "Cancelado"
  ], {
    required_error: "Selecciona un estado*",
  }),
  priority: z.enum(["Baja", "Media", "Alta"], {
    required_error: "Selecciona una prioridad*"
  }),

  // Team Info
  LeadedBy: z.array(z.string()).min(1, { message: "Selecciona al menos un líder*" }),
  AssignedTo: z.array(z.string()).optional().default([]),
});

/**
 * Schema for creating a new task (POST /api/tasks)
 */
export const createTaskSchema = taskSchema.extend({
  // CreatedBy will be added from authenticated user, not from request body
});

/**
 * Schema for updating an existing task (PUT /api/tasks/[id])
 */
export const updateTaskSchema = taskSchema.partial().extend({
  // Allow partial updates
  id: z.string().optional(), // Will be from URL param
});

/**
 * Schema for partial task updates (PATCH /api/tasks/[id])
 */
export const patchTaskSchema = z.object({
  status: z.enum([
    "Por Iniciar",
    "En Proceso",
    "Backlog",
    "Por Finalizar",
    "Finalizado",
    "Cancelado"
  ]).optional(),
  priority: z.enum(["Baja", "Media", "Alta"]).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  objectives: z.string().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  LeadedBy: z.array(z.string()).optional(),
  AssignedTo: z.array(z.string()).optional(),
});

/**
 * Query parameters schema for GET /api/tasks
 */
export const taskQuerySchema = z.object({
  clientId: z.string().optional(),
  status: z.enum([
    "Por Iniciar",
    "En Proceso",
    "Backlog",
    "Por Finalizar",
    "Finalizado",
    "Cancelado"
  ]).optional(),
  priority: z.enum(["Baja", "Media", "Alta"]).optional(),
  userId: z.string().optional(), // Filter by assigned user
  limit: z.coerce.number().positive().max(100).optional().default(50),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

/**
 * Type exports
 */
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type PatchTaskInput = z.infer<typeof patchTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;

/**
 * Task status options
 */
export const TASK_STATUSES = [
  "Por Iniciar",
  "En Proceso",
  "Backlog",
  "Por Finalizar",
  "Finalizado",
  "Cancelado",
] as const;

/**
 * Task priority options
 */
export const TASK_PRIORITIES = ["Baja", "Media", "Alta"] as const;
