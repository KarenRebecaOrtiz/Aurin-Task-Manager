/**
 * Task creation functionality
 * Optimized for chatbot use with smart defaults
 */

import { db } from '@/lib/firebase-admin'
import type { TaskData, TaskCreateResult } from './types'

// Default project for chatbot-created tasks
const CHATBOT_DEFAULT_PROJECT = 'chatbotTasks'

export async function createTask(
  userId: string,
  taskData: Omit<TaskData, 'CreatedBy' | 'createdAt'>
): Promise<TaskCreateResult> {
  try {
    // For chatbot: only name and clientId are truly required
    // project defaults to 'chatbotTasks'
    if (!taskData.name) {
      throw new Error('El nombre de la tarea es requerido')
    }

    if (!taskData.clientId) {
      throw new Error('El cliente es requerido. Usa search_clients para encontrarlo o create_client para crear uno nuevo.')
    }

    // Smart defaults for chatbot-created tasks
    const project = taskData.project || CHATBOT_DEFAULT_PROJECT

    // Prepare task document with smart defaults
    const newTask: TaskData = {
      ...taskData,
      project,
      // Default status: "En Proceso" (active from the start)
      status: taskData.status || 'En Proceso',
      // Default priority: "Media"
      priority: taskData.priority || 'Media',
      // Leader defaults to creator if not specified
      LeadedBy: taskData.LeadedBy?.length ? taskData.LeadedBy : [userId],
      // AssignedTo can be empty
      AssignedTo: taskData.AssignedTo || [],
      CreatedBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create task in Firestore
    const docRef = await db.collection('tasks').add(newTask)

    return {
      success: true,
      message: `Tarea "${newTask.name}" creada correctamente en proyecto "${project}"`,
      taskId: docRef.id,
      taskName: newTask.name
    }
  } catch (error) {
    console.error('Error creating task:', error)
    throw new Error(`Error al crear tarea: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
