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
  getTeamWorkload,
  getProjectHours,
  getUserTasks
} from '../lib/analytics'
import { getUsersInfo } from '../lib/users/get-users'

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
  userId: string
): Promise<unknown> {
  const { name: toolName, arguments: argsString } = toolCall.function
  const args = JSON.parse(argsString)

  try {
    switch (toolName) {
      // Task management
      case 'search_tasks':
        return await searchTasks(userId, args)

      case 'create_task':
        return await createTask(userId, args)

      case 'update_task':
        return await updateTask(userId, args.taskId, args)

      case 'archive_task':
        return await archiveTask(userId, args.taskId)

      // Analytics
      case 'get_team_workload':
        return await getTeamWorkload(args)

      case 'get_project_hours':
        return await getProjectHours(args)

      case 'get_user_tasks':
        return await getUserTasks(args.userId, args)

      // User information
      case 'get_users_info':
        return await getUsersInfo(args.userIds)

      // n8n integrations
      case 'analyze_document':
        return await callN8nWebhook('vision', { ...args, userId })

      case 'create_notion_plan':
        return await callN8nWebhook('notion', { ...args, userId })

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
  type: 'vision' | 'notion',
  payload: Record<string, unknown>
): Promise<unknown> {
  const webhookUrls = {
    vision: process.env.N8N_VISION_WEBHOOK_URL,
    notion: process.env.N8N_NOTION_WEBHOOK_URL
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
