import { NextResponse } from 'next/server';
import { initializeUnreadUpdates } from '@/lib/taskUtils';

export async function POST() {
  try {
    await initializeUnreadUpdates();
    return NextResponse.json({ success: true, message: 'Unread updates initialized' });
  } catch (error) {
    console.error('[API] Error initializing unread updates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize unread updates' },
      { status: 500 }
    );
  }
} 