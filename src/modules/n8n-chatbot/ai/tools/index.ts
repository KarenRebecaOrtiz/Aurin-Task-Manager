/**
 * Export all AI tools for OpenAI function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

// Task management tools
export * from './tasks'
export * from './analytics'
export * from './users'
export * from './clients'
export * from './n8n-integrations'

import {
  searchTasksTool,
  createTaskTool,
  updateTaskTool,
  archiveTaskTool
} from './tasks'

import {
  getTeamWorkloadTool,
  getProjectHoursTool,
  getUserTasksTool
} from './analytics'

import {
  searchUsersTool,
  getUsersInfoTool
} from './users'

import {
  searchClientsTool,
  createClientTool
} from './clients'

import {
  analyzeDocumentTool,
  createNotionPlanTool
} from './n8n-integrations'

/**
 * All available tools for the AI agent
 */
export const allTools: ChatCompletionTool[] = [
  // Client management (search first before creating tasks)
  searchClientsTool,
  createClientTool,

  // Task management
  searchTasksTool,
  createTaskTool,
  updateTaskTool,
  archiveTaskTool,

  // Analytics
  getTeamWorkloadTool,
  getProjectHoursTool,
  getUserTasksTool,

  // User information
  searchUsersTool,
  getUsersInfoTool,

  // n8n integrations
  analyzeDocumentTool,
  createNotionPlanTool
]

/**
 * Tool groups for conditional loading
 */
export const toolGroups = {
  clients: [searchClientsTool, createClientTool],
  tasks: [searchTasksTool, createTaskTool, updateTaskTool, archiveTaskTool],
  analytics: [getTeamWorkloadTool, getProjectHoursTool, getUserTasksTool],
  users: [searchUsersTool, getUsersInfoTool],
  integrations: [analyzeDocumentTool, createNotionPlanTool]
}
