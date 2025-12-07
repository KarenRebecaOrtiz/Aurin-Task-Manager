/**
 * OpenAI client wrapper for chatbot
 * Handles conversation flow with function calling
 */

import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool
} from 'openai/resources/chat/completions'
import { getSystemPrompt, type SystemPromptContext } from './system-prompt'
import { allTools } from './tools'
import { executeTool } from './tool-executor'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ChatOptions {
  userId: string
  message: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
  conversationHistory?: ChatCompletionMessageParam[]
  userName?: string
  isAdmin?: boolean
  timezone?: string
  tools?: ChatCompletionTool[]
  maxIterations?: number
  modes?: {
    webSearch?: boolean
    audioMode?: boolean
    canvasMode?: boolean
  }
}

export interface ChatResponse {
  content: string
  toolCalls?: Array<{
    toolName: string
    result: unknown
  }>
  conversationHistory: ChatCompletionMessageParam[]
}

/**
 * Main chat function with OpenAI
 * Handles multi-turn conversations with tool calling
 */
export async function chat(options: ChatOptions): Promise<ChatResponse> {
  const {
    userId,
    message,
    conversationHistory = [],
    userName,
    isAdmin = false,
    timezone,
    tools = allTools,
    maxIterations = 5,
    modes = {}
  } = options

  // Build system prompt
  const systemPromptContext: SystemPromptContext = {
    userId,
    userName,
    isAdmin,
    timezone,
    modes
  }

  // Initialize messages
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: getSystemPrompt(systemPromptContext)
    },
    ...conversationHistory,
    {
      role: 'user',
      content: message // Can be string or vision content array
    }
  ]

  // Tool call tracking
  const toolCallsExecuted: Array<{ toolName: string; result: unknown }> = []
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 2048
    })

    const assistantMessage = response.choices[0].message

    // Add assistant message to history
    messages.push(assistantMessage)

    // If no tool calls, we're done
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return {
        content: assistantMessage.content || '',
        toolCalls: toolCallsExecuted,
        conversationHistory: messages.slice(1) // Remove system message
      }
    }

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      // Skip tool calls that don't have a function property
      if (!('function' in toolCall)) continue
      
      const result = await executeTool(toolCall, userId, isAdmin)

      // Track tool execution
      toolCallsExecuted.push({
        toolName: toolCall.function.name,
        result
      })

      // Add tool result to messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      })
    }

    // Continue loop to let AI process tool results
  }

  // If we hit max iterations, return last message
  const lastMessage = messages[messages.length - 1]
  const fallbackMessage = 'Lo siento, alcancé el límite de iteraciones.'
  let responseContent = fallbackMessage
  
  if (lastMessage.role === 'assistant' && 'content' in lastMessage) {
    const content = lastMessage.content
    if (typeof content === 'string') {
      responseContent = content || fallbackMessage
    }
  }
  
  return {
    content: responseContent,
    toolCalls: toolCallsExecuted,
    conversationHistory: messages.slice(1) // Remove system message
  }
}
