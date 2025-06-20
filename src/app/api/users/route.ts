// app/api/users/route.ts
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Check if user is authenticated
    const { userId } = await auth();
    if (!userId) {
      console.error('[API] Unauthorized access to users endpoint');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      totalCount: response.totalCount 
    });

    return NextResponse.json(response.data || []);
  } catch (error: unknown) {
    console.error('[API] Detailed error fetching users:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('CLERK_SECRET_KEY')) {
        return NextResponse.json({ error: 'Clerk configuration error' }, { status: 500 });
      }
      if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}