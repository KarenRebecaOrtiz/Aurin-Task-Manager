/**
 * Task update functionality
 */

import { db } from '@/lib/firebase-admin'
import type { TaskUpdateResult } from './types'

interface TaskUpdateData {
  updatedAt: string
  CreatedBy?: string
  createdAt?: string
  [key: string]: unknown
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Record<string, unknown>,
  isAdmin: boolean = false
): Promise<TaskUpdateResult> {
  try {
    // Validate taskId
    if (!taskId) {
      throw new Error('taskId es requerido')
    }

    // Get task to verify permissions
    const taskRef = db.collection('tasks').doc(taskId)
    const taskDoc = await taskRef.get()

    if (!taskDoc.exists) {
      throw new Error('Tarea no encontrada')
    }

    const taskData = taskDoc.data()

    // Verify user has permission to update:
    // - Is admin
    // - Is the creator
    // - Is in AssignedTo array
    // - Is in LeadedBy array
    const isCreator = taskData?.CreatedBy === userId
    const isAssigned = Array.isArray(taskData?.AssignedTo) && taskData.AssignedTo.includes(userId)
    const isLeader = Array.isArray(taskData?.LeadedBy) && taskData.LeadedBy.includes(userId)

    if (!isAdmin && !isCreator && !isAssigned && !isLeader) {
      throw new Error('No tienes permiso para modificar esta tarea')
    }

    // Prepare updates with timestamp
    const updateData: TaskUpdateData = {
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
    throw new Error(`Error al actualizar tarea: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
