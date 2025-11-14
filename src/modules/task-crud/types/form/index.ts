/**
 * Form Types for Task CRUD
 * Types for form state, validation, and submission
 */

import { z } from 'zod';

// Form validation schema (base - without conditional validation)
export const baseFormSchema = z.object({
  clientInfo: z.object({
    clientId: z.string().min(1, { message: 'Selecciona una cuenta*' }),
    project: z.string().min(1, { message: 'Selecciona una carpeta*' }),
  }),
  basicInfo: z.object({
    name: z.string().min(1, { message: 'El nombre es obligatorio*' }),
    description: z.string().min(1, { message: 'La descripción es obligatoria*' }),
    objectives: z.string().optional(),
    startDate: z.date({ required_error: 'La fecha de inicio es obligatoria*' }).nullable(),
    endDate: z.date({ required_error: 'La fecha de finalización es obligatoria*' }).nullable(),
    status: z.enum(['Por Iniciar', 'En Proceso', 'Backlog', 'Por Finalizar', 'Finalizado', 'Cancelado'], {
      required_error: 'Selecciona un estado*',
    }),
    priority: z.enum(['Baja', 'Media', 'Alta'], { required_error: 'Selecciona una prioridad*' }),
  }),
  teamInfo: z.object({
    LeadedBy: z.array(z.string()).min(1, { message: 'Selecciona al menos un líder*' }),
    AssignedTo: z.array(z.string()).optional(),
  }),
});

// Function to create schema with conditional validation
export const createFormSchema = (includeMembers: boolean) => {
  return baseFormSchema.refine(
    (data) => {
      if (includeMembers) {
        return data.teamInfo.AssignedTo && data.teamInfo.AssignedTo.length > 0;
      }
      return true;
    },
    {
      message: 'Debes seleccionar al menos un colaborador',
      path: ['teamInfo', 'AssignedTo'],
    }
  );
};

// Type inference from schema
export type FormValues = z.infer<typeof baseFormSchema>;

// Default form values
export const defaultFormValues: FormValues = {
  clientInfo: {
    clientId: '',
    project: '',
  },
  basicInfo: {
    name: '',
    description: '',
    objectives: '',
    startDate: null,
    endDate: null,
    status: 'Por Iniciar',
    priority: 'Baja',
  },
  teamInfo: {
    LeadedBy: [],
    AssignedTo: [],
  },
};

// Wizard step fields configuration
export const STEP_FIELDS: (keyof FormValues | string)[][] = [
  ['clientInfo.clientId', 'clientInfo.project'],
  [
    'basicInfo.name',
    'basicInfo.description',
    'basicInfo.objectives',
    'basicInfo.startDate',
    'basicInfo.endDate',
    'basicInfo.status',
    'basicInfo.priority',
  ],
  ['teamInfo.LeadedBy', 'teamInfo.AssignedTo'],
];

// Form persistence keys
export const FORM_PERSISTENCE_KEYS = {
  CREATE: 'create-task-wizard',
  EDIT: (taskId: string) => `edit-task-wizard-${taskId}`,
};

// Props interfaces for components
export interface TaskFormProps {
  isOpen: boolean;
  onToggle: () => void;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
  onCreateClientOpen: () => void;
  onEditClientOpen: (client: any) => void;
  onClientAlertChange?: (alert: { type: 'success' | 'fail'; message?: string; error?: string } | null) => void;
  onShowSuccessAlert?: (message: string) => void;
  onShowFailAlert?: (message: string, error?: string) => void;
}

export interface CreateTaskProps extends TaskFormProps {
  onTaskCreated?: () => void;
}

export interface EditTaskProps extends TaskFormProps {
  taskId: string;
}
