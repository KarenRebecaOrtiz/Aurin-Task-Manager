/**
 * Task search functionality
 */

import { db } from '@/lib/firebase-admin'
import type { TaskData, TaskSearchFilters, TaskSearchResult } from './types'
import { ACTIVE_TASK_STATUSES } from './types'

export async function searchTasks(
  userId: string,
  filters: TaskSearchFilters = {},
  isAdmin: boolean = false
): Promise<TaskSearchResult> {
  try {
    const tasksCollection = db.collection('tasks')
    const taskMap = new Map<string, TaskData & { id: string }>()

    const processSnapshot = (snapshot: FirebaseFirestore.QuerySnapshot) => {
      snapshot.docs.forEach(doc => {
        if (!taskMap.has(doc.id)) {
          const data = doc.data()
          taskMap.set(doc.id, {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamps to ISO strings for JSON serialization
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
            endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
          } as TaskData & { id: string })
        }
      })
    }

    if (filters.allTasks && isAdmin) {
      // Admin global query — no user scope, fetch all tasks
      const allSnapshot = await tasksCollection.get()
      processSnapshot(allSnapshot)
    } else {
      // Standard user-scoped queries:
      // Tasks where the user is involved (creator, assigned, or leader)
      const [createdBySnapshot, assignedToSnapshot, leadedBySnapshot] = await Promise.all([
        tasksCollection.where('CreatedBy', '==', userId).get(),
        tasksCollection.where('AssignedTo', 'array-contains', userId).get(),
        tasksCollection.where('LeadedBy', 'array-contains', userId).get()
      ])

      processSnapshot(createdBySnapshot)
      processSnapshot(assignedToSnapshot)
      processSnapshot(leadedBySnapshot)
    }

    let tasks = Array.from(taskMap.values())

    // --- Apply filters in memory ---

    // Text search in name only (backward compatible)
    if (filters.name) {
      const nameLower = filters.name.toLowerCase()
      tasks = tasks.filter(task =>
        task.name && task.name.toLowerCase().includes(nameLower)
      )
    }

    // Text search in name AND description
    if (filters.searchText) {
      const textLower = filters.searchText.toLowerCase()
      tasks = tasks.filter(task => {
        const nameMatch = task.name && task.name.toLowerCase().includes(textLower)
        const descMatch = task.description && task.description.toLowerCase().includes(textLower)
        return nameMatch || descMatch
      })
    }

    // Single status filter
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status)
    }

    // Multi-status filter
    if (filters.statusIn && filters.statusIn.length > 0) {
      tasks = tasks.filter(task => filters.statusIn!.includes(task.status))
    }

    // Filter only active tasks if requested (for workload calculations)
    if (filters.onlyActive) {
      tasks = tasks.filter(task => ACTIVE_TASK_STATUSES.includes(task.status))
    }

    if (filters.priority) {
      tasks = tasks.filter(task => task.priority === filters.priority)
    }

    if (filters.clientId) {
      tasks = tasks.filter(task => task.clientId === filters.clientId)
    }

    if (filters.assignedToUserId) {
      tasks = tasks.filter(task =>
        task.AssignedTo && Array.isArray(task.AssignedTo) &&
        task.AssignedTo.includes(filters.assignedToUserId!)
      )
    }

    if (filters.leadedByUserId) {
      tasks = tasks.filter(task =>
        task.LeadedBy && Array.isArray(task.LeadedBy) &&
        task.LeadedBy.includes(filters.leadedByUserId!)
      )
    }

    if (filters.project) {
      tasks = tasks.filter(task => task.project === filters.project)
    }

    // Date range filters (compare ISO strings)
    if (filters.createdAfter) {
      const after = new Date(filters.createdAfter).getTime()
      tasks = tasks.filter(task => {
        const created = typeof task.createdAt === 'string' ? new Date(task.createdAt).getTime() : 0
        return created >= after
      })
    }

    if (filters.createdBefore) {
      const before = new Date(filters.createdBefore).getTime()
      tasks = tasks.filter(task => {
        const created = typeof task.createdAt === 'string' ? new Date(task.createdAt).getTime() : 0
        return created <= before
      })
    }

    if (filters.dueBefore) {
      const due = new Date(filters.dueBefore).getTime()
      tasks = tasks.filter(task => {
        if (!task.endDate) return false
        const end = typeof task.endDate === 'string' ? new Date(task.endDate).getTime() : 0
        return end <= due
      })
    }

    // Sort in memory (always, to avoid index requirements)
    const orderByField = filters.orderBy || 'createdAt'
    const orderDirection = filters.orderDirection || 'desc'

    tasks.sort((a, b) => {
      const aVal = a[orderByField as keyof typeof a]
      const bVal = b[orderByField as keyof typeof b]

      if (aVal === undefined || bVal === undefined) return 0

      if (orderDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    // Apply limit if specified (after sorting)
    if (filters.limit && filters.limit > 0) {
      tasks = tasks.slice(0, filters.limit)
    }

    return {
      success: true,
      tasks,
      totalFound: tasks.length
    }
  } catch (error) {
    throw new Error(`Error al buscar tareas: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
