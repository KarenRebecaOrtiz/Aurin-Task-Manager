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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to request deletion' }, { status: 500 });
  }
}