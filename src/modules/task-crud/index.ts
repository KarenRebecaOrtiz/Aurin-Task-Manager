/**
 * Task CRUD Module
 * Centralized exports for task creation, editing, and management
 */

// Types
export * from './types/domain';
export {
  baseFormSchema,
  createFormSchema,
  defaultFormValues,
  FORM_PERSISTENCE_KEYS,
  STEP_FIELDS,
  type FormValues,
  type TaskFormProps,
  type CreateTaskProps,
  type EditTaskProps,
} from './types/form';

// Config
export * from './config';

// Utils
export * from './utils/helpers';
export * from './utils/animations';
export * from './utils/validation';

// Services
export { taskService, default as TaskService } from './services/taskService';

// Hooks
export * from './hooks/form';
export * from './hooks/ui';
export * from './hooks/data';

// Components - Selectors
export * from './components/molecules/selectors';

// Components - UI
export { Calendar } from './components/ui/Calendar';
export { DatePicker, DateRangePicker } from '@/modules/task-crud/components/DatePicker';

// Main Components
export { default as CreateTask } from './components/CreateTask';
export { default as EditTask } from './components/EditTask';
