/**
 * @file plan-orchestrator.ts
 * @description Orquesta la creación de planes compartibles públicamente con tokens seguros.
 * 
 * NUEVA ARQUITECTURA (sin Baserow):
 * - Habilita sharing público en la tarea existente en Firestore
 * - Genera token seguro único
 * - Crea link público: /share/plan/{taskId}?token={secureToken}
 * - El cliente ve detalles y puede comentar
 * - Comentarios aislados en subcollection: tasks/{id}/publicComments
 * - No requiere Baserow - todo en Firestore
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Tipos para la respuesta de las herramientas que usaremos
interface Task {
  id: string
  name: string
  description?: string
  objectives?: string
  clientId?: string
  clientName?: string
  status?: string
  priority?: string
  startDate?: any
  endDate?: any
  AssignedTo?: string[]
  LeadedBy?: string[]
  [key: string]: any
}

interface WebSearchResult {
  response: string
  [key: string]: any
}

// Helper para obtener nombres de usuarios
/* eslint-disable no-console */
async function getUserNames(userIds: string[]): Promise<string> {
  if (!userIds || userIds.length === 0) return ''

  try {
    const { getAdminDb } = await import('@/lib/firebase-admin')
    const db = getAdminDb()

    const names = await Promise.all(
      userIds.map(async (userId) => {
        const userDoc = await db.collection('users').doc(userId).get()
        if (userDoc.exists) {
          const userData = userDoc.data()
          return userData?.fullName || userData?.firstName || null
        }
        return null // No mostrar el ID si el usuario no existe
      })
    )

    // Filtrar valores null (usuarios no encontrados) y unir con coma
    return names.filter(Boolean).join(', ')
  } catch (error) {
    console.error('[Orchestrator] Error getting user names:', error)
    return ''
  }
}

/**
 * Orquesta la creación de un plan de trabajo compartible públicamente.
 *
 * Este orchestrator:
 * 1. Busca la tarea en Firestore
 * 2. Obtiene información del cliente y usuarios involucrados
 * 3. Genera token seguro para compartir
 * 4. Habilita sharing público en la tarea
 * 5. Retorna link seguro para compartir con el cliente
 *
 * @param subject El nombre de la tarea a compartir
 * @param userId El ID del usuario que solicita el plan
 * @param modes Modos activos desde la UI (webSearch si está habilitado)
 * @returns El link público seguro y detalles del plan
 */
/* eslint-disable no-console */
export async function orchestratePlanCreation(
  subject: string,
  userId: string,
  modes?: {
    webSearch?: boolean
    audioMode?: boolean
    canvasMode?: boolean
  }
): Promise<unknown> {
  console.log(`[Orchestrator] Iniciando creación de plan para: "${subject}"`)

  // Importación dinámica para romper el ciclo de dependencias
  const { executeTool } = (await import(
    '../tool-executor'
  )) as typeof import('../tool-executor')

  // --- PASO 1: Recopilar información interna de Firestore ---
  let mainTask: Task | null = null
  let clientName = ''
  
  try {
    const tasksResult = (await executeTool(
      {
        type: 'function',
        id: 'search-task-for-plan',
        function: {
          name: 'search_tasks',
          arguments: JSON.stringify({ name: subject, limit: 1 }),
        },
      },
      userId,
      false,
      modes
    )) as { success: boolean; tasks?: Task[]; totalFound?: number }

    if (tasksResult.success && tasksResult.tasks && tasksResult.tasks.length > 0) {
      mainTask = tasksResult.tasks[0]
      console.log(`[Orchestrator] Tarea encontrada: ${mainTask.name}`)
      console.log(`[Orchestrator] Datos completos:`, mainTask)
      
      // Obtener el nombre del cliente si existe clientId
      if (mainTask.clientId) {
        try {
          const clientResult = (await executeTool(
            {
              type: 'function',
              id: 'get-client-for-plan',
              function: {
                name: 'get_client',
                arguments: JSON.stringify({ clientId: mainTask.clientId }),
              },
            },
            userId,
            false,
            modes
          )) as { success: boolean; client?: { name: string } }
          
          if (clientResult.success && clientResult.client) {
            clientName = clientResult.client.name
            console.log(`[Orchestrator] Cliente encontrado: ${clientName}`)
          }
        } catch (error) {
          console.warn('[Orchestrator] No se pudo obtener el cliente:', error)
        }
      }
    } else {
      console.log(`[Orchestrator] No se encontró la tarea "${subject}" para el usuario`)
    }
  } catch (error) {
    console.warn('[Orchestrator] No se pudo buscar la tarea:', error)
  }

  // --- PASO 2: Web search SOLO si el usuario lo activó desde la UI ---
  if (modes?.webSearch) {
    try {
      console.log('[Orchestrator] Web search activado por usuario, buscando información...')
      const webSearchResult = (await executeTool(
        {
          type: 'function',
          id: 'web-search-for-plan',
          function: {
            name: 'web_search',
            arguments: JSON.stringify({
              query: `mejores prácticas y estrategias para: ${subject}`,
            }),
          },
        },
        userId,
        false,
        modes
      )) as WebSearchResult

      // Contexto web obtenido para referencia futura
      console.log('[Orchestrator] Contexto web obtenido:', webSearchResult.response.substring(0, 100))
    } catch (error) {
      console.warn('[Orchestrator] No se pudo obtener contexto web:', error)
    }
  } else {
    console.log('[Orchestrator] Web search desactivado - usando solo datos de Firestore')
  }

  // --- PASO 3: Obtener nombres de involucrados (CreatedBy, AssignedTo, LeadedBy) ---
  const allInvolvedIds = [
    mainTask?.CreatedBy || '',
    ...(mainTask?.AssignedTo || []),
    ...(mainTask?.LeadedBy || []),
  ].filter(Boolean) // Remover valores vacíos

  const uniqueInvolvedIds = [...new Set(allInvolvedIds)]
  const involucradosText = await getUserNames(uniqueInvolvedIds)

  // --- PASO 4: Habilitar compartir público y generar token ---
  try {
    const { generateShareToken, getTokenExpiration } = await import(
      '@/modules/shared-plan/lib/token-generator'
    )
    
    const shareToken = generateShareToken()
    const expiresAt = getTokenExpiration(168) // 7 days
    
    const { getAdminDb } = await import('@/lib/firebase-admin')
    const db = getAdminDb()
    
    if (!mainTask?.id) {
      return {
        success: false,
        error: 'No se encontró la tarea para compartir',
        message: 'No se pudo encontrar la tarea. Por favor intenta de nuevo.'
      }
    }

    // Update task with public sharing enabled
    await db.collection('tasks').doc(mainTask.id).update({
      publicShareEnabled: true,
      publicShareToken: shareToken,
      publicShareCreatedAt: new Date().toISOString(),
      publicShareExpiresAt: expiresAt.toISOString(),
      publicShareFirstAccessedAt: null
    })
    
    // Generate public share link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const shareLink = `${baseUrl}/share/plan/${mainTask.id}?token=${shareToken}`
    
    return {
      success: true,
      taskId: mainTask.id,
      taskName: mainTask.name,
      clientName,
      shareLink,
      expiresIn: '7 días',
      message: `✅ Plan "${mainTask.name}" compartido exitosamente`,
      instructions: [
        '📤 Comparte este enlace con tu cliente',
        '⏰ El enlace expira en 7 días desde el primer acceso',
        '👀 El cliente puede ver todos los detalles del plan',
        '💬 El cliente puede comentar y hacer preguntas',
        '🔔 Recibirás notificaciones cuando haya nuevos comentarios',
      ],
      details: {
        plan: mainTask.name,
        cliente: clientName || 'No especificado',
        prioridad: mainTask.priority || 'Media',
        estado: mainTask.status,
        involucrados: involucradosText || 'No especificado'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'Error al generar enlace de compartir',
      details: error instanceof Error ? error.message : String(error),
      message: 'Ocurrió un error al intentar compartir el plan. Por favor intenta de nuevo.'
    }
  }
}
