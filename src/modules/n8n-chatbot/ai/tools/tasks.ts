/**
 * Task management tools for OpenAI function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const searchTasksTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_tasks',
    description: `Busca tareas en Firestore del usuario actual. Sin parámetros retorna todas las tareas ordenadas por fecha de creación (más recientes primero).

    IMPORTANTE - Estructura de datos:
    - name: Nombre/título de la tarea
    - AssignedTo: Array de IDs de usuarios asignados (puede estar vacío)
    - LeadedBy: Array de IDs de líderes (puede estar vacío)
    - CreatedBy: ID del usuario creador
    - createdAt: Fecha de creación (ISO string)
    - Los resultados vienen ordenados del más reciente al más antiguo
    `,
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'archived'],
          description: 'Filtrar por estado de la tarea'
        },
        priority: {
          type: 'string',
          enum: ['Alta', 'Media', 'Baja'],
          description: 'Filtrar por prioridad'
        },
        clientId: {
          type: 'string',
          description: 'Filtrar por ID del cliente'
        },
        assignedToUserId: {
          type: 'string',
          description: 'Filtrar tareas donde este userId está en el array AssignedTo'
        },
        leadedByUserId: {
          type: 'string',
          description: 'Filtrar tareas donde este userId está en el array LeadedBy'
        },
        project: {
          type: 'string',
          description: 'Filtrar por nombre del proyecto'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (útil para "última tarea" = 1)'
        },
        orderBy: {
          type: 'string',
          enum: ['createdAt', 'updatedAt', 'name'],
          description: 'Campo por el cual ordenar (default: createdAt)'
        },
        orderDirection: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Dirección de ordenamiento (default: desc - más reciente primero)'
        }
      },
      additionalProperties: false
    }
  }
}

export const createTaskTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_task',
    description: 'Crea una nueva tarea en Firestore. IMPORTANTE: SIEMPRE debes confirmar con el usuario antes de crear la tarea. Lista los detalles y espera confirmación explícita.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Título de la tarea (requerido)'
        },
        description: {
          type: 'string',
          description: 'Descripción detallada de la tarea'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Estado inicial de la tarea (default: todo)'
        },
        priority: {
          type: 'string',
          enum: ['Alta', 'Media', 'Baja'],
          description: 'Prioridad de la tarea (default: Media)'
        },
        clientId: {
          type: 'string',
          description: 'ID del cliente asociado (requerido)'
        },
        project: {
          type: 'string',
          description: 'Nombre del proyecto (requerido)'
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Fecha de inicio en formato YYYY-MM-DD'
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'Fecha de finalización en formato YYYY-MM-DD'
        },
        AssignedTo: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de IDs de usuarios asignados a la tarea'
        },
        LeadedBy: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de IDs de usuarios líderes de la tarea'
        }
      },
      required: ['name', 'project', 'clientId'],
      additionalProperties: false
    }
  }
}

export const updateTaskTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'update_task',
    description: 'Actualiza una tarea existente. Solo actualiza los campos proporcionados. IMPORTANTE: Confirma cambios importantes con el usuario.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tarea a actualizar (requerido)'
        },
        name: {
          type: 'string',
          description: 'Nuevo título de la tarea'
        },
        description: {
          type: 'string',
          description: 'Nueva descripción'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'archived'],
          description: 'Nuevo estado'
        },
        priority: {
          type: 'string',
          enum: ['Alta', 'Media', 'Baja'],
          description: 'Nueva prioridad'
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Nueva fecha de inicio'
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'Nueva fecha de finalización'
        },
        AssignedTo: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de IDs de usuarios asignados'
        },
        LeadedBy: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de IDs de usuarios líderes'
        }
      },
      required: ['taskId'],
      additionalProperties: false
    }
  }
}

export const archiveTaskTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'archive_task',
    description: 'Archiva una tarea (cambia su status a "archived"). Usar en lugar de eliminar para mantener el historial.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tarea a archivar (requerido)'
        }
      },
      required: ['taskId'],
      additionalProperties: false
    }
  }
}
