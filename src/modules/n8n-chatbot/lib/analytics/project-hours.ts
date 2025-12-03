/**
 * Project hours analytics
 */

import { db } from '@/lib/firebase-admin'

export interface TimeLogEntry {
  id: string
  taskId: string
  taskName: string
  userId: string
  userName: string
  durationMinutes: number
  description: string
  date: string
}

export interface ProjectHoursResult {
  success: boolean
  projectName?: string
  clientId?: string
  totalMinutes: number
  totalHours: number
  timeLogs: TimeLogEntry[]
  taskBreakdown: Array<{
    taskId: string
    taskName: string
    totalMinutes: number
    totalHours: number
  }>
}

export async function getProjectHours(options: {
  projectName?: string
  clientId?: string
  startDate?: string
  endDate?: string
} = {}): Promise<ProjectHoursResult> {
  try {
    // Build query for tasks
    let tasksQuery = db.collection('tasks')

    if (options.projectName) {
      tasksQuery = tasksQuery.where('project', '==', options.projectName) as any
    }

    if (options.clientId) {
      tasksQuery = tasksQuery.where('clientId', '==', options.clientId) as any
    }

    const tasksSnapshot = await tasksQuery.get()
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || ''
    }))

    // Collect all time logs from task subcollections
    const allTimeLogs: TimeLogEntry[] = []

    for (const task of tasks) {
      const timeLogsSnapshot = await db
        .collection('tasks')
        .doc(task.id)
        .collection('time_logs')
        .get()

      for (const timeLogDoc of timeLogsSnapshot.docs) {
        const data = timeLogDoc.data()

        // Filter by date range if provided
        if (options.startDate || options.endDate) {
          const logDate = data.date || data.createdAt
          if (options.startDate && logDate < options.startDate) continue
          if (options.endDate && logDate > options.endDate) continue
        }

        allTimeLogs.push({
          id: timeLogDoc.id,
          taskId: task.id,
          taskName: task.name,
          userId: data.userId || '',
          userName: data.userName || '',
          durationMinutes: data.durationMinutes || 0,
          description: data.description || '',
          date: data.date || data.createdAt || ''
        })
      }
    }

    // Calculate totals
    const totalMinutes = allTimeLogs.reduce((sum, log) => sum + log.durationMinutes, 0)
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100

    // Calculate breakdown by task
    const taskBreakdownMap = new Map<string, { taskName: string; minutes: number }>()

    for (const log of allTimeLogs) {
      const existing = taskBreakdownMap.get(log.taskId)
      if (existing) {
        existing.minutes += log.durationMinutes
      } else {
        taskBreakdownMap.set(log.taskId, {
          taskName: log.taskName,
          minutes: log.durationMinutes
        })
      }
    }

    const taskBreakdown = Array.from(taskBreakdownMap.entries()).map(([taskId, data]) => ({
      taskId,
      taskName: data.taskName,
      totalMinutes: data.minutes,
      totalHours: Math.round((data.minutes / 60) * 100) / 100
    }))

    return {
      success: true,
      projectName: options.projectName,
      clientId: options.clientId,
      totalMinutes,
      totalHours,
      timeLogs: allTimeLogs,
      taskBreakdown
    }
  } catch (error) {
    console.error('Error getting project hours:', error)
    throw new Error(`Error al obtener horas del proyecto: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
