import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface N8nChatRequest {
  message: string
  sessionId: string
  fileUrl?: string
}

interface N8nResponse {
  output?: string
  response?: string
  error?: string
}

/**
 * API Route: /api/n8n-chatbot
 *
 * Este endpoint actúa como proxy entre el chatbot frontend y n8n.
 * N8n manejará:
 * - Conexión con ChatGPT
 * - Lectura/escritura en Firestore
 * - Creación y edición de tareas
 * - Consultas sobre tareas existentes
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener datos del request
    const body: N8nChatRequest = await request.json()
    const { message, sessionId, fileUrl } = body

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Mensaje y sessionId son requeridos' },
        { status: 400 }
      )
    }

    // Obtener URL del webhook de n8n desde variables de entorno
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL no está configurada en las variables de entorno')
      return NextResponse.json(
        { error: 'Configuración del chatbot no encontrada' },
        { status: 500 }
      )
    }

    // Preparar payload para n8n
    const n8nPayload = {
      userId,
      message,
      sessionId,
      fileUrl,
      timestamp: new Date().toISOString()
    }

    // Llamar al webhook de n8n
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('Error desde n8n:', errorText)
      return NextResponse.json(
        { error: 'Error al procesar la solicitud en n8n' },
        { status: 500 }
      )
    }

    // Obtener respuesta de n8n
    const n8nData: N8nResponse = await n8nResponse.json()

    // Retornar respuesta del chatbot
    return NextResponse.json({
      output: n8nData.output || n8nData.response,
      sessionId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en /api/n8n-chatbot:', error)

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
