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

export interface SearchUsersParams {
  query?: string
  role?: 'admin' | 'user' | 'viewer'
  limit?: number
}

export interface SearchUsersResult {
  success: boolean
  users: UserInfo[]
  total: number
  message?: string
}

/**
 * Busca usuarios por nombre, email o rol
 * IMPORTANTE: Trae todos los usuarios primero y luego filtra para búsqueda parcial
 */
export async function searchUsers(params: SearchUsersParams = {}): Promise<SearchUsersResult> {
  try {
    const { query, role, limit = 10 } = params

    // Traemos un límite alto para poder filtrar en memoria
    // Firestore no soporta búsqueda parcial (LIKE), así que filtramos después
    let usersQuery = db.collection('users').limit(100)

    // Filtrar por rol si se especifica (esto sí se puede hacer en Firestore)
    if (role) {
      usersQuery = usersQuery.where('access', '==', role)
    }

    const snapshot = await usersQuery.get()

    let users: UserInfo[] = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || data.fullName || 'Usuario Sin Nombre',
        photoURL: data.profilePhoto || data.photoURL,
        access: data.access || 'user',
        status: data.status
      }
    })

    // Filtrar por query (nombre o email) - búsqueda parcial case insensitive
    if (query) {
      const queryLower = query.toLowerCase().trim()
      
      // Dividir el query en palabras para búsqueda flexible
      const queryWords = queryLower.split(/\s+/)
      
      users = users.filter(user => {
        const displayNameLower = user.displayName.toLowerCase()
        const emailLower = user.email.toLowerCase()
        
        // Buscar si CUALQUIER palabra del query coincide con nombre o email
        return queryWords.some(word => 
          displayNameLower.includes(word) || emailLower.includes(word)
        )
      })
      
      // Ordenar por relevancia: coincidencias exactas primero
      users.sort((a, b) => {
        const aExact = a.displayName.toLowerCase().startsWith(queryLower) ? 0 : 1
        const bExact = b.displayName.toLowerCase().startsWith(queryLower) ? 0 : 1
        return aExact - bExact
      })
    }

    // Aplicar límite después del filtrado
    const limitedUsers = users.slice(0, limit)

    return {
      success: true,
      users: limitedUsers,
      total: limitedUsers.length,
      message: limitedUsers.length === 0 
        ? `No se encontraron usuarios${query ? ` con "${query}"` : ''}`
        : `Se encontraron ${limitedUsers.length} usuario(s)`
    }
  } catch (error) {
    console.error('Error searching users:', error)
    throw new Error(`Error al buscar usuarios: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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
