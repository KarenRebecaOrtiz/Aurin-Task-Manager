import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, fullName } = await req.json();
    if (!userId || !fullName) {
      return NextResponse.json({ error: 'Missing userId or fullName' }, { status: 400 });
    }
    // Placeholder: Simular solicitud de eliminación
    console.log(`Simulating deletion request for user ${fullName} (${userId}) to admin email: karen@example.com`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to request deletion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}