// Task-specific hooks
export { useTasksCommon } from '../tasks/hooks/useTasksCommon';
export { useTaskArchiving } from '../tasks/hooks/useTaskArchiving';

// Advanced search hooks
export { useAdvancedSearch, useTaskFiltering } from './useAdvancedSearch';
export type { SearchableTask, SearchableClient, SearchableUser } from './useAdvancedSearch';

// Shared table hooks
export * from './table';
