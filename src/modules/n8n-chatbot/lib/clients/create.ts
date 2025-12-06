/**
 * Client creation functionality (simplified for chatbot)
 */

import { db } from '@/lib/firebase-admin'

export interface CreateClientData {
  name: string
  company?: string
  email?: string
  notes?: string
}

export interface ClientCreateResult {
  success: boolean
  message: string
  clientId: string
  clientName: string
}

/**
 * Create a new client (simplified - only name required)
 */
export async function createClient(
  data: CreateClientData
): Promise<ClientCreateResult> {
  try {
    // Validate required field
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('El nombre del cliente es requerido')
    }

    // Prepare client document
    const newClient = {
      name: data.name.trim(),
      company: data.company?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Mark as created by chatbot for tracking
      createdBy: 'chatbot'
    }

    // Create client in Firestore
    const docRef = await db.collection('clients').add(newClient)

    return {
      success: true,
      message: `Cliente "${data.name}" creado correctamente`,
      clientId: docRef.id,
      clientName: data.name
    }
  } catch (error) {
    throw new Error(`Error al crear cliente: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
