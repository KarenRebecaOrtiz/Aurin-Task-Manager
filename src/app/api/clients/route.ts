/**
 * Clients API Route
 *
 * POST /api/clients - Create a new client (admin only)
 * GET /api/clients - List all clients
 *
 * Requires authentication for all operations
 */

import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiCreated, apiBadRequest, apiForbidden, handleApiError } from '@/lib/api/response';
import { createClientSchema, clientQuerySchema } from '@/lib/validations/client.schema';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Helper to check if user is admin
 * Note: Uses 'access' field from Clerk publicMetadata (matching AuthContext)
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata?.access === 'admin' || user.publicMetadata?.access === 'Admin';
  } catch (error) {
    console.error('[API] Error checking admin status:', error);
    return false;
  }
}

/**
 * POST /api/clients
 *
 * Create a new client (admin only)
 *
 * @body name - Client name (required)
 * @body email - Contact email (optional)
 * @body phone - Contact phone (optional)
 * @body address - Fiscal address (optional)
 * @body industry - Industry type (optional)
 * @body website - Website URL (optional)
 * @body taxId - RFC/Tax ID (optional)
 * @body notes - Additional notes (optional)
 * @body imageUrl - Client logo URL (optional)
 * @body projects - Array of project names (optional)
 *
 * @returns 201 with created client data
 */
// @ts-expect-error - withAuth type inference issue
export const POST = withAuth(async (userId, request: NextRequest) => {
  try {
    console.log('[API] POST /api/clients - Creating client for user:', userId);

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return apiForbidden('Only administrators can create clients');
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('[API] Request body:', JSON.stringify(body, null, 2));

    const validationResult = createClientSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API] Validation failed:', JSON.stringify(validationResult.error.errors, null, 2));
      return apiBadRequest('Invalid client data', validationResult.error.errors);
    }

    const clientData = validationResult.data;

    // Create client document with generated ID
    const adminDb = getAdminDb();
    const clientDocRef = adminDb.collection('clients').doc();
    const clientId = clientDocRef.id;

    const clientToSave = {
      ...clientData,
      id: clientId,
      createdBy: userId,
      createdAt: FieldValue.serverTimestamp(),
      lastModified: FieldValue.serverTimestamp(),
      lastModifiedBy: userId,
      imageUrl: clientData.imageUrl || '/empty-image.png',
      projects: clientData.projects || [],
      isActive: clientData.isActive ?? true,
    };

    // Save to Firestore
    console.log('[API] Saving client to Firestore with Admin SDK');
    await clientDocRef.set(clientToSave);
    console.log('[API] Client saved successfully');

    console.log('[API] Client created successfully:', clientId);

    return apiCreated(
      {
        id: clientId,
        ...clientToSave,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      `/api/clients/${clientId}`
    );
  } catch (error: unknown) {
    console.error('[API] Error in POST /api/clients:', error);
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    return handleApiError(error, 'POST /api/clients');
  }
});

/**
 * GET /api/clients
 *
 * List all clients (with optional filters)
 *
 * @query isActive - Filter by active status (optional)
 * @query industry - Filter by industry (optional)
 * @query limit - Max number of results (default: 50, max: 100)
 * @query offset - Number of results to skip (default: 0)
 *
 * @returns 200 with array of clients
 */
// @ts-expect-error - withAuth type inference issue
export const GET = withAuth(async (userId, request: NextRequest) => {
  try {
    console.log('[API] GET /api/clients - Fetching clients for user:', userId);

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      industry: searchParams.get('industry') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const validationResult = clientQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      console.error('[API] Query validation failed:', validationResult.error.errors);
      return apiBadRequest('Invalid query parameters', validationResult.error.errors);
    }

    const { isActive, industry, limit, offset } = validationResult.data;

    // Build Firestore Admin query
    const adminDb = getAdminDb();
    let clientsQuery = adminDb.collection('clients')
      .orderBy('createdAt', 'desc')
      .limit(limit + offset);

    // Apply filters if provided
    if (isActive !== undefined) {
      clientsQuery = clientsQuery.where('isActive', '==', isActive) as any;
    }
    if (industry) {
      clientsQuery = clientsQuery.where('industry', '==', industry) as any;
    }

    // Execute query
    const snapshot = await clientsQuery.get();

    // Convert to array and apply offset
    const clients = snapshot.docs
      .slice(offset)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamps to ISO strings for JSON
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          lastModified: data.lastModified?.toDate?.() ? data.lastModified.toDate().toISOString() : undefined,
        };
      });

    console.log('[API] Found clients:', clients.length);

    return apiSuccess({
      clients,
      total: snapshot.size,
      limit,
      offset,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/clients');
  }
});
