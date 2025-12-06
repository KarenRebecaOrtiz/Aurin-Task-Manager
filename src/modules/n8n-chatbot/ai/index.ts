/**
 * AI module exports
 * OpenAI client, tools, system prompts, and structured processes
 */

// Original chat (LLM only)
export { chat, type ChatOptions, type ChatResponse } from './openai-client'

// Enhanced chat with structured processes (RECOMMENDED)
export {
  enhancedChat,
  clearSessionContext,
  hasActiveProcess,
  getActiveProcessState,
  type EnhancedChatOptions,
  type EnhancedChatResponse
} from './chat-with-processes'

// Tool execution
export { executeTool } from './tool-executor'

// System prompts
export { getSystemPrompt, type SystemPromptContext } from './system-prompt'

// Tools
export { allTools, toolGroups } from './tools'

// Structured Processes
export {
  initializeProcesses,
  processMessage,
  registerProcess,
  getProcess,
  getAllProcesses,
  getProcessStats,
  // Individual processes
  taskCreationProcess,
  taskQueryProcess,
  workloadQueryProcess,
  taskUpdateProcess,
  taskArchiveProcess,
  // Types
  type ProcessDefinition,
  type ProcessContext,
  type ProcessResult,
  type ProcessStep,
  type ProcessSlot,
  type ProcessTrigger
} from './processes'
