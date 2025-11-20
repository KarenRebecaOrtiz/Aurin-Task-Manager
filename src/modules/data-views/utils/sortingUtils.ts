/**
 * Sorting Utilities
 * Shared utility functions for sorting tasks in tables and boards
 */

import { STATUS_ORDER } from '../constants/statusConstants';
import { PRIORITY_ORDER } from '../constants/priorityConstants';
import { SortDirection, TaskSortKey } from '../constants/sortingConstants';
import { normalizeStatus } from './statusUtils';
import { Task } from '@/types';

/**
 * Generic task interface for sorting
 */
interface SortableTask extends Task {
  [key: string]: any;
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  fullName: string;
}

/**
 * Gets the last activity timestamp for a task
 * Compares createdAt and lastActivity to find the most recent
 */
export const getLastActivityTimestamp = (task: SortableTask): number => {
  const createdAt = new Date(task.createdAt).getTime();
  const lastActivity = task.lastActivity ? new Date(task.lastActivity).getTime() : 0;
  return Math.max(createdAt, lastActivity);
};

/**
 * Sorts tasks by status according to predefined status order
 */
export const sortByStatus = (
  tasks: SortableTask[],
  direction: SortDirection = 'asc'
): SortableTask[] => {
  return [...tasks].sort((a, b) => {
    const indexA = STATUS_ORDER.indexOf(normalizeStatus(a.status));
    const indexB = STATUS_ORDER.indexOf(normalizeStatus(b.status));
    const validIndexA = indexA === -1 ? STATUS_ORDER.length : indexA;
    const validIndexB = indexB === -1 ? STATUS_ORDER.length : indexB;
    return direction === 'asc' ? validIndexA - validIndexB : validIndexB - validIndexA;
  });
};

/**
 * Sorts tasks by priority according to predefined priority order
 */
export const sortByPriority = (
  tasks: SortableTask[],
  direction: SortDirection = 'asc'
): SortableTask[] => {
  return [...tasks].sort((a, b) => {
    const indexA = PRIORITY_ORDER.indexOf(a.priority);
    const indexB = PRIORITY_ORDER.indexOf(b.priority);
    const validIndexA = indexA === -1 ? PRIORITY_ORDER.length : indexA;
    const validIndexB = indexB === -1 ? PRIORITY_ORDER.length : indexB;
    return direction === 'asc' ? validIndexA - validIndexB : validIndexB - validIndexA;
  });
};

/**
 * Sorts tasks by client name
 */
export const sortByClient = (
  tasks: SortableTask[],
  clients: Client[],
  direction: SortDirection = 'asc'
): SortableTask[] => {
  return [...tasks].sort((a, b) => {
    const clientA = clients.find((c) => c.id === a.clientId)?.name || '';
    const clientB = clients.find((c) => c.id === b.clientId)?.name || '';
    return direction === 'asc'
      ? clientA.localeCompare(clientB)
      : clientB.localeCompare(clientA);
  });
};

/**
 * Sorts tasks by assigned users
 * First by count, then alphabetically by first assigned user name
 */
export const sortByAssignedTo = (
  tasks: SortableTask[],
  users: User[],
  direction: SortDirection = 'asc'
): SortableTask[] => {
  return [...tasks].sort((a, b) => {
    const assignedCountA = (a.AssignedTo?.length || 0) + (a.LeadedBy?.length || 0);
    const assignedCountB = (b.AssignedTo?.length || 0) + (b.LeadedBy?.length || 0);

    if (assignedCountA !== assignedCountB) {
      return direction === 'asc' ? assignedCountA - assignedCountB : assignedCountB - assignedCountA;
    }

    // In case of tie, sort by first assigned user name
    const firstAssignedA = users.find(u => a.AssignedTo?.[0] === u.id || a.LeadedBy?.[0] === u.id)?.fullName || '';
    const firstAssignedB = users.find(u => b.AssignedTo?.[0] === u.id || b.LeadedBy?.[0] === u.id)?.fullName || '';

    return direction === 'asc'
      ? firstAssignedA.localeCompare(firstAssignedB)
      : firstAssignedB.localeCompare(firstAssignedA);
  });
};

/**
 * Sorts tasks by date field
 */
export const sortByDate = (
  tasks: SortableTask[],
  dateField: 'createdAt' | 'lastActivity' | 'startDate' | 'endDate',
  direction: SortDirection = 'asc'
): SortableTask[] => {
  return [...tasks].sort((a, b) => {
    let dateA: number;
    let dateB: number;

    if (dateField === 'lastActivity') {
      dateA = getLastActivityTimestamp(a);
      dateB = getLastActivityTimestamp(b);
    } else {
      dateA = a[dateField] ? new Date(a[dateField]).getTime() : 0;
      dateB = b[dateField] ? new Date(b[dateField]).getTime() : 0;
    }

    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Sorts tasks by name alphabetically
 */
export const sortByName = (
  tasks: SortableTask[],
  direction: SortDirection = 'asc'
): SortableTask[] => {
  return [...tasks].sort((a, b) =>
    direction === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
  );
};

/**
 * Generic sort function that applies the appropriate sorting based on sort key
 */
export const sortTasks = <T extends SortableTask>(
  tasks: T[],
  sortKey: TaskSortKey,
  sortDirection: SortDirection,
  clients: Client[] = [],
  users: User[] = []
): T[] => {
  if (!sortKey) {
    // Default sort by createdAt descending
    return sortByDate(tasks, 'createdAt', 'desc') as T[];
  }

  switch (sortKey) {
    case 'status':
      return sortByStatus(tasks, sortDirection) as T[];

    case 'priority':
      return sortByPriority(tasks, sortDirection) as T[];

    case 'clientId':
      return sortByClient(tasks, clients, sortDirection) as T[];

    case 'assignedTo':
      return sortByAssignedTo(tasks, users, sortDirection) as T[];

    case 'lastActivity':
      return sortByDate(tasks, 'lastActivity', sortDirection) as T[];

    case 'createdAt':
      return sortByDate(tasks, 'createdAt', sortDirection) as T[];

    case 'startDate':
      return sortByDate(tasks, 'startDate', sortDirection) as T[];

    case 'endDate':
      return sortByDate(tasks, 'endDate', sortDirection) as T[];

    case 'name':
      return sortByName(tasks, sortDirection) as T[];

    case 'notificationDot':
      // Notification system removed - using NodeMailer instead
      // Return unsorted for this case
      return [...tasks];

    default:
      // Generic sort for other fields
      return [...tasks].sort((a, b) =>
        sortDirection === 'asc'
          ? String(a[sortKey as keyof T]).localeCompare(String(b[sortKey as keyof T]))
          : String(b[sortKey as keyof T]).localeCompare(String(a[sortKey as keyof T]))
      );
  }
};
