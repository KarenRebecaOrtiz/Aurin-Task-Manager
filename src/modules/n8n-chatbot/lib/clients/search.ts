/**
 * Client search functionality with fuzzy matching
 */

import { db } from '@/lib/firebase-admin'

export interface ClientSearchResult {
  success: boolean
  clients: Array<{
    id: string
    name: string
    company?: string
    email?: string
  }>
  totalFound: number
  message?: string
}

/**
 * Search clients by name (partial match, case-insensitive)
 */
export async function searchClients(
  query: string,
  limit: number = 5
): Promise<ClientSearchResult> {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error('Query de búsqueda es requerido')
    }

    const normalizedQuery = query.toLowerCase().trim()

    // Get all clients (Firestore doesn't support native fuzzy search)
    const clientsSnapshot = await db.collection('clients').get()

    // Filter and score clients based on name similarity
    const scoredClients = clientsSnapshot.docs
      .map(doc => {
        const data = doc.data()
        const name = (data.name || '').toLowerCase()
        const company = (data.company || '').toLowerCase()

        // Calculate relevance score
        let score = 0

        // Exact match (highest priority)
        if (name === normalizedQuery) {
          score = 100
        }
        // Starts with query
        else if (name.startsWith(normalizedQuery)) {
          score = 80
        }
        // Contains query
        else if (name.includes(normalizedQuery)) {
          score = 60
        }
        // Company contains query
        else if (company.includes(normalizedQuery)) {
          score = 40
        }
        // Fuzzy match - check if query words are in name
        else {
          const queryWords = normalizedQuery.split(/\s+/)
          const nameWords = name.split(/\s+/)
          const matchingWords = queryWords.filter(qw =>
            nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
          )
          if (matchingWords.length > 0) {
            score = 20 + (matchingWords.length / queryWords.length) * 20
          }
        }

        return {
          id: doc.id,
          name: data.name || '',
          company: data.company,
          email: data.email,
          score
        }
      })
      .filter(client => client.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // Remove score from final result and add explicit ID label
    const clients = scoredClients.map(({ score: _score, ...client }) => ({
      ...client,
      // Duplicate ID in a more explicit field for LLM clarity
      clientId: client.id
    }))

    if (clients.length === 0) {
      return {
        success: true,
        clients: [],
        totalFound: 0,
        message: `No se encontraron clientes con "${query}". ¿Deseas crear uno nuevo?`
      }
    }

    // Build a clear message for the LLM showing the ID explicitly
    const clientList = clients.map(c => 
      `- "${c.name}" (ID: ${c.id}${c.email ? `, Email: ${c.email}` : ''})`
    ).join('\n')

    return {
      success: true,
      clients,
      totalFound: clients.length,
      message: clients.length === 1
        ? `Encontré el cliente "${clients[0].name}" con ID: ${clients[0].id}. USA ESTE ID para crear la tarea.`
        : `Encontré ${clients.length} clientes:\n${clientList}\n\nUSA EL CAMPO "id" del cliente seleccionado como clientId para crear la tarea.`
    }
  } catch (error) {
    throw new Error(`Error al buscar clientes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
