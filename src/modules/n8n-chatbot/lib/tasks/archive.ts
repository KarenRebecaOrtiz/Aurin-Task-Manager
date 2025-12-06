/**
 * Task archive functionality
 * Only admins can archive tasks
 */

import { db } from '@/lib/firebase-admin'
import type { TaskArchiveResult } from './types'

export async function archiveTask(
  userId: string,
  taskId: string,
  isAdmin: boolean = false
): Promise<TaskArchiveResult> {
  try {
    // Validate taskId
    if (!taskId) {
      throw new Error('taskId es requerido')
    }

    // Only admins can archive tasks
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden archivar tareas. Si deseas cancelar la tarea, puedes cambiar su estado a "Cancelado".')
    }

    // Get task to verify it exists
    const taskRef = db.collection('tasks').doc(taskId)
    const taskDoc = await taskRef.get()

    if (!taskDoc.exists) {
      throw new Error('Tarea no encontrada')
    }

    // Archive task (change status to 'Cancelado')
    await taskRef.update({
      status: 'Cancelado',
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
