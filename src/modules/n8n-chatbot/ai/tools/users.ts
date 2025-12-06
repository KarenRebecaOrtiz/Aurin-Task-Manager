/**
 * User information tools for OpenAI function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const searchUsersTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_users',
    description: `Busca usuarios por nombre, email o rol.

    FLUJO PARA ASIGNAR USUARIOS A TAREAS:
    1. Usuario dice "asigna a Juan a la tarea"
    2. Usa search_users con query "Juan" para encontrar el usuario
    3. Obtén el "id" del usuario de los resultados
    4. Usa update_task con AssignedTo: [userId]

    Retorna: Array de usuarios con id, name, email, role
    
    IMPORTANTE: El "id" retornado es el que debes usar en AssignedTo o LeadedBy.`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Nombre o email parcial para buscar (ej: "Juan", "karen@")'
        },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'viewer'],
          description: 'Filtrar por rol específico'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (default: 10)'
        }
      },
      additionalProperties: false
    }
  }
}

export const getUsersInfoTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_users_info',
    description: `Obtiene información de uno o más usuarios de Firestore (nombres, emails, roles).

    Úsala cuando:
    - Necesites convertir IDs de usuario a nombres legibles
    - Tengas un array AssignedTo o LeadedBy con IDs de usuarios
    - El usuario pregunte "quién está asignado", "quién lidera", etc.
    `,
    parameters: {
      type: 'object',
      properties: {
        userIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de IDs de usuarios para obtener información'
        }
      },
      required: ['userIds'],
      additionalProperties: false
    }
  }
}
