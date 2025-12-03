/**
 * Task creation functionality
 */

import { db } from '@/lib/firebase-admin'
import type { TaskData, TaskCreateResult } from './types'

export async function createTask(
  userId: string,
  taskData: Omit<TaskData, 'CreatedBy' | 'createdAt'>
): Promise<TaskCreateResult> {
  try {
    // Validate required fields
    if (!taskData.name || !taskData.project || !taskData.clientId) {
      throw new Error('Faltan campos requeridos: name, project, clientId')
    }

    // Prepare task document
    const newTask: TaskData = {
      ...taskData,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'Media',
      CreatedBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create task in Firestore
    const docRef = await db.collection('tasks').add(newTask)

    return {
      success: true,
      message: 'Tarea creada correctamente',
      taskId: docRef.id,
      taskName: newTask.name
    }
  } catch (error) {
    console.error('Error creating task:', error)
    throw new Error(`Error al crear tarea: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
