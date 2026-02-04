/**
 * Sorting Constants
 * Centralized sorting configurations for tables
 */

/**
 * Sort direction types
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Available sort keys for tasks
 */
export type TaskSortKey =
  | 'name'
  | 'status'
  | 'priority'
  | 'clientId'
  | 'assignedTo'
  | 'createdAt'
  | 'lastActivity'
  | 'startDate'
  | 'endDate'
  | 'notificationDot'
  | '';

/**
 * Default sort configuration
 */
export const DEFAULT_SORT_KEY: TaskSortKey = 'lastActivity';
export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';
