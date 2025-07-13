import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, metadata } = await request.json();

    if (!userId || !metadata) {
      return NextResponse.json(
        { error: 'Missing userId or metadata' },
        { status: 400 }
      );
    }

    // Update user metadata in Clerk
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: metadata,
    });

    console.log('[API] Updated Clerk metadata for user:', userId, metadata);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating Clerk metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update metadata' },
      { status: 500 }
    );
  }
} 