import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, role, description, onboardingCompleted, currentStep } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const client = await clerkClient();
    const metadata: { publicMetadata: { role?: string; description?: string; onboardingCompleted?: boolean; currentStep?: number } } = {
      publicMetadata: {},
    };

    if (role) metadata.publicMetadata.role = role;
    if (description) metadata.publicMetadata.description = description;
    if (typeof onboardingCompleted === 'boolean') {
      metadata.publicMetadata.onboardingCompleted = onboardingCompleted;
    }
    if (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5) {
      metadata.publicMetadata.currentStep = currentStep;
    }

    await client.users.updateUserMetadata(userId, metadata);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update metadata' }, { status: 500 });
  }
}