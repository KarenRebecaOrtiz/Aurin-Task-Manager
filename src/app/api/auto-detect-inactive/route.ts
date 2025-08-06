import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  // DEPRECATED: Esta API ha sido deprecada
  // La funcionalidad de detección de inactividad se movió a client-side usando RTDB
  // RTDB maneja automáticamente la desconexión cuando el usuario cierra pestañas/navegador
  
  return NextResponse.json({ 
    success: false, 
    message: 'DEPRECATED: Auto-detect functionality moved to client-side using RTDB',
    deprecated: true,
    reason: 'Vercel serverless does not support cron jobs. RTDB onDisconnect handles this automatically.'
  }, { status: 410 }); // 410 Gone
} 