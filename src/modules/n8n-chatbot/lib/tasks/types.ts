/**
 * Type definitions for task operations
 * Based on aurin-firestore-schemas.json
 */

/**
 * Task status values
 * Active statuses (count for workload): 'En Proceso', 'Por Finalizar'
 * Inactive statuses: 'Por Iniciar', 'Backlog', 'Finalizado', 'Cancelado'
 */
export type TaskStatus = 'Por Iniciar' | 'En Proceso' | 'Backlog' | 'Por Finalizar' | 'Finalizado' | 'Cancelado'

export const ACTIVE_TASK_STATUSES: TaskStatus[] = ['En Proceso', 'Por Finalizar']
export const INACTIVE_TASK_STATUSES: TaskStatus[] = ['Por Iniciar', 'Backlog', 'Finalizado', 'Cancelado']

export interface TaskData {
  name: string
  description?: string
  status: TaskStatus
  priority?: 'Alta' | 'Media' | 'Baja'
  clientId?: string
  project?: string
  startDate?: string | FirebaseFirestore.Timestamp
  endDate?: string | FirebaseFirestore.Timestamp
  AssignedTo?: string[] // Array of user IDs
  LeadedBy?: string[] // Array of user IDs
  CreatedBy: string
  createdAt: string | FirebaseFirestore.Timestamp
  updatedAt: string | FirebaseFirestore.Timestamp
  lastViewedBy?: Record<string, string | FirebaseFirestore.Timestamp>
  unreadCountByUser?: Record<string, number>
  hasUnreadUpdates?: boolean
}

export interface TaskSearchFilters {
  name?: string // Search by task name (partial, case-insensitive)
  status?: TaskStatus
  priority?: 'Alta' | 'Media' | 'Baja'
  onlyActive?: boolean // Filter only active tasks (En Proceso, Por Finalizar)
  clientId?: string
  assignedToUserId?: string // To search if a user is in AssignedTo array
  leadedByUserId?: string // To search if a user is in LeadedBy array
  project?: string
  limit?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'name'
  orderDirection?: 'asc' | 'desc'
}

export interface TaskSearchResult {
  success: boolean
  tasks: Array<TaskData & { id: string }>
  totalFound: number
}

export interface TaskCreateResult {
  success: boolean
  message: string
  taskId: string
  taskName: string
}

export interface TaskUpdateResult {
  success: boolean
  message: string
  taskId: string
}

export interface TaskArchiveResult {
  success: boolean
  message: string
  taskId: string
}
