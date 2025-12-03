/**
 * User information tools for OpenAI function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

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
