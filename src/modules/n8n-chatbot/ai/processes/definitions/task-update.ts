/**
 * Proceso: Actualización de Tareas
 *
 * Flujo estructurado para actualizar tareas existentes.
 * Soporta:
 * - Cambio de estado
 * - Cambio de prioridad
 * - Asignación de usuarios
 * - Actualización de fechas
 */

import type { ProcessDefinition, ProcessContext } from '../types'

export const taskUpdateProcess: ProcessDefinition = {
  id: 'task-update',
  name: 'Actualización de Tareas',
  description: 'Proceso para actualizar propiedades de una tarea existente',
  version: '1.0.0',

  triggers: [
    {
      type: 'intent',
      intents: ['TASK_UPDATE'],
      priority: 100
    },
    {
      type: 'pattern',
      patterns: [
        /^(?:actualizar?|editar?|modificar?|cambiar?)\s+(?:la\s+)?tarea\s+(.+)/i,
        /^(?:marcar?|poner?)\s+(?:la\s+)?tarea\s+(.+?)\s+como\s+(.+)/i,
        /^cambiar?\s+(?:el\s+)?estado\s+(?:de\s+)?(.+?)\s+a\s+(.+)/i,
        /^asignar?\s+(?:la\s+)?tarea\s+(.+?)\s+a\s+(\w+)/i
      ],
      priority: 110
    },
    {
      type: 'keyword',
      keywords: [
        'actualizar tarea',
        'editar tarea',
        'cambiar estado',
        'marcar como',
        'asignar tarea',
        'update task'
      ],
      priority: 90
    }
  ],

  slots: [
    {
      name: 'taskIdentifier',
      type: 'string',
      required: true,
      description: 'Nombre o ID de la tarea a actualizar',
      extractFrom: 'message',
      promptIfMissing: '¿Qué tarea deseas actualizar? (nombre o parte del nombre)'
    },
    {
      name: 'taskId',
      type: 'taskId',
      required: true,
      description: 'ID de la tarea encontrada',
      extractFrom: 'tool',
      toolToCall: 'search_tasks'
    },
    {
      name: 'taskName',
      type: 'string',
      required: false,
      description: 'Nombre de la tarea encontrada'
    },
    {
      name: 'newStatus',
      type: 'string',
      required: false,
      description: 'Nuevo estado de la tarea',
      validation: {
        enum: ['Por Iniciar', 'En Proceso', 'Backlog', 'Por Finalizar', 'Finalizado', 'Cancelado']
      }
    },
    {
      name: 'newPriority',
      type: 'string',
      required: false,
      description: 'Nueva prioridad',
      validation: {
        enum: ['Alta', 'Media', 'Baja']
      }
    },
    {
      name: 'assignTo',
      type: 'string',
      required: false,
      description: 'Usuario a asignar'
    },
    {
      name: 'updateType',
      type: 'string',
      required: false,
      description: 'Tipo de actualización',
      defaultValue: 'general'
    }
  ],

  steps: [
    // Paso 1: Detectar qué tipo de actualización
    {
      id: 'detect_update_type',
      name: 'Detectar tipo de actualización',
      type: 'branch',
      onEnter: async (ctx: ProcessContext) => {
        const message = ctx.originalMessage.toLowerCase()

        // Detectar cambios de estado
        const statusPatterns: Array<{ pattern: RegExp; status: string }> = [
          { pattern: /finaliza(?:do|r)|termina(?:do|r)|completa(?:do|r)/, status: 'Finalizado' },
          { pattern: /en\s*proceso|iniciar|empezar/, status: 'En Proceso' },
          { pattern: /por\s*finalizar|casi\s*listo/, status: 'Por Finalizar' },
          { pattern: /cancelar|archivar/, status: 'Cancelado' },
          { pattern: /backlog|pendiente|espera/, status: 'Backlog' }
        ]

        for (const { pattern, status } of statusPatterns) {
          if (pattern.test(message)) {
            ctx.slots.newStatus = status
            ctx.slots.updateType = 'status'
            break
          }
        }

        // Detectar cambios de prioridad
        if (message.includes('urgente') || message.includes('alta prioridad')) {
          ctx.slots.newPriority = 'Alta'
          ctx.slots.updateType = 'priority'
        } else if (message.includes('baja prioridad')) {
          ctx.slots.newPriority = 'Baja'
          ctx.slots.updateType = 'priority'
        }

        // Detectar asignación
        const assignMatch = message.match(/asignar?\s+(?:a\s+)?(\w+)/i)
        if (assignMatch) {
          ctx.slots.assignTo = assignMatch[1]
          ctx.slots.updateType = 'assign'
        }
      },
      branches: [
        {
          condition: () => true,
          nextStep: 'collect_task_identifier'
        }
      ]
    },

    // Paso 2: Recolectar identificador de tarea
    {
      id: 'collect_task_identifier',
      name: 'Recolectar identificador de tarea',
      type: 'collect',
      slots: ['taskIdentifier'],
      nextStep: 'search_task'
    },

    // Paso 3: Buscar la tarea
    {
      id: 'search_task',
      name: 'Buscar tarea',
      type: 'execute',
      tool: 'search_tasks',
      toolArgs: (ctx: ProcessContext) => ({
        limit: 5
        // La búsqueda por nombre se hace en el siguiente paso
      }),
      nextStep: 'find_matching_task'
    },

    // Paso 4: Encontrar tarea que coincida
    {
      id: 'find_matching_task',
      name: 'Encontrar tarea coincidente',
      type: 'branch',
      onEnter: async (ctx: ProcessContext) => {
        const result = ctx.toolResults.search_tasks
        const identifier = (ctx.slots.taskIdentifier as string || '').toLowerCase()

        let tasks: Array<{ id: string; name: string; status?: string }> = []

        if (Array.isArray(result)) {
          tasks = result as typeof tasks
        } else if (result && typeof result === 'object' && 'tasks' in result) {
          tasks = (result as { tasks: typeof tasks }).tasks
        }

        // Buscar coincidencia por nombre
        const match = tasks.find(t =>
          t.name && t.name.toLowerCase().includes(identifier)
        )

        if (match) {
          ctx.slots.taskId = match.id
          ctx.slots.taskName = match.name
          ctx.slots.currentStatus = match.status
        } else if (tasks.length > 0) {
          // Si no hay coincidencia exacta, guardar candidatos
          ctx.slots.taskCandidates = tasks.slice(0, 3)
        }
      },
      branches: [
        {
          condition: (ctx: ProcessContext) => !!ctx.slots.taskId,
          nextStep: 'check_update_type'
        },
        {
          condition: (ctx: ProcessContext) => !!ctx.slots.taskCandidates,
          nextStep: 'show_candidates'
        },
        {
          condition: () => true,
          nextStep: 'task_not_found'
        }
      ]
    },

    // Paso 4a: Mostrar candidatos
    {
      id: 'show_candidates',
      name: 'Mostrar tareas candidatas',
      type: 'respond',
      response: (ctx: ProcessContext) => {
        const candidates = ctx.slots.taskCandidates as Array<{ name: string; status?: string }>
        const list = candidates
          .map((t, i) => `${i + 1}. ${t.name} (${t.status || 'Sin estado'})`)
          .join('\n')
        return `No encontré una tarea exacta con "${ctx.slots.taskIdentifier}". ¿Te refieres a alguna de estas?\n\n${list}\n\nPor favor, indica el número o escribe el nombre exacto.`
      }
      // Proceso termina aquí, usuario debe reiniciar con nombre correcto
    },

    // Paso 4b: Tarea no encontrada
    {
      id: 'task_not_found',
      name: 'Tarea no encontrada',
      type: 'respond',
      response: (ctx: ProcessContext) =>
        `No encontré ninguna tarea con "${ctx.slots.taskIdentifier}". ¿Podrías verificar el nombre?`
    },

    // Paso 5: Verificar qué actualizar
    {
      id: 'check_update_type',
      name: 'Verificar tipo de actualización',
      type: 'branch',
      branches: [
        {
          condition: (ctx: ProcessContext) => !!ctx.slots.newStatus,
          nextStep: 'confirm_status_change'
        },
        {
          condition: (ctx: ProcessContext) => !!ctx.slots.newPriority,
          nextStep: 'confirm_priority_change'
        },
        {
          condition: (ctx: ProcessContext) => !!ctx.slots.assignTo,
          nextStep: 'search_user_to_assign'
        },
        {
          condition: () => true,
          nextStep: 'ask_what_to_update'
        }
      ]
    },

    // Paso 5a: Preguntar qué actualizar
    {
      id: 'ask_what_to_update',
      name: 'Preguntar qué actualizar',
      type: 'respond',
      response: (ctx: ProcessContext) =>
        `Encontré la tarea "${ctx.slots.taskName}". ¿Qué deseas cambiar?\n\n• Estado (ej: "marcar como finalizada")\n• Prioridad (ej: "prioridad alta")\n• Asignación (ej: "asignar a Juan")`
    },

    // Paso 6a: Confirmar cambio de estado
    {
      id: 'confirm_status_change',
      name: 'Confirmar cambio de estado',
      type: 'confirm',
      confirmMessage: (ctx: ProcessContext) =>
        `Voy a cambiar el estado de "${ctx.slots.taskName}" de "${ctx.slots.currentStatus || 'actual'}" a "${ctx.slots.newStatus}". ¿Confirmas?`,
      nextStep: 'execute_update'
    },

    // Paso 6b: Confirmar cambio de prioridad
    {
      id: 'confirm_priority_change',
      name: 'Confirmar cambio de prioridad',
      type: 'confirm',
      confirmMessage: (ctx: ProcessContext) =>
        `Voy a cambiar la prioridad de "${ctx.slots.taskName}" a "${ctx.slots.newPriority}". ¿Confirmas?`,
      nextStep: 'execute_update'
    },

    // Paso 6c: Buscar usuario para asignar
    {
      id: 'search_user_to_assign',
      name: 'Buscar usuario',
      type: 'execute',
      tool: 'get_team_workload', // Usamos esto para obtener lista de usuarios
      toolArgs: {},
      onExit: async (ctx: ProcessContext) => {
        const result = ctx.toolResults.get_team_workload
        const assignTo = (ctx.slots.assignTo as string || '').toLowerCase()

        let users: Array<{ id?: string; odioUserId?: string; userName: string }> = []

        if (Array.isArray(result)) {
          users = result as typeof users
        } else if (result && typeof result === 'object' && 'data' in result) {
          users = (result as { data: typeof users }).data
        }

        const match = users.find(u =>
          u.userName && u.userName.toLowerCase().includes(assignTo)
        )

        if (match) {
          ctx.slots.assignToUserId = match.id || match.odioUserId
          ctx.slots.assignToUserName = match.userName
        }
      },
      nextStep: 'check_user_found'
    },

    // Paso 6c.2: Verificar usuario encontrado
    {
      id: 'check_user_found',
      name: 'Verificar usuario encontrado',
      type: 'branch',
      branches: [
        {
          condition: (ctx: ProcessContext) => !!ctx.slots.assignToUserId,
          nextStep: 'confirm_assignment'
        },
        {
          condition: () => true,
          nextStep: 'user_not_found'
        }
      ]
    },

    // Paso 6c.3: Usuario no encontrado
    {
      id: 'user_not_found',
      name: 'Usuario no encontrado',
      type: 'respond',
      response: (ctx: ProcessContext) =>
        `No encontré un usuario llamado "${ctx.slots.assignTo}". Verifica el nombre e intenta de nuevo.`
    },

    // Paso 6c.4: Confirmar asignación
    {
      id: 'confirm_assignment',
      name: 'Confirmar asignación',
      type: 'confirm',
      confirmMessage: (ctx: ProcessContext) =>
        `Voy a asignar la tarea "${ctx.slots.taskName}" a ${ctx.slots.assignToUserName}. ¿Confirmas?`,
      nextStep: 'execute_assignment'
    },

    // Paso 7a: Ejecutar asignación
    {
      id: 'execute_assignment',
      name: 'Ejecutar asignación',
      type: 'execute',
      tool: 'update_task',
      toolArgs: (ctx: ProcessContext) => ({
        taskId: ctx.slots.taskId,
        AssignedTo: [ctx.slots.assignToUserId]
      }),
      nextStep: 'update_success'
    },

    // Paso 7: Ejecutar actualización
    {
      id: 'execute_update',
      name: 'Ejecutar actualización',
      type: 'execute',
      tool: 'update_task',
      toolArgs: (ctx: ProcessContext) => {
        const args: Record<string, unknown> = {
          taskId: ctx.slots.taskId
        }

        if (ctx.slots.newStatus) {
          args.status = ctx.slots.newStatus
        }

        if (ctx.slots.newPriority) {
          args.priority = ctx.slots.newPriority
        }

        return args
      },
      nextStep: 'update_success'
    },

    // Paso 8: Respuesta de éxito
    {
      id: 'update_success',
      name: 'Actualización exitosa',
      type: 'respond',
      response: (ctx: ProcessContext) => {
        const taskName = ctx.slots.taskName

        if (ctx.slots.newStatus) {
          return `Tarea "${taskName}" actualizada a estado "${ctx.slots.newStatus}".`
        }

        if (ctx.slots.newPriority) {
          return `Prioridad de "${taskName}" cambiada a "${ctx.slots.newPriority}".`
        }

        if (ctx.slots.assignToUserName) {
          return `Tarea "${taskName}" asignada a ${ctx.slots.assignToUserName}.`
        }

        return `Tarea "${taskName}" actualizada correctamente.`
      }
    }
  ],

  initialStep: 'detect_update_type',

  config: {
    requiresConfirmation: true,
    maxRetries: 3,
    timeout: 300000,
    allowCancel: true,
    trackInHistory: true
  },

  metadata: {
    author: 'Aurin Team',
    createdAt: '2024-12-06',
    tags: ['tasks', 'update', 'core']
  }
}

/**
 * Proceso para archivar tareas (solo admins)
 */
export const taskArchiveProcess: ProcessDefinition = {
  id: 'task-archive',
  name: 'Archivar Tarea',
  description: 'Proceso para archivar/cancelar tareas (solo administradores)',
  version: '1.0.0',

  triggers: [
    {
      type: 'intent',
      intents: ['TASK_ARCHIVE'],
      priority: 100,
      condition: (ctx: ProcessContext) => ctx.userContext.isAdmin
    },
    {
      type: 'pattern',
      patterns: [
        /^(?:eliminar?|borrar?|archivar?)\s+(?:la\s+)?tarea\s+(.+)/i,
        /^cancelar?\s+(?:la\s+)?tarea\s+(.+)/i
      ],
      priority: 110,
      condition: (ctx: ProcessContext) => ctx.userContext.isAdmin
    }
  ],

  slots: [
    {
      name: 'taskIdentifier',
      type: 'string',
      required: true,
      description: 'Nombre o ID de la tarea',
      promptIfMissing: '¿Qué tarea deseas archivar?'
    },
    {
      name: 'taskId',
      type: 'taskId',
      required: true,
      description: 'ID de la tarea'
    }
  ],

  steps: [
    {
      id: 'check_admin',
      name: 'Verificar permisos',
      type: 'branch',
      branches: [
        {
          condition: (ctx: ProcessContext) => ctx.userContext.isAdmin,
          nextStep: 'collect_task'
        },
        {
          condition: () => true,
          nextStep: 'not_authorized'
        }
      ]
    },
    {
      id: 'not_authorized',
      name: 'No autorizado',
      type: 'respond',
      response: 'Solo los administradores pueden archivar tareas. Puedo ayudarte a cambiar el estado a "Cancelado" si lo deseas.'
    },
    {
      id: 'collect_task',
      name: 'Recolectar tarea',
      type: 'collect',
      slots: ['taskIdentifier'],
      nextStep: 'search_task'
    },
    {
      id: 'search_task',
      name: 'Buscar tarea',
      type: 'execute',
      tool: 'search_tasks',
      toolArgs: {},
      onExit: async (ctx: ProcessContext) => {
        const result = ctx.toolResults.search_tasks
        const identifier = (ctx.slots.taskIdentifier as string || '').toLowerCase()

        let tasks: Array<{ id: string; name: string }> = []
        if (Array.isArray(result)) {
          tasks = result as typeof tasks
        }

        const match = tasks.find(t => t.name?.toLowerCase().includes(identifier))
        if (match) {
          ctx.slots.taskId = match.id
          ctx.slots.taskName = match.name
        }
      },
      nextStep: 'confirm_archive'
    },
    {
      id: 'confirm_archive',
      name: 'Confirmar archivo',
      type: 'confirm',
      confirmMessage: (ctx: ProcessContext) =>
        `¿Estás seguro de que deseas archivar la tarea "${ctx.slots.taskName}"? Esta acción cambiará su estado a "Cancelado".`,
      nextStep: 'execute_archive'
    },
    {
      id: 'execute_archive',
      name: 'Ejecutar archivo',
      type: 'execute',
      tool: 'archive_task',
      toolArgs: (ctx: ProcessContext) => ({
        taskId: ctx.slots.taskId
      }),
      nextStep: 'archive_success'
    },
    {
      id: 'archive_success',
      name: 'Archivo exitoso',
      type: 'respond',
      response: (ctx: ProcessContext) =>
        `Tarea "${ctx.slots.taskName}" archivada correctamente.`
    }
  ],

  initialStep: 'check_admin',

  config: {
    requiresConfirmation: true,
    maxRetries: 2,
    timeout: 120000,
    allowCancel: true,
    trackInHistory: true
  },

  metadata: {
    author: 'Aurin Team',
    createdAt: '2024-12-06',
    tags: ['tasks', 'archive', 'admin']
  }
}
