/**
 * Task search functionality
 */

import { db } from '@/lib/firebase-admin'
import type { TaskSearchFilters, TaskSearchResult } from './types'

export async function searchTasks(
  userId: string,
  filters: TaskSearchFilters = {}
): Promise<TaskSearchResult> {
  try {
    // Start with base query - get all tasks created by the user
    let query: FirebaseFirestore.Query = db.collection('tasks')
      .where('CreatedBy', '==', userId)

    // Execute query (we'll filter and sort in memory to avoid index requirements)
    const snapshot = await query.get()

    // Transform results with proper timestamp handling
    let tasks = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings for JSON serialization
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
      }
    }) as Array<TaskData & { id: string }>

    // Apply filters in memory
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status)
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
    console.error('Error searching tasks:', error)
    throw new Error(`Error al buscar tareas: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
