/**
 * Team workload analytics
 * Active task statuses: 'En Proceso', 'Por Finalizar'
 */

import { db } from '@/lib/firebase-admin'

// Active task statuses that count towards workload
const ACTIVE_STATUSES = ['En Proceso', 'Por Finalizar']

interface UserData {
  displayName?: string
  email?: string
}

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
  includeAllStatuses?: boolean
} = {}): Promise<TeamWorkloadResult> {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get()
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data() as UserData
      return {
        id: doc.id,
        name: data.displayName,
        email: data.email
      }
    })

    // Get workload for each user
    const workload = await Promise.all(
      users.map(async (user) => {
        // Query tasks where user is assigned (using array-contains)
        const tasksQuery = db.collection('tasks')
          .where('AssignedTo', 'array-contains', user.id)

        const tasksSnapshot = await tasksQuery.get()

        // Filter in memory for active statuses
        let tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          priority: doc.data().priority || 'Media',
          status: doc.data().status || 'Por Iniciar'
        }))

        // Only count active tasks unless includeAllStatuses is true
        if (!options.includeAllStatuses) {
          tasks = tasks.filter(task => ACTIVE_STATUSES.includes(task.status))
        }

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
    throw new Error(`Error al obtener carga de trabajo: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
