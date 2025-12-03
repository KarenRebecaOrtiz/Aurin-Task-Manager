/**
 * User information retrieval
 */

import { db } from '@/lib/firebase-admin'

export interface UserInfo {
  id: string
  email: string
  displayName: string
  photoURL?: string
  access: 'admin' | 'user'
  status?: 'online' | 'offline' | 'away' | 'busy'
}

export interface GetUsersResult {
  success: boolean
  users: UserInfo[]
  notFound?: string[]
}

export async function getUsersInfo(userIds: string[]): Promise<GetUsersResult> {
  try {
    if (!userIds || userIds.length === 0) {
      return {
        success: true,
        users: [],
        notFound: []
      }
    }

    const users: UserInfo[] = []
    const notFound: string[] = []

    // Firestore has a limit of 10 items for 'in' queries, so we batch
    const batchSize = 10
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize)

      const snapshot = await db.collection('users')
        .where('__name__', 'in', batch)
        .get()

      const foundIds = new Set<string>()

      snapshot.docs.forEach(doc => {
        foundIds.add(doc.id)
        const data = doc.data()
        users.push({
          id: doc.id,
          email: data.email || '',
          displayName: data.displayName || 'Usuario Sin Nombre',
          photoURL: data.photoURL,
          access: data.access || 'user',
          status: data.status
        })
      })

      // Track not found users in this batch
      batch.forEach(userId => {
        if (!foundIds.has(userId)) {
          notFound.push(userId)
        }
      })
    }

    return {
      success: true,
      users,
      notFound: notFound.length > 0 ? notFound : undefined
    }
  } catch (error) {
    console.error('Error getting users info:', error)
    throw new Error(`Error al obtener información de usuarios: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
