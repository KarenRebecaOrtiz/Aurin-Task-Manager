import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  // DEPRECATED: Esta API ha sido deprecada
  // La funcionalidad de reset de estado se movió a client-side usando RTDB
  // El hook useAvailabilityStatus maneja automáticamente el reset de día
  
  return NextResponse.json({ 
    success: false, 
    message: 'DEPRECATED: Status reset functionality moved to client-side using RTDB',
    deprecated: true,
    reason: 'Vercel serverless does not support cron jobs. Client-side hooks handle day resets automatically.'
  }, { status: 410 }); // 410 Gone
} 