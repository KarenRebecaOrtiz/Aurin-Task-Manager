/**
 * Task update functionality
 */

import { db } from '@/lib/firebase-admin'
import type { TaskUpdateResult } from './types'

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Record<string, any>
): Promise<TaskUpdateResult> {
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

    // Verify user owns the task or is assigned to it
    if (taskData?.CreatedBy !== userId && taskData?.AssignedTo !== userId) {
      throw new Error('No tienes permiso para modificar esta tarea')
    }

    // Prepare updates with timestamp
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    // Don't allow changing CreatedBy or createdAt
    delete updateData.CreatedBy
    delete updateData.createdAt

    // Update task
    await taskRef.update(updateData)

    return {
      success: true,
      message: 'Tarea actualizada correctamente',
      taskId
    }
  } catch (error) {
    console.error('Error updating task:', error)
    throw new Error(`Error al actualizar tarea: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
