/**
 * Get client by ID
 */

import { db } from '@/lib/firebase-admin'

export interface ClientData {
  id: string
  name: string
  company?: string | null
  email?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface GetClientResult {
  success: boolean
  client?: ClientData
  message?: string
}

/**
 * Get a specific client by ID
 */
export async function getClient(
  clientId: string
): Promise<GetClientResult> {
  try {
    if (!clientId || clientId.trim().length === 0) {
      throw new Error('El ID del cliente es requerido')
    }

    const docRef = db.collection('clients').doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return {
        success: false,
        message: `No se encontró un cliente con ID: ${clientId}`
      }
    }

    const data = doc.data()
    const client: ClientData = {
      id: doc.id,
      name: data?.name || '',
      company: data?.company || null,
      email: data?.email || null,
      notes: data?.notes || null,
      createdAt: data?.createdAt || '',
      updatedAt: data?.updatedAt || ''
    }

    return {
      success: true,
      client,
      message: `Cliente "${client.name}" encontrado`
    }
  } catch (error) {
    throw new Error(`Error al obtener cliente: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
