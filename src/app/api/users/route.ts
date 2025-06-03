import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      limit: 500,
      orderBy: '-created_at',
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}