/**
 * Client by ID API Route
 *
 * GET /api/clients/[id] - Get a specific client
 * PUT /api/clients/[id] - Update a specific client (admin only)
 * DELETE /api/clients/[id] - Delete a specific client (admin only)
 *
 * Requires authentication for all operations
 * PUT and DELETE require admin role
 */

import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiNoContent, apiBadRequest, apiNotFound, apiForbidden, handleApiError } from '@/lib/api/response';
import { updateClientSchema } from '@/lib/validations/client.schema';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Helper to check if user is admin
 * Note: Uses 'access' field from Clerk publicMetadata (matching AuthContext)
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const access = user.publicMetadata?.access;
    console.log('[API] Checking admin status for user:', userId, 'Access:', access, 'PublicMetadata:', JSON.stringify(user.publicMetadata));
    return access === 'admin' || access === 'Admin';
  } catch (error) {
    console.error('[API] Error checking admin status:', error);
    return false;
  }
}

/**
 * Helper to get client by ID
 */
async function getClientById(clientId: string) {
  const adminDb = getAdminDb();
  const clientDoc = await adminDb.collection('clients').doc(clientId).get();

  if (!clientDoc.exists) {
    return null;
  }

  const data = clientDoc.data() as any;
  return {
    id: clientDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    lastModified: data.lastModified?.toDate?.() ? data.lastModified.toDate().toISOString() : undefined,
  };
}

/**
 * GET /api/clients/[id]
 *
 * Get a specific client by ID.
 * Available to all authenticated users.
 *
 * @param id - Client ID from URL
 * @returns 200 with client data or 404 if not found
 */
// @ts-expect-error - withAuth type inference issue
export const GET = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: clientId } = await context.params;
    console.log('[API] GET /api/clients/[id] - Fetching client:', clientId, 'for user:', userId);

    const client = await getClientById(clientId);

    if (!client) {
      return apiNotFound('Client');
    }

    console.log('[API] Client found:', clientId);
    return apiSuccess(client);
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/clients/[id]');
  }
});

/**
 * PUT /api/clients/[id]
 *
 * Update a specific client (admin only)
 *
 * @param id - Client ID from URL
 * @body Partial client fields
 * @returns 200 with updated client data
 */
// @ts-expect-error - withAuth type inference issue
export const PUT = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: clientId } = await context.params;
    console.log('[API] PUT /api/clients/[id] - Updating client:', clientId, 'by user:', userId);

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return apiForbidden('Only administrators can update clients');
    }

    // Get existing client
    const adminDb = getAdminDb();
    const existingClientDoc = await adminDb.collection('clients').doc(clientId).get();

    if (!existingClientDoc.exists) {
      return apiNotFound('Client');
    }

    const existingClient = existingClientDoc.data() as any;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateClientSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API] Validation failed:', validationResult.error.errors);
      return apiBadRequest('Invalid client data', validationResult.error.errors);
    }

    const updateData = validationResult.data;

    // Prepare updated client data
    const updatedClient: any = {
      ...existingClient,
      ...updateData,
      id: clientId,
      createdBy: existingClient.createdBy, // Preserve creator
      createdAt: existingClient.createdAt, // Preserve creation date
      lastModified: FieldValue.serverTimestamp(),
      lastModifiedBy: userId,
    };

    // Save updated client
    await adminDb.collection('clients').doc(clientId).set(updatedClient);

    console.log('[API] Client updated successfully:', clientId);

    // Return updated client with ISO date strings
    return apiSuccess({
      id: clientId,
      ...updatedClient,
      createdAt: updatedClient.createdAt?.toDate?.() ? updatedClient.createdAt.toDate().toISOString() : new Date().toISOString(),
      lastModified: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'PUT /api/clients/[id]');
  }
});

/**
 * DELETE /api/clients/[id]
 *
 * Delete a specific client (admin only)
 *
 * @param id - Client ID from URL
 * @returns 204 No Content on success
 */
// @ts-expect-error - withAuth type inference issue
export const DELETE = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: clientId } = await context.params;
    console.log('[API] DELETE /api/clients/[id] - Deleting client:', clientId, 'by user:', userId);

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return apiForbidden('Only administrators can delete clients');
    }

    // Get existing client
    const adminDb = getAdminDb();
    const existingClientDoc = await adminDb.collection('clients').doc(clientId).get();

    if (!existingClientDoc.exists) {
      return apiNotFound('Client');
    }

    // Delete client
    await adminDb.collection('clients').doc(clientId).delete();

    console.log('[API] Client deleted successfully:', clientId);
    return apiNoContent();
  } catch (error: unknown) {
    return handleApiError(error, 'DELETE /api/clients/[id]');
  }
});
