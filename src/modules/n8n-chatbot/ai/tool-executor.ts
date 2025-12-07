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
  getUserTasks
} from '../lib/analytics'
import { getUsersInfo, searchUsers } from '../lib/users/get-users'

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
  isAdmin: boolean = false
): Promise<unknown> {
  const { name: toolName, arguments: argsString } = toolCall.function
  const args = JSON.parse(argsString)

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

      // n8n integrations
      case 'analyze_document':
        return await callN8nWebhook('vision', { ...args, userId })

      case 'create_notion_plan':
        return await callN8nWebhook('notion', { ...args, userId })

      case 'transcribe_audio':
        return await callN8nWebhook('audio', { ...args, userId })

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      toolName
    }
  }
}

/**
 * Call n8n webhook for complex operations
 */
async function callN8nWebhook(
  type: 'vision' | 'notion' | 'audio',
  payload: Record<string, unknown>
): Promise<unknown> {
  const webhookUrls = {
    vision: process.env.N8N_VISION_WEBHOOK_URL,
    notion: process.env.N8N_NOTION_WEBHOOK_URL,
    audio: process.env.N8N_AUDIO_WEBHOOK_URL
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
