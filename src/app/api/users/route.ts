/**
 * Users API Route
 *
 * GET /api/users - Fetch all users from Clerk
 * Requires authentication
 */

import { clerkClient } from '@clerk/nextjs/server';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, handleApiError } from '@/lib/api/response';

// @ts-expect-error - withAuth type inference issue with multiple return types
export const GET = withAuth(async (userId) => {
  try {
    console.log('[API] Fetching users for authenticated user:', userId);

    // Initialize Clerk client
    const client = await clerkClient();

    // Fetch users with error handling
    const response = await client.users.getUserList({
      limit: 500,
      orderBy: '-created_at',
    });

    console.log('[API] Successfully fetched users:', {
      count: response.data?.length || 0,
      totalCount: response.totalCount,
    });

    return apiSuccess(response.data || []);
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/users');
  }
});