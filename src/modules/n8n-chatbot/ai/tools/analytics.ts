/**
 * Analytics and reporting tools for OpenAI function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const getTeamWorkloadTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_team_workload',
    description: 'Obtiene la carga de trabajo actual de los miembros del equipo. Muestra cuántas tareas activas tiene cada persona y sus detalles.',
    parameters: {
      type: 'object',
      properties: {
        teamId: {
          type: 'string',
          description: 'ID del equipo (opcional, si no se proporciona muestra todos los usuarios)'
        },
        includeArchived: {
          type: 'boolean',
          description: 'Incluir tareas archivadas en el conteo (default: false)'
        }
      },
      additionalProperties: false
    }
  }
}

export const getProjectHoursTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_project_hours',
    description: 'Obtiene el total de horas registradas en un proyecto específico o cliente. Muestra time logs y suma de horas.',
    parameters: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Nombre del proyecto para filtrar'
        },
        clientId: {
          type: 'string',
          description: 'ID del cliente para filtrar'
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Fecha de inicio del rango (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'Fecha de fin del rango (YYYY-MM-DD)'
        }
      },
      additionalProperties: false
    }
  }
}

export const getUserTasksTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_user_tasks',
    description: 'Obtiene las tareas asignadas a un usuario específico. Útil para ver qué está haciendo un miembro del equipo.',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID del usuario para consultar sus tareas (requerido)'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'archived'],
          description: 'Filtrar por estado de las tareas'
        }
      },
      required: ['userId'],
      additionalProperties: false
    }
  }
}
