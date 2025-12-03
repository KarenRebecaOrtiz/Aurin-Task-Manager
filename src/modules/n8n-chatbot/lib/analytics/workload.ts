/**
 * Team workload analytics
 */

import { db } from '@/lib/firebase-admin'

export interface UserWorkload {
  userId: string
  name: string
  email: string
  activeTasks: number
  tasks: Array<{
    id: string
    name: string
    priority: string
    status: string
  }>
}

export interface TeamWorkloadResult {
  success: boolean
  workload: UserWorkload[]
  totalActiveTasks: number
}

export async function getTeamWorkload(options: {
  teamId?: string
  includeArchived?: boolean
} = {}): Promise<TeamWorkloadResult> {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get()
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Get workload for each user
    const workload = await Promise.all(
      users.map(async (user) => {
        // Build query for user's assigned tasks
        let tasksQuery = db.collection('tasks')
          .where('AssignedTo', '==', user.id)

        // Filter by status if not including archived
        if (!options.includeArchived) {
          tasksQuery = tasksQuery.where('status', 'in', ['todo', 'in_progress'])
        }

        const tasksSnapshot = await tasksQuery.get()

        const tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          priority: doc.data().priority || 'Media',
          status: doc.data().status || 'todo'
        }))

        return {
          userId: user.id,
          name: user.name || 'Sin nombre',
          email: user.email || '',
          activeTasks: tasks.length,
          tasks
        }
      })
    )

    const totalActiveTasks = workload.reduce((sum, user) => sum + user.activeTasks, 0)

    return {
      success: true,
      workload,
      totalActiveTasks
    }
  } catch (error) {
    console.error('Error getting team workload:', error)
    throw new Error(`Error al obtener carga de trabajo: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
