/**
 * API Route: Validate share token and return plan data
 * GET /api/plans/[planId]/validate?token=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { isTokenExpired } from '@/modules/shared-plan/lib/token-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token requerido' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const taskRef = db.collection('tasks').doc(planId)
    const taskDoc = await taskRef.get()

    if (!taskDoc.exists) {
      return NextResponse.json(
        { valid: false, error: 'Plan no encontrado' },
        { status: 404 }
      )
    }

    const taskData = taskDoc.data()

    // Check if public sharing is enabled
    if (!taskData?.publicShareEnabled) {
      return NextResponse.json(
        { valid: false, error: 'Este plan no está compartido públicamente' },
        { status: 403 }
      )
    }

    // Validate token
    if (taskData.publicShareToken !== token) {
      return NextResponse.json(
        { valid: false, error: 'Token inválido' },
        { status: 403 }
      )
    }

    // Check if token is expired
    const expired = isTokenExpired(
      taskData.publicShareExpiresAt,
      taskData.publicShareFirstAccessedAt
    )

    if (expired) {
      return NextResponse.json(
        { valid: false, expired: true, error: 'Este enlace ha expirado' },
        { status: 403 }
      )
    }

    // Mark first access if not already accessed
    const isFirstAccess = !taskData.publicShareFirstAccessedAt
    if (isFirstAccess) {
      await taskRef.update({
        publicShareFirstAccessedAt: new Date().toISOString()
      })
    }

    // Get client data
    let clientName = ''
    if (taskData.clientId) {
      const clientDoc = await db.collection('clients').doc(taskData.clientId).get()
      if (clientDoc.exists) {
        clientName = clientDoc.data()?.name || ''
      }
    }

    // Get involved users data
    const involvedUserIds = [
      taskData.CreatedBy,
      ...(taskData.AssignedTo || []),
      ...(taskData.LeadedBy || [])
    ].filter(Boolean)

    const uniqueUserIds = [...new Set(involvedUserIds)]
    const involvedUsers = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const userDoc = await db.collection('users').doc(userId).get()
        if (userDoc.exists) {
          const userData = userDoc.data()
          return {
            id: userId,
            fullName: userData?.fullName || userData?.displayName || 'Usuario',
            imageUrl: userData?.profilePhoto || '/placeholder-avatar.png',
            role: userData?.role || ''
          }
        }
        return null
      })
    )

    const validUsers = involvedUsers.filter(Boolean)

    // Return plan data
    return NextResponse.json({
      valid: true,
      expired: false,
      firstAccess: isFirstAccess,
      plan: {
        id: planId,
        name: taskData.name,
        description: taskData.description || '',
        clientName,
        status: taskData.status,
        priority: taskData.priority || 'Media',
        startDate: taskData.startDate?.toDate?.()?.toISOString() || null,
        endDate: taskData.endDate?.toDate?.()?.toISOString() || null,
        createdAt: taskData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        involvedUsers: validUsers,
        publicShareCreatedAt: taskData.publicShareCreatedAt,
        publicShareExpiresAt: taskData.publicShareExpiresAt
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error validating share token:', error)
    return NextResponse.json(
      { valid: false, error: 'Error al validar el token' },
      { status: 500 }
    )
  }
}
