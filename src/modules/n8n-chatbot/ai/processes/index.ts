/**
 * Structured Processes - Main Entry Point
 *
 * Este módulo implementa procesos estructurados que reducen
 * la dependencia del LLM para flujos comunes, ahorrando tokens
 * y proporcionando respuestas más consistentes.
 *
 * @example
 * ```typescript
 * import { processMessage, initializeProcesses } from './processes'
 *
 * // Inicializar al arrancar la app
 * initializeProcesses()
 *
 * // Procesar mensaje del usuario
 * const result = await processMessage({
 *   message: 'Crear tarea de revisión para aurin',
 *   userId: 'user123',
 *   sessionId: 'session456',
 *   isAdmin: false
 * })
 *
 * if (result) {
 *   // Proceso manejó el mensaje
 *   console.log(result.response)
 * } else {
 *   // Delegar al LLM tradicional
 * }
 * ```
 */

// Types
export * from './types'

// Core components
export { IntentDetector, intentDetector } from './intent-detector'
export {
  ProcessExecutor,
  createExecutor,
  registerProcess,
  getProcess,
  getAllProcesses,
  getContext,
  clearContext
} from './executor'

// Process definitions
import { taskCreationProcess } from './definitions/task-creation'
import { taskQueryProcess, workloadQueryProcess } from './definitions/task-query'
import { taskUpdateProcess, taskArchiveProcess } from './definitions/task-update'

import { registerProcess } from './executor'
import type { ProcessResult } from './types'
import { createExecutor } from './executor'

/**
 * Lista de todos los procesos disponibles
 */
export const allProcesses = [
  taskCreationProcess,
  taskQueryProcess,
  workloadQueryProcess,
  taskUpdateProcess,
  taskArchiveProcess
]

/**
 * Inicializa todos los procesos registrándolos en el executor
 */
export function initializeProcesses(): void {
  for (const process of allProcesses) {
    registerProcess(process)
  }
  console.log(`[Processes] ${allProcesses.length} procesos registrados:`)
  allProcesses.forEach(p => console.log(`  - ${p.id}: ${p.name}`))
}

/**
 * Procesa un mensaje del usuario usando procesos estructurados
 *
 * @returns ProcessResult si un proceso manejó el mensaje, null si debe delegarse al LLM
 */
export async function processMessage(options: {
  message: string
  userId: string
  sessionId: string
  isAdmin?: boolean
  userName?: string
}): Promise<ProcessResult | null> {
  const executor = createExecutor({
    userId: options.userId,
    sessionId: options.sessionId,
    isAdmin: options.isAdmin,
    userName: options.userName
  })

  return await executor.processMessage(options.message)
}

/**
 * Obtiene estadísticas de procesos
 */
export function getProcessStats(): {
  totalProcesses: number
  processIds: string[]
  byTag: Record<string, number>
} {
  const processes = allProcesses
  const byTag: Record<string, number> = {}

  for (const process of processes) {
    const tags = process.metadata?.tags || []
    for (const tag of tags) {
      byTag[tag] = (byTag[tag] || 0) + 1
    }
  }

  return {
    totalProcesses: processes.length,
    processIds: processes.map(p => p.id),
    byTag
  }
}

// Re-export individual processes for testing
export {
  taskCreationProcess,
  taskQueryProcess,
  workloadQueryProcess,
  taskUpdateProcess,
  taskArchiveProcess
}
