/**
 * Domain Types for Task CRUD
 * Shared types for task entities and business logic
 */

import { Timestamp } from 'firebase/firestore';
export type { Client } from '@/types';

// Task Status enum
export const TASK_STATUSES = [
  'Por Iniciar',
  'En Proceso',
  'Backlog',
  'Por Finalizar',
  'Finalizado',
  'Cancelado',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

// Task Priority enum
export const TASK_PRIORITIES = ['Baja', 'Media', 'Alta'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// Task interface (Firestore document)
export interface Task {
  id: string;
  // Client info
  clientId: string;
  project: string;
  // Basic info
  name: string;
  description: string;
  objectives?: string;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  status: TaskStatus;
  priority: TaskPriority;
  // Team info
  LeadedBy: string[];
  AssignedTo: string[];
  CreatedBy: string;
  createdAt: Timestamp;
}

// User interface (from dataStore)
export interface User {
  id: string;
  fullName: string;
  imageUrl: string;
  role: string;
  email?: string;
}

// Task with dates as Date objects (for forms)
export interface TaskWithDates extends Omit<Task, 'startDate' | 'endDate' | 'createdAt'> {
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}
