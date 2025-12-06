/**
 * Proceso: Consulta de Tareas
 *
 * Flujo estructurado para consultar tareas del usuario.
 * Soporta múltiples tipos de consulta:
 * - Todas las tareas
 * - Tareas activas (carga de trabajo)
 * - Tareas por estado específico
 * - Tareas por prioridad
 */

import type { ProcessDefinition, ProcessContext } from '../types'

/**
 * Formatea una lista de tareas para mostrar al usuario
 */
function formatTaskList(tasks: unknown[], context: ProcessContext): string {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return 'No encontré tareas con esos criterios.'
  }

  const statusFilter = context.slots.statusFilter as string | undefined
  const onlyActive = context.slots.onlyActive as boolean | undefined

  let header = ''
  if (onlyActive) {
    header = `Encontré ${tasks.length} tarea(s) activa(s):`
  } else if (statusFilter) {
    header = `Encontré ${tasks.length} tarea(s) con estado "${statusFilter}":`
  } else {
    header = `Encontré ${tasks.length} tarea(s):`
  }

  const taskLines = tasks.slice(0, 10).map((task: unknown, index: number) => {
    const t = task as {
      name?: string
      status?: string
      priority?: string
      clientName?: string
      project?: string
    }
    const priority = t.priority === 'Alta' ? '🔴' : t.priority === 'Media' ? '🟡' : '🟢'
    const client = t.clientName ? ` | ${t.clientName}` : ''
    return `${index + 1}. ${priority} **${t.name || 'Sin nombre'}** - ${t.status || 'Sin estado'}${client}`
  })

  let result = `${header}\n\n${taskLines.join('\n')}`

  if (tasks.length > 10) {
    result += `\n\n_...y ${tasks.length - 10} tarea(s) más._`
  }

  return result
}

export const taskQueryProcess: ProcessDefinition = {
  id: 'task-query',
  name: 'Consulta de Tareas',
  description: 'Proceso para consultar y listar tareas del usuario',
  version: '1.0.0',

  triggers: [
    {
      type: 'intent',
      intents: ['TASK_QUERY'],
      priority: 100
    },
    {
      type: 'pattern',
      patterns: [
        /^(?:mis\s+)?tareas$/i,
        /^(?:mostrar?|ver|listar?)\s+(?:mis\s+)?tareas$/i,
        /^(?:cuántas?|cuantas?)\s+tareas\s+tengo/i,
        /^(?:que|qué)\s+tareas\s+tengo/i,
        /^tareas\s+(pendientes|activas|finalizadas|en\s+proceso)/i
      ],
      priority: 110
    },
    {
      type: 'keyword',
      keywords: [
        'mis tareas',
        'ver tareas',
        'mostrar tareas',
        'listar tareas',
        'tareas pendientes',
        'tareas activas',
        'my tasks',
        'show tasks'
      ],
      priority: 90
    }
  ],

  slots: [
    {
      name: 'queryType',
      type: 'string',
      required: false,
      description: 'Tipo de consulta',
      defaultValue: 'all',
      validation: {
        enum: ['all', 'active', 'by_status', 'by_priority']
      }
    },
    {
      name: 'statusFilter',
      type: 'string',
      required: false,
      description: 'Filtrar por estado específico',
      validation: {
        enum: ['Por Iniciar', 'En Proceso', 'Backlog', 'Por Finalizar', 'Finalizado', 'Cancelado']
      }
    },
    {
      name: 'priorityFilter',
      type: 'string',
      required: false,
      description: 'Filtrar por prioridad',
      validation: {
        enum: ['Alta', 'Media', 'Baja']
      }
    },
    {
      name: 'onlyActive',
      type: 'boolean',
      required: false,
      description: 'Solo tareas activas (En Proceso, Por Finalizar)',
      defaultValue: false
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      description: 'Límite de resultados',
      defaultValue: 20
    }
  ],

  steps: [
    // Paso 1: Detectar tipo de consulta del mensaje original
    {
      id: 'detect_query_type',
      name: 'Detectar tipo de consulta',
      type: 'branch',
      onEnter: async (ctx: ProcessContext) => {
        const message = ctx.originalMessage.toLowerCase()

        // Detectar filtros del mensaje
        if (message.includes('activa') || message.includes('carga') || message.includes('workload')) {
          ctx.slots.onlyActive = true
          ctx.slots.queryType = 'active'
        } else if (message.includes('pendiente') || message.includes('por iniciar')) {
          ctx.slots.statusFilter = 'Por Iniciar'
          ctx.slots.queryType = 'by_status'
        } else if (message.includes('en proceso')) {
          ctx.slots.statusFilter = 'En Proceso'
          ctx.slots.queryType = 'by_status'
        } else if (message.includes('finalizada') || message.includes('terminada') || message.includes('completada')) {
          ctx.slots.statusFilter = 'Finalizado'
          ctx.slots.queryType = 'by_status'
        } else if (message.includes('alta prioridad') || message.includes('urgente')) {
          ctx.slots.priorityFilter = 'Alta'
          ctx.slots.queryType = 'by_priority'
        } else if (message.includes('baja prioridad')) {
          ctx.slots.priorityFilter = 'Baja'
          ctx.slots.queryType = 'by_priority'
        }
      },
      branches: [
        {
          condition: () => true, // Siempre continuar
          nextStep: 'execute_query'
        }
      ]
    },

    // Paso 2: Ejecutar búsqueda
    {
      id: 'execute_query',
      name: 'Ejecutar búsqueda de tareas',
      type: 'execute',
      tool: 'search_tasks',
      toolArgs: (ctx: ProcessContext) => {
        const args: Record<string, unknown> = {
          limit: ctx.slots.limit || 20
        }

        if (ctx.slots.onlyActive) {
          args.onlyActive = true
        }

        if (ctx.slots.statusFilter) {
          args.status = ctx.slots.statusFilter
        }

        if (ctx.slots.priorityFilter) {
          args.priority = ctx.slots.priorityFilter
        }

        return args
      },
      nextStep: 'format_response'
    },

    // Paso 3: Formatear y responder
    {
      id: 'format_response',
      name: 'Formatear respuesta',
      type: 'respond',
      response: (ctx: ProcessContext) => {
        const result = ctx.toolResults.search_tasks

        // Manejar diferentes formatos de respuesta
        let tasks: unknown[] = []

        if (Array.isArray(result)) {
          tasks = result
        } else if (result && typeof result === 'object') {
          if ('tasks' in result && Array.isArray((result as { tasks: unknown[] }).tasks)) {
            tasks = (result as { tasks: unknown[] }).tasks
          } else if ('data' in result && Array.isArray((result as { data: unknown[] }).data)) {
            tasks = (result as { data: unknown[] }).data
          }
        }

        return formatTaskList(tasks, ctx)
      }
      // Sin nextStep = completado
    }
  ],

  initialStep: 'detect_query_type',

  config: {
    requiresConfirmation: false, // Las consultas no requieren confirmación
    maxRetries: 2,
    timeout: 60000, // 1 minuto
    allowCancel: false,
    trackInHistory: true
  },

  metadata: {
    author: 'Aurin Team',
    createdAt: '2024-12-06',
    tags: ['tasks', 'query', 'core']
  }
}

/**
 * Proceso para consultar carga de trabajo del equipo
 */
export const workloadQueryProcess: ProcessDefinition = {
  id: 'workload-query',
  name: 'Consulta de Carga de Trabajo',
  description: 'Muestra la carga de trabajo del equipo',
  version: '1.0.0',

  triggers: [
    {
      type: 'intent',
      intents: ['WORKLOAD'],
      priority: 100
    },
    {
      type: 'pattern',
      patterns: [
        /^carga\s+(?:de\s+)?trabajo/i,
        /^workload/i,
        /^(?:cuántas?|cuantas?)\s+tareas\s+tiene\s+(\w+)/i,
        /^tareas\s+del\s+equipo/i,
        /^distribuci[oó]n\s+(?:de\s+)?tareas/i
      ],
      priority: 110
    },
    {
      type: 'keyword',
      keywords: [
        'carga de trabajo',
        'workload',
        'tareas del equipo',
        'balance de carga'
      ],
      priority: 90
    }
  ],

  slots: [],

  steps: [
    {
      id: 'get_workload',
      name: 'Obtener carga de trabajo',
      type: 'execute',
      tool: 'get_team_workload',
      toolArgs: {},
      nextStep: 'format_workload'
    },
    {
      id: 'format_workload',
      name: 'Formatear carga de trabajo',
      type: 'respond',
      response: (ctx: ProcessContext) => {
        const result = ctx.toolResults.get_team_workload

        if (!result || (Array.isArray(result) && result.length === 0)) {
          return 'No hay datos de carga de trabajo disponibles.'
        }

        // Formatear resultado
        let workloadData: Array<{ userName: string; taskCount: number; tasks?: unknown[] }> = []

        if (Array.isArray(result)) {
          workloadData = result as typeof workloadData
        } else if (typeof result === 'object' && 'data' in result) {
          workloadData = (result as { data: typeof workloadData }).data
        }

        if (workloadData.length === 0) {
          return 'No hay tareas activas asignadas al equipo actualmente.'
        }

        const lines = workloadData
          .sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0))
          .map((user, i) => {
            const count = user.taskCount || 0
            const bar = '█'.repeat(Math.min(count, 10)) + (count > 10 ? '...' : '')
            return `${i + 1}. **${user.userName}**: ${count} tarea(s) ${bar}`
          })

        return `**Carga de Trabajo del Equipo**\n_(Solo tareas activas: En Proceso, Por Finalizar)_\n\n${lines.join('\n')}`
      }
    }
  ],

  initialStep: 'get_workload',

  config: {
    requiresConfirmation: false,
    maxRetries: 2,
    timeout: 60000,
    allowCancel: false,
    trackInHistory: true
  },

  metadata: {
    author: 'Aurin Team',
    createdAt: '2024-12-06',
    tags: ['analytics', 'workload', 'team']
  }
}
