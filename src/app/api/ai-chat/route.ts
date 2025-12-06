import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { enhancedChat } from '@/modules/n8n-chatbot/ai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  message: string
  sessionId: string
  conversationHistory?: ChatCompletionMessageParam[]
  fileUrl?: string
}

/**
 * API Route: /api/ai-chat
 *
 * Enhanced chatbot endpoint with structured processes
 * - Uses structured processes for common flows (saves tokens)
 * - Falls back to OpenAI function calling for complex queries
 * - Manages tasks, analytics, and queries locally
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get user info for personalization and admin status
    let userName = 'Usuario'
    let isAdmin = false
    try {
      const clerk = await clerkClient()
      const user = await clerk.users.getUser(userId)
      userName = user.firstName || user.username || 'Usuario'
      isAdmin = user.publicMetadata?.access === 'admin'
    } catch (error) {
      console.warn('Could not fetch user info:', error)
    }

    // Parse request
    const body: ChatRequest = await request.json()
    const { message, sessionId, conversationHistory = [], fileUrl } = body

    if (!message) {
      return NextResponse.json(
        { error: 'El mensaje es requerido' },
        { status: 400 }
      )
    }

    // If fileUrl is provided, inject it into the message context
    const enrichedMessage = fileUrl
      ? `${message}\n\n[Archivo adjunto: ${fileUrl}]`
      : message

    // Call enhanced chat (uses processes first, then LLM)
    const response = await enhancedChat({
      userId,
      sessionId,
      message: enrichedMessage,
      conversationHistory,
      userName,
      isAdmin,
      timezone: 'America/Mexico_City'
    })

    return NextResponse.json({
      output: response.content,
      sessionId,
      timestamp: new Date().toISOString(),
      conversationHistory: response.conversationHistory,
      handledBy: response.handledBy, // 'process' or 'llm'
      processId: response.processId, // Which process handled it (if any)
      toolCalls: response.toolCalls // For debugging
    })

  } catch (error) {
    console.error('Error in /api/ai-chat:', error)

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
