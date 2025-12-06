/**
 * Task search functionality
 */

import { db } from '@/lib/firebase-admin'
import type { TaskData, TaskSearchFilters, TaskSearchResult } from './types'
import { ACTIVE_TASK_STATUSES } from './types'

export async function searchTasks(
  userId: string,
  filters: TaskSearchFilters = {}
): Promise<TaskSearchResult> {
  try {
    // We need to search tasks where the user is involved:
    // - CreatedBy == userId
    // - userId in AssignedTo array
    // - userId in LeadedBy array
    //
    // Since Firestore doesn't support OR queries across different fields,
    // we execute multiple queries and merge results

    const tasksCollection = db.collection('tasks')

    // Query 1: Tasks created by user
    const createdByQuery = tasksCollection.where('CreatedBy', '==', userId).get()

    // Query 2: Tasks where user is assigned (array-contains)
    const assignedToQuery = tasksCollection.where('AssignedTo', 'array-contains', userId).get()

    // Query 3: Tasks where user is leader (array-contains)
    const leadedByQuery = tasksCollection.where('LeadedBy', 'array-contains', userId).get()

    // Execute all queries in parallel
    const [createdBySnapshot, assignedToSnapshot, leadedBySnapshot] = await Promise.all([
      createdByQuery,
      assignedToQuery,
      leadedByQuery
    ])

    // Merge results and deduplicate by task ID
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

    processSnapshot(createdBySnapshot)
    processSnapshot(assignedToSnapshot)
    processSnapshot(leadedBySnapshot)

    let tasks = Array.from(taskMap.values())

    // Apply filters in memory
    
    // Filter by name (partial, case-insensitive)
    if (filters.name) {
      const nameLower = filters.name.toLowerCase()
      tasks = tasks.filter(task => 
        task.name && task.name.toLowerCase().includes(nameLower)
      )
    }

    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status)
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
