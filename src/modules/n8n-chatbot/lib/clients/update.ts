/**
 * Update client functionality
 */

import { db } from '@/lib/firebase-admin'

export interface UpdateClientData {
  name?: string
  company?: string
  email?: string
  notes?: string
}

export interface ClientUpdateResult {
  success: boolean
  message: string
  clientId: string
  updatedFields: string[]
}

/**
 * Update an existing client (only updates provided fields)
 */
export async function updateClient(
  clientId: string,
  data: UpdateClientData
): Promise<ClientUpdateResult> {
  try {
    // Validate client ID
    if (!clientId || clientId.trim().length === 0) {
      throw new Error('El ID del cliente es requerido')
    }

    // Check if at least one field is provided
    if (Object.keys(data).length === 0) {
      throw new Error('Debes proporcionar al menos un campo para actualizar')
    }

    // Get current client to verify it exists
    const docRef = db.collection('clients').doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      throw new Error(`No se encontró un cliente con ID: ${clientId}`)
    }

    // Prepare update data (only include provided fields)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    }

    const updatedFields: string[] = []

    if (data.name !== undefined && data.name.trim().length > 0) {
      updateData.name = data.name.trim()
      updatedFields.push('nombre')
    }

    if (data.company !== undefined) {
      updateData.company = data.company.trim() || null
      updatedFields.push('empresa')
    }

    if (data.email !== undefined) {
      updateData.email = data.email.trim() || null
      updatedFields.push('email')
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes.trim() || null
      updatedFields.push('notas')
    }

    // Update client in Firestore
    await docRef.update(updateData)

    const currentData = doc.data()
    const clientName = data.name || currentData?.name || 'Cliente'

    return {
      success: true,
      message: `Cliente "${clientName}" actualizado correctamente. Campos actualizados: ${updatedFields.join(', ')}`,
      clientId,
      updatedFields
    }
  } catch (error) {
    throw new Error(`Error al actualizar cliente: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
