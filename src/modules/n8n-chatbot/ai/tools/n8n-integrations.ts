/**
 * n8n integration tools for complex workflows
 * These tools delegate to n8n workflows for advanced processing
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const analyzeDocumentTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'analyze_document',
    description: 'Analiza un documento (PDF o imagen) usando Vision AI para extraer información y sugerir tareas. Esta herramienta SOLO analiza - NO crea tareas automáticamente. Presenta los resultados al usuario y espera confirmación antes de crear cualquier tarea.',
    parameters: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'URL del archivo a analizar (requerido)'
        },
        analysisGoal: {
          type: 'string',
          description: 'Objetivo del análisis (ej: "extraer tareas", "identificar requerimientos", "resumir documento")'
        }
      },
      required: ['fileUrl'],
      additionalProperties: false
    }
  }
}

export const createNotionPlanTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_notion_plan',
    description: 'Crea un documento estructurado en Notion. SOLO usar cuando el usuario pida explícitamente crear un "plan", "propuesta", "documento" o "página en Notion".',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título del documento en Notion (requerido)'
        },
        contentMarkdown: {
          type: 'string',
          description: 'Contenido del documento en formato Markdown (requerido)'
        }
      },
      required: ['title', 'contentMarkdown'],
      additionalProperties: false
    }
  }
}
