
import { z } from 'zod';
import { addDays } from 'date-fns';

export const simplifiedTaskSchema = z.object({
  clientId: z.string().min(1, "Selecciona una cuenta"),
  project: z.string().min(1, "Selecciona una carpeta"),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  startDate: z.date().default(new Date()),
  endDate: z.date().default(() => addDays(new Date(), 7)),
  LeadedBy: z.array(z.string()).min(1, "Selecciona al menos un líder"),
  AssignedTo: z.array(z.string()).default([]),
  priority: z.enum(["Baja", "Media", "Alta"]).default("Media"),
});

export const createTaskSchema = z.object({
  clientId: z.string().min(1, "Selecciona una cuenta"),
  project: z.string().min(1, "Selecciona una carpeta"),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  startDate: z.date(),
  endDate: z.date(),
  LeadedBy: z.array(z.string()).min(1, "Selecciona al menos un líder"),
  AssignedTo: z.array(z.string()).default([]),
});
