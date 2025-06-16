// app/api/users/route.ts
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Ensure Clerk client is properly initialized
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      limit: 500,
      orderBy: '-created_at',
    });
    console.log('[API] Successfully fetched users:', { count: data.length });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    console.error('[API] Error fetching users:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}