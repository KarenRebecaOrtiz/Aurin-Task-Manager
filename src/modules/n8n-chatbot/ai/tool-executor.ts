/**
 * Tool execution handler
 * Routes tool calls to appropriate functions
 */

import {
  searchTasks,
  createTask,
  updateTask,
  archiveTask
} from '../lib/tasks'
import {
  searchClients,
  createClient,
  getClient,
  updateClient
} from '../lib/clients'
import {
  getTeamWorkload,
  getProjectHours,
  getUserTasks,
} from '../lib/analytics/index'
import { getUsersInfo, searchUsers } from '../lib/users/get-users'
import {
  formatTavilyResponse,
  type TavilyResponse,
} from './formatters/tavily-formatter'
import { extractPdfText } from '../lib/documents/analyze-document'

/**
 * Standard function tool call type
 */
interface FunctionToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * Execute a tool call and return the result
 */
export async function executeTool(
  toolCall: FunctionToolCall,
  userId: string,
  isAdmin: boolean = false,
  modes?: {
    webSearch?: boolean
    audioMode?: boolean
    documentMode?: boolean
    canvasMode?: boolean
  }
): Promise<unknown> {
  const { name: toolName, arguments: argsString } = toolCall.function
  const args = JSON.parse(argsString)

  // Validate tool execution based on active modes
  if (toolName === 'web_search' && !modes?.webSearch) {
    return {
      success: false,
      error: 'Web search no está habilitado. Activa el botón de búsqueda web para usar esta función.',
      toolName,
    }
  }

  if (toolName === 'transcribe_audio' && !modes?.audioMode) {
    return {
      success: false,
      error: 'Modo audio no está habilitado. Activa el botón de audio para transcribir archivos.',
      toolName,
    }
  }

  if (toolName === 'analyze_document' && !modes?.documentMode) {
    return {
      success: false,
      error: 'Modo análisis de documentos no está habilitado. Activa el botón de análisis de documentos para usar esta función.',
      toolName,
    }
  }

  if (toolName === 'analyze_document' && !modes?.documentMode) {
    return {
      success: false,
      error: 'Modo análisis de documentos no está habilitado. Activa el botón de análisis de documentos para usar esta función.',
      toolName,
    }
  }

  if (toolName === 'create_notion_plan' && !modes?.canvasMode) {
    return {
      success: false,
      error: 'Modo crear plan no está habilitado. Activa el botón de crear plan para usar esta función.',
      toolName,
    }
  }

  try {
    switch (toolName) {
      // Client management (search/create before tasks)
      case 'search_clients':
        return await searchClients(args.query, args.limit)

      case 'create_client':
        return await createClient(args)

      case 'get_client':
        return await getClient(args.clientId)

      case 'update_client':
        return await updateClient(args.clientId, args)

      // Task management
      case 'search_tasks':
        return await searchTasks(userId, args)

      case 'create_task':
        return await createTask(userId, args)

      case 'update_task':
        return await updateTask(userId, args.taskId, args, isAdmin)

      case 'archive_task':
        return await archiveTask(userId, args.taskId, isAdmin)

      // Analytics
      case 'get_team_workload':
        return await getTeamWorkload(args)

      case 'get_project_hours':
        return await getProjectHours(args)

      case 'get_user_tasks':
        return await getUserTasks(args.userId, args)

      // User information
      case 'search_users':
        return await searchUsers(args)

      case 'get_users_info':
        return await getUsersInfo(args.userIds)

      // Document analysis via n8n (handles PDFs and images)
      case 'analyze_document': {
        const fileUrl = args.fileUrl as string
        const urlPath = fileUrl.split('?')[0].toLowerCase()
        const isPDF = urlPath.endsWith('.pdf') || urlPath.includes('.pdf')
        
        let extractedText: string | undefined
        
        // Extract text from PDF locally (much cheaper than Vision API)
        if (isPDF) {
          try {
            console.log('[analyze_document] Extracting PDF text locally...')
            extractedText = await extractPdfText(fileUrl)
            console.log(`[analyze_document] Extracted ${extractedText.length} chars from PDF`)
          } catch (error) {
            console.error('[analyze_document] Failed to extract PDF text:', error)
            // Will fallback to Vision API in n8n if text extraction fails
          }
        }
        
        return await callN8nWebhook('vision', {
          fileUrl,
          extractedText, // Send extracted text if available
          analysisGoal: args.analysisGoal,
          fileType: isPDF ? 'pdf' : 'image',
          userId
        })
      }

      // n8n integrations
      case 'create_notion_plan':
        return await callN8nWebhook('notion', { ...args, userId })

      case 'transcribe_audio':
        return await callN8nWebhook('audio', { ...args, userId })

      case 'web_search': {
        const rawResponse = await callN8nWebhook('web_search', {
          ...args,
          userId,
        })
        return formatTavilyResponse(rawResponse as TavilyResponse)
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      toolName,
    }
  }
}

/**
 * Call n8n webhook for complex operations
 */
async function callN8nWebhook(
  type: 'vision' | 'notion' | 'audio' | 'web_search',
  payload: Record<string, unknown>,
): Promise<unknown> {
  const webhookUrls = {
    vision: process.env.N8N_VISION_WEBHOOK_URL,
    notion: process.env.N8N_NOTION_WEBHOOK_URL,
    audio: process.env.N8N_AUDIO_WEBHOOK_URL,
    web_search: process.env.N8N_WEB_SEARCH_WEBHOOK_URL,
  }

  const url = webhookUrls[type]

  if (!url) {
    throw new Error(`n8n webhook URL not configured for ${type}`)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`n8n webhook failed: ${errorText}`)
  }

  return await response.json()
}
