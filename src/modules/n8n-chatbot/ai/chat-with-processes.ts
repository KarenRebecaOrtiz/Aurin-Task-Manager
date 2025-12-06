/**
 * Chat with Structured Processes
 *
 * Este archivo integra los procesos estructurados con el cliente OpenAI.
 * El flujo es:
 *
 * 1. Mensaje del usuario llega
 * 2. Se intenta manejar con procesos estructurados (ahorra tokens)
 * 3. Si ningún proceso matchea, se delega al LLM tradicional
 * 4. El LLM maneja casos complejos o ambiguos
 *
 * BENEFICIOS:
 * - Ahorro de tokens: ~70-90% en flujos comunes
 * - Respuestas más rápidas: No hay latencia de LLM
 * - Consistencia: Flujos predecibles y testeables
 * - Fallback inteligente: LLM para casos edge
 */

import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import { chat as originalChat, type ChatOptions, type ChatResponse } from './openai-client'
import {
  processMessage,
  initializeProcesses,
  getContext,
  clearContext,
  type ProcessResult
} from './processes'

// Inicializar procesos al cargar el módulo
let initialized = false

function ensureInitialized(): void {
  if (!initialized) {
    initializeProcesses()
    initialized = true
  }
}

export interface EnhancedChatOptions extends ChatOptions {
  /**
   * Session ID para mantener contexto entre mensajes
   */
  sessionId?: string

  /**
   * Si es true, solo usa procesos estructurados (no LLM)
   * Útil para testing o ahorro extremo de tokens
   */
  processesOnly?: boolean

  /**
   * Si es true, bypasa los procesos y usa solo LLM
   * Útil para debugging o casos especiales
   */
  skipProcesses?: boolean

  /**
   * Callback cuando un proceso maneja el mensaje
   */
  onProcessHandled?: (result: ProcessResult) => void

  /**
   * Callback cuando se delega al LLM
   */
  onLLMDelegated?: (reason: string) => void
}

export interface EnhancedChatResponse extends ChatResponse {
  /**
   * Indica si fue manejado por proceso o LLM
   */
  handledBy: 'process' | 'llm'

  /**
   * ID del proceso si fue manejado por uno
   */
  processId?: string

  /**
   * Métricas de ahorro de tokens (estimado)
   */
  metrics?: {
    tokensUsed: number
    estimatedTokensSaved: number
    durationMs: number
  }
}

/**
 * Chat mejorado con soporte para procesos estructurados
 *
 * @example
 * ```typescript
 * const response = await enhancedChat({
 *   userId: 'user123',
 *   sessionId: 'session456',
 *   message: 'Crear tarea de revisión para aurin',
 *   isAdmin: false
 * })
 *
 * if (response.handledBy === 'process') {
 *   console.log('Manejado por proceso:', response.processId)
 *   console.log('Tokens ahorrados:', response.metrics?.estimatedTokensSaved)
 * }
 * ```
 */
export async function enhancedChat(options: EnhancedChatOptions): Promise<EnhancedChatResponse> {
  const startTime = Date.now()
  ensureInitialized()

  const {
    userId,
    message,
    conversationHistory = [],
    userName,
    isAdmin = false,
    sessionId: providedSessionId,
    processesOnly = false,
    skipProcesses = false,
    onProcessHandled,
    onLLMDelegated,
    ...restOptions
  } = options

  // Usar sessionId proporcionado o generar uno
  const sessionId = providedSessionId || `session_${userId}_${Date.now()}`

  // Si skipProcesses está activo, ir directo al LLM
  if (skipProcesses) {
    onLLMDelegated?.('skipProcesses flag enabled')
    const llmResponse = await originalChat(options)
    return {
      ...llmResponse,
      handledBy: 'llm',
      metrics: {
        tokensUsed: estimateTokens(llmResponse.content),
        estimatedTokensSaved: 0,
        durationMs: Date.now() - startTime
      }
    }
  }

  // Intentar manejar con procesos estructurados
  try {
    const processResult = await processMessage({
      message,
      userId,
      sessionId,
      isAdmin,
      userName
    })

    if (processResult) {
      // Proceso manejó el mensaje
      onProcessHandled?.(processResult)

      // Convertir ProcessResult a ChatResponse format
      const response: EnhancedChatResponse = {
        content: processResult.response,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: message } as ChatCompletionMessageParam,
          { role: 'assistant', content: processResult.response } as ChatCompletionMessageParam
        ],
        handledBy: 'process',
        processId: processResult.processId,
        metrics: {
          tokensUsed: 0, // Procesos no usan tokens de LLM
          estimatedTokensSaved: estimateTokensSaved(message),
          durationMs: Date.now() - startTime
        }
      }

      return response
    }
  } catch (error) {
    console.warn('[Processes] Error en proceso, delegando a LLM:', error)
  }

  // Si processesOnly está activo y ningún proceso manejó, retornar mensaje genérico
  if (processesOnly) {
    return {
      content: 'No encontré un proceso que pueda manejar tu solicitud. Por favor, intenta ser más específico.',
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message } as ChatCompletionMessageParam
      ],
      handledBy: 'process',
      metrics: {
        tokensUsed: 0,
        estimatedTokensSaved: 0,
        durationMs: Date.now() - startTime
      }
    }
  }

  // Delegar al LLM tradicional
  onLLMDelegated?.('No matching process found')

  const llmResponse = await originalChat({
    ...restOptions,
    userId,
    message,
    conversationHistory,
    userName,
    isAdmin
  })

  return {
    ...llmResponse,
    handledBy: 'llm',
    metrics: {
      tokensUsed: estimateTokens(llmResponse.content),
      estimatedTokensSaved: 0,
      durationMs: Date.now() - startTime
    }
  }
}

/**
 * Limpia el contexto de una sesión
 */
export function clearSessionContext(sessionId: string): void {
  clearContext(sessionId)
}

/**
 * Verifica si hay un proceso activo para una sesión
 */
export function hasActiveProcess(sessionId: string): boolean {
  const context = getContext(sessionId)
  return context !== undefined && context.status !== 'completed' && context.status !== 'cancelled'
}

/**
 * Obtiene el estado del proceso activo
 */
export function getActiveProcessState(sessionId: string): {
  processId: string
  status: string
  awaitingInput: boolean
  awaitingConfirmation: boolean
} | null {
  const context = getContext(sessionId)
  if (!context) return null

  return {
    processId: context.processId,
    status: context.status,
    awaitingInput: context.awaitingInput,
    awaitingConfirmation: context.awaitingConfirmation
  }
}

/**
 * Estima tokens de un texto (aproximado)
 */
function estimateTokens(text: string): number {
  // Aproximación: ~4 caracteres por token en español
  return Math.ceil(text.length / 4)
}

/**
 * Estima tokens ahorrados al usar proceso en vez de LLM
 */
function estimateTokensSaved(message: string): number {
  // Estimación basada en:
  // - System prompt: ~2000 tokens
  // - Historial típico: ~500 tokens
  // - Mensaje: ~variable
  // - Respuesta: ~200 tokens
  // - Tool calls overhead: ~300 tokens
  const baseTokens = 2000 + 500 + estimateTokens(message) + 200 + 300
  return baseTokens
}

// Re-export tipos útiles
export type { ChatOptions, ChatResponse }
export type { ProcessResult }
