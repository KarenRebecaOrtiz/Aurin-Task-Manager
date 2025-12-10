/**
 * Document analysis tools
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

/**
 * @tool analyze_document_local
 * @description Analiza documentos (PDFs e imágenes) usando OpenAI directamente sin n8n.
 * Extrae texto de PDFs o analiza imágenes con Vision API.
 * Esta herramienta procesa el documento localmente y es más rápida y confiable.
 */
export const analyzeDocumentLocalTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'analyze_document_local',
    description:
      'Analiza un documento (PDF o imagen) usando OpenAI para extraer información y sugerir tareas. Esta herramienta SOLO analiza - NO crea tareas automáticamente. Presenta los resultados al usuario y espera confirmación antes de crear cualquier tarea. Procesa PDFs extrayendo el texto completo y usa Vision API para imágenes.',
    parameters: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'URL del archivo a analizar (requerido). Debe ser un PDF o imagen (jpg, png, etc.)',
        },
        analysisGoal: {
          type: 'string',
          description:
            'Objetivo del análisis (ej: "extraer tareas", "identificar requerimientos", "resumir documento"). Por defecto: "extraer información clave y sugerir tareas"',
        },
      },
      required: ['fileUrl'],
      additionalProperties: false,
    },
  },
}
