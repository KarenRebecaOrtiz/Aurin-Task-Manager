/**
 * User-specific task analytics
 */

import { db } from '@/lib/firebase-admin'
import type { TaskStatus, TaskSearchResult } from '../tasks/types'

export async function getUserTasks(
  targetUserId: string,
  options: {
    status?: TaskStatus
  } = {}
): Promise<TaskSearchResult> {
  try {
    // Get tasks assigned to the specified user (array-contains for array fields)
    const snapshot = await db.collection('tasks')
      .where('AssignedTo', 'array-contains', targetUserId)
      .get()

    let tasks = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
      }
    }) as Array<any>

    // Filter by status in memory (avoids Firestore composite index requirement)
    if (options.status) {
      tasks = tasks.filter(task => task.status === options.status)
    }

    return {
      success: true,
      tasks,
      totalFound: tasks.length
    }
  } catch (error) {
    console.error('Error getting user tasks:', error)
    throw new Error(`Error al obtener tareas del usuario: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
