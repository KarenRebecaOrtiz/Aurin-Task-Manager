/**
 * API Route: Get comments for a shared plan
 * GET /api/plans/[planId]/comments?token=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

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
        { error: 'Token requerido' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    
    // Validate token first
    const taskDoc = await db.collection('tasks').doc(planId).get()
    if (!taskDoc.exists || taskDoc.data()?.publicShareToken !== token) {
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      )
    }

    // Get comments
    const commentsSnapshot = await db
      .collection('tasks')
      .doc(planId)
      .collection('publicComments')
      .orderBy('createdAt', 'asc')
      .get()

    const comments = commentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    }))

    return NextResponse.json({ comments })
  } catch {
    return NextResponse.json(
      { error: 'Error al obtener comentarios' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/plans/[planId]/comments?token=xxx
 * Create a new comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { message, authorName, authorType = 'client', authorId } = body

    if (!message || !authorName) {
      return NextResponse.json(
        { error: 'Mensaje y nombre del autor son requeridos' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    
    // Validate token
    const taskDoc = await db.collection('tasks').doc(planId).get()
    if (!taskDoc.exists || taskDoc.data()?.publicShareToken !== token) {
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      )
    }

    // Create comment
    const commentRef = db
      .collection('tasks')
      .doc(planId)
      .collection('publicComments')
      .doc()

    const commentData = {
      taskId: planId,
      authorName,
      authorType,
      authorId: authorId || null,
      message,
      createdAt: new Date(),
      attachments: []
    }

    await commentRef.set(commentData)

    // Update task's last activity
    await db.collection('tasks').doc(planId).update({
      lastActivity: new Date(),
      hasUnreadUpdates: true
    })

    return NextResponse.json({
      success: true,
      comment: {
        id: commentRef.id,
        ...commentData,
        createdAt: commentData.createdAt.toISOString()
      }
    })
  } catch {
    return NextResponse.json(
      { error: 'Error al crear comentario' },
      { status: 500 }
    )
  }
}
