/**
 * Client management tools for OpenAI function calling
 * Simplified for chatbot use - bypasses strict validation
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const searchClientsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_clients',
    description: `Busca clientes por nombre (búsqueda parcial/fuzzy).
    IMPORTANTE: Usa esta herramienta ANTES de crear tareas para encontrar el clientId.

    - Si el usuario dice "aurin", busca clientes que contengan "aurin" en el nombre
    - Si no encuentra coincidencias exactas, retorna los más similares
    - Si no existe el cliente, sugiere crearlo con create_client

    Ejemplos de uso:
    - Usuario dice "para aurin" → search_clients({ query: "aurin" })
    - Usuario dice "cliente sodio" → search_clients({ query: "sodio" })`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto a buscar en el nombre del cliente (búsqueda parcial, no case-sensitive)'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (default: 5)'
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  }
}

export const createClientTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_client',
    description: `Crea un nuevo cliente de forma simplificada (solo nombre requerido).

    USAR CUANDO:
    - search_clients no encuentra el cliente
    - El usuario confirma que quiere crear uno nuevo

    IMPORTANTE: Confirma con el usuario antes de crear.`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre del cliente (requerido)'
        },
        company: {
          type: 'string',
          description: 'Nombre de la empresa (opcional)'
        },
        email: {
          type: 'string',
          description: 'Email de contacto (opcional)'
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales (opcional)'
        }
      },
      required: ['name'],
      additionalProperties: false
    }
  }
}

export const clientTools = [searchClientsTool, createClientTool]
