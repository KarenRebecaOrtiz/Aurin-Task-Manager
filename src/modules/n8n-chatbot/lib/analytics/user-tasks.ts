/**
 * User-specific task analytics
 */

import { db } from '@/lib/firebase-admin'
import type { TaskSearchResult } from '../tasks/types'

export async function getUserTasks(
  targetUserId: string,
  options: {
    status?: 'todo' | 'in_progress' | 'done' | 'archived'
  } = {}
): Promise<TaskSearchResult> {
  try {
    // Get tasks assigned to the specified user
    let query = db.collection('tasks')
      .where('AssignedTo', '==', targetUserId)

    if (options.status) {
      query = query.where('status', '==', options.status)
    }

    const snapshot = await query.get()

    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<any>

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
