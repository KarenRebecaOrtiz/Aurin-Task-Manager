/**
 * @file n8n-integrations.ts
 * @description Herramientas de IA que delegan tareas complejas a flujos de trabajo de n8n.
 *
 * Este archivo define herramientas que el modelo de lenguaje (LLM) puede utilizar,
 * pero cuya lógica de ejecución no reside en el backend de la aplicación, sino en
 * una instancia de n8n. El `tool-executor` se encarga de llamar al webhook
 * correspondiente para cada una de estas herramientas.
 *
 * @pattern Cada herramienta aquí definida debe tener un `case` correspondiente en `tool-executor.ts`
 *          que llame a `callN8nWebhook` con un `type` único.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

/**
 * @tool analyze_document
 * @description Analiza un documento (PDF o imagen) usando un flujo de trabajo de Vision AI en n8n.
 * Esta herramienta es ideal para extraer información, resumir contenidos o identificar
 * puntos clave de un archivo visual o de texto denso.
 *
 * @param {string} fileUrl - URL pública del archivo a analizar.
 * @param {string} analysisGoal - El objetivo o la pregunta específica para el análisis.
 *
 * @returns {object} El resultado del análisis del flujo de trabajo de n8n.
 */
export const analyzeDocumentTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'analyze_document',
    description:
      'Analiza un documento (PDF o imagen) usando Vision AI para extraer información y sugerir tareas. Esta herramienta SOLO analiza - NO crea tareas automáticamente. Presenta los resultados al usuario y espera confirmación antes de crear cualquier tarea.',
    parameters: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'URL del archivo a analizar (requerido)',
        },
        analysisGoal: {
          type: 'string',
          description:
            'Objetivo del análisis (ej: "extraer tareas", "identificar requerimientos", "resumir documento")',
        },
      },
      required: ['fileUrl'],
      additionalProperties: false,
    },
  },
}

/**
 * @tool create_notion_plan
 * @description Crea una nueva página en Notion con contenido estructurado.
 * Se activa cuando el usuario quiere crear un "plan", "propuesta", o un documento formal.
 * El LLM debe generar el contenido en Markdown.
 *
 * @param {string} title - Título de la página de Notion.
 * @param {string} contentMarkdown - Contenido del documento en formato Markdown.
 *
 * @returns {object} El resultado de la operación del flujo de trabajo de n8n.
 */
export const createNotionPlanTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_notion_plan',
    description:
      'Crea un documento estructurado en Notion. SOLO usar cuando el usuario pida explícitamente crear un "plan", "propuesta", "documento" o "página en Notion".',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título del documento en Notion (requerido)',
        },
        contentMarkdown: {
          type: 'string',
          description: 'Contenido del documento en formato Markdown (requerido)',
        },
      },
      required: ['title', 'contentMarkdown'],
      additionalProperties: false,
    },
  },
}

/**
 * @tool transcribe_audio
 * @description Transcribe un archivo de audio a texto usando un flujo de n8n que conecta con Whisper.
 * Es la herramienta designada para manejar cualquier input de audio del usuario.
 *
 * @param {string} audioUrl - URL pública del archivo de audio a transcribir.
 *
 * @returns {{transcription: string}} El texto transcrito del audio.
 */
export const transcribeAudioTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'transcribe_audio',
    description:
      'Transcribe un archivo de audio (mp3, wav, m4a, webm, ogg) a texto usando OpenAI Whisper. Usa esta herramienta cuando el usuario adjunte un archivo de audio. Devuelve el texto transcrito que puedes usar para responder preguntas o crear tareas.',
    parameters: {
      type: 'object',
      properties: {
        audioUrl: {
          type: 'string',
          description: 'URL del archivo de audio a transcribir (requerido)',
        },
      },
      required: ['audioUrl'],
      additionalProperties: false,
    },
  },
}

/**
 * @tool web_search
 * @description Realiza una búsqueda en internet a través de un flujo de n8n que conecta con Tavily API.
 * Esta es la herramienta principal para obtener información externa, datos en tiempo real o
 * conocimiento sobre temas posteriores a la fecha de corte del LLM.
 *
 * @param {string} query - La consulta de búsqueda específica.
 *
 * @returns {object} Los resultados de la búsqueda formateados por el flujo de n8n.
 */
export const webSearchTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'Realiza una búsqueda en internet usando el motor de Tavily para obtener información actualizada o responder preguntas sobre eventos recientes, noticias o temas que no están en la base de conocimiento interna. Útil para cualquier pregunta que requiera datos externos.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'La pregunta o término de búsqueda específico a enviar al motor de búsqueda. Debe ser una consulta clara y concisa.',
        },
      },
      required: ['query'],
    },
  },
}
