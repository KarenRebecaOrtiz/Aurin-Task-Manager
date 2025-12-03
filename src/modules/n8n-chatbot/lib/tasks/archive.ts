/**
 * Task archive functionality
 */

import { db } from '@/lib/firebase-admin'
import type { TaskArchiveResult } from './types'

export async function archiveTask(
  userId: string,
  taskId: string
): Promise<TaskArchiveResult> {
  try {
    // Validate taskId
    if (!taskId) {
      throw new Error('taskId es requerido')
    }

    // Get task to verify ownership
    const taskRef = db.collection('tasks').doc(taskId)
    const taskDoc = await taskRef.get()

    if (!taskDoc.exists) {
      throw new Error('Tarea no encontrada')
    }

    const taskData = taskDoc.data()

    // Verify user owns the task
    if (taskData?.CreatedBy !== userId) {
      throw new Error('No tienes permiso para archivar esta tarea')
    }

    // Archive task (change status to 'archived')
    await taskRef.update({
      status: 'archived',
      updatedAt: new Date().toISOString()
    })

    return {
      success: true,
      message: 'Tarea archivada correctamente',
      taskId
    }
  } catch (error) {
    console.error('Error archiving task:', error)
    throw new Error(`Error al archivar tarea: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
