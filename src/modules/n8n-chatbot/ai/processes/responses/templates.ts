/**
 * Response Templates - Plantillas de respuestas predefinidas
 *
 * Estas plantillas reducen la necesidad de que el LLM genere
 * respuestas para casos comunes, ahorrando tokens.
 */

export const RESPONSE_TEMPLATES = {
  // === CONFIRMACIONES ===
  TASK_CREATED: (taskName: string, clientName: string) =>
    `Tarea "${taskName}" creada correctamente para ${clientName}.`,

  TASK_UPDATED: (taskName: string, field: string, value: string) =>
    `Tarea "${taskName}" actualizada: ${field} cambiado a "${value}".`,

  TASK_ARCHIVED: (taskName: string) =>
    `Tarea "${taskName}" archivada correctamente.`,

  CLIENT_CREATED: (clientName: string) =>
    `Cliente "${clientName}" creado correctamente.`,

  // === CONFIRMACIÓN PENDIENTE ===
  CONFIRM_TASK_CREATION: (data: {
    taskName: string
    clientName: string
    project: string
    priority: string
    status: string
  }) => `Voy a crear la siguiente tarea:

**Tarea:** ${data.taskName}
**Cliente:** ${data.clientName}
**Proyecto:** ${data.project}
**Prioridad:** ${data.priority}
**Estado:** ${data.status}

¿Confirmas?`,

  CONFIRM_TASK_UPDATE: (taskName: string, changes: string) =>
    `Voy a actualizar la tarea "${taskName}":\n${changes}\n\n¿Confirmas?`,

  CONFIRM_TASK_ARCHIVE: (taskName: string) =>
    `¿Estás seguro de que deseas archivar la tarea "${taskName}"? Esta acción cambiará su estado a "Cancelado".`,

  CONFIRM_CLIENT_CREATION: (clientName: string) =>
    `No encontré el cliente "${clientName}". ¿Deseas que lo cree?`,

  // === ERRORES ===
  TASK_NOT_FOUND: (identifier: string) =>
    `No encontré ninguna tarea con "${identifier}". ¿Podrías verificar el nombre?`,

  CLIENT_NOT_FOUND: (clientName: string) =>
    `No encontré un cliente llamado "${clientName}".`,

  USER_NOT_FOUND: (userName: string) =>
    `No encontré un usuario llamado "${userName}". Verifica el nombre e intenta de nuevo.`,

  NOT_AUTHORIZED: (action: string) =>
    `No tienes permisos para ${action}. Esta acción está reservada para administradores.`,

  MISSING_REQUIRED_DATA: (field: string) =>
    `Necesito más información. Por favor, proporciona: ${field}`,

  OPERATION_CANCELLED: () =>
    'Operación cancelada. ¿En qué más puedo ayudarte?',

  GENERIC_ERROR: (message: string) =>
    `Ocurrió un error: ${message}. Por favor, intenta de nuevo.`,

  // === LISTAS Y RESULTADOS ===
  NO_TASKS_FOUND: () =>
    'No encontré tareas con esos criterios.',

  TASK_LIST_HEADER: (count: number, filter?: string) => {
    if (filter) {
      return `Encontré ${count} tarea(s) ${filter}:`
    }
    return `Encontré ${count} tarea(s):`
  },

  WORKLOAD_HEADER: () =>
    '**Carga de Trabajo del Equipo**\n_(Solo tareas activas: En Proceso, Por Finalizar)_',

  NO_WORKLOAD_DATA: () =>
    'No hay tareas activas asignadas al equipo actualmente.',

  // === AYUDA ===
  HELP_MESSAGE: () => `**¿En qué puedo ayudarte?**

**Tareas:**
• "Crear tarea de X para cliente Y"
• "Mis tareas" o "tareas activas"
• "Marcar tarea X como finalizada"
• "Cambiar prioridad de X a alta"

**Consultas:**
• "Carga de trabajo del equipo"
• "Tareas pendientes"
• "Tareas de alta prioridad"

**Clientes:**
• "Buscar cliente X"
• "Crear cliente nuevo"

Solo di lo que necesitas en lenguaje natural.`,

  // === SUGERENCIAS ===
  FOLLOW_UP_TASK_CREATED: () =>
    '¿Necesitas crear otra tarea o hacer algo más?',

  FOLLOW_UP_QUERY: () =>
    '¿Quieres que filtre por algún criterio específico?',

  SUGGEST_ALTERNATIVES: (options: string[]) =>
    `¿Te refieres a alguna de estas opciones?\n\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
}

/**
 * Quick Replies predefinidos para diferentes contextos
 */
export const QUICK_REPLIES = {
  CONFIRMATION: [
    { label: 'Sí, confirmar', payload: 'confirmar' },
    { label: 'Cancelar', payload: 'cancelar' }
  ],

  AFTER_TASK_CREATED: [
    { label: 'Crear otra tarea', payload: 'crear tarea' },
    { label: 'Ver mis tareas', payload: 'mis tareas' }
  ],

  AFTER_QUERY: [
    { label: 'Tareas activas', payload: 'tareas activas' },
    { label: 'Carga de trabajo', payload: 'carga de trabajo' },
    { label: 'Crear tarea', payload: 'crear tarea' }
  ],

  MAIN_MENU: [
    { label: 'Mis tareas', payload: 'mis tareas' },
    { label: 'Crear tarea', payload: 'crear tarea' },
    { label: 'Carga de trabajo', payload: 'carga de trabajo' },
    { label: 'Ayuda', payload: 'ayuda' }
  ],

  STATUS_OPTIONS: [
    { label: 'En Proceso', payload: 'cambiar a en proceso' },
    { label: 'Finalizado', payload: 'cambiar a finalizado' },
    { label: 'Backlog', payload: 'cambiar a backlog' }
  ],

  PRIORITY_OPTIONS: [
    { label: 'Alta', payload: 'prioridad alta' },
    { label: 'Media', payload: 'prioridad media' },
    { label: 'Baja', payload: 'prioridad baja' }
  ]
}

/**
 * Formatea una lista de tareas para mostrar
 */
export function formatTaskList(
  tasks: Array<{
    name?: string
    status?: string
    priority?: string
    clientName?: string
  }>,
  maxItems = 10
): string {
  if (tasks.length === 0) {
    return RESPONSE_TEMPLATES.NO_TASKS_FOUND()
  }

  const lines = tasks.slice(0, maxItems).map((task, i) => {
    const priorityEmoji = task.priority === 'Alta' ? '🔴' :
                          task.priority === 'Media' ? '🟡' : '🟢'
    const client = task.clientName ? ` | ${task.clientName}` : ''
    return `${i + 1}. ${priorityEmoji} **${task.name || 'Sin nombre'}** - ${task.status || 'Sin estado'}${client}`
  })

  let result = lines.join('\n')

  if (tasks.length > maxItems) {
    result += `\n\n_...y ${tasks.length - maxItems} tarea(s) más._`
  }

  return result
}

/**
 * Formatea datos de carga de trabajo
 */
export function formatWorkload(
  data: Array<{
    userName: string
    taskCount: number
  }>
): string {
  if (data.length === 0) {
    return RESPONSE_TEMPLATES.NO_WORKLOAD_DATA()
  }

  const sorted = [...data].sort((a, b) => b.taskCount - a.taskCount)

  const lines = sorted.map((user, i) => {
    const bar = '█'.repeat(Math.min(user.taskCount, 10)) +
                (user.taskCount > 10 ? '...' : '')
    return `${i + 1}. **${user.userName}**: ${user.taskCount} tarea(s) ${bar}`
  })

  return `${RESPONSE_TEMPLATES.WORKLOAD_HEADER()}\n\n${lines.join('\n')}`
}
