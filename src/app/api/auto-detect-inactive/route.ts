import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebase } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verificar que es una llamada autorizada (puedes agregar un token secreto aquí)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Inicializar Firebase Admin
    await initializeFirebase();
    const adminDb = getFirestore();

    console.log('[Auto-Detect] Starting automatic inactive user detection...');
    
    // Obtener solo usuarios que podrían estar inactivos (más eficiente)
    const usersRef = adminDb.collection('users');
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Query más eficiente: solo usuarios sin lastOnlineAt o con lastOnlineAt antiguo
    const snapshot = await usersRef
      .where('lastOnlineAt', '<', fiveMinutesAgo.toISOString())
      .get();
    
    // También obtener usuarios sin lastOnlineAt
    const usersWithoutLastOnlineAt = await usersRef
      .where('lastOnlineAt', '==', null)
      .get();
    
    let inactiveCount = 0;
    const updatePromises: Promise<FirebaseFirestore.WriteResult>[] = [];

    // Procesar usuarios con lastOnlineAt antiguo
    snapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.status !== 'Fuera') {
        inactiveCount++;
        updatePromises.push(
          doc.ref.update({
            status: 'Fuera'
          })
        );
      }
    });

    // Procesar usuarios sin lastOnlineAt
    usersWithoutLastOnlineAt.forEach((doc) => {
      const userData = doc.data();
      if (userData.status !== 'Fuera') {
        inactiveCount++;
        updatePromises.push(
          doc.ref.update({
            status: 'Fuera',
            lastOnlineAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
          })
        );
      }
    });

    // Ejecutar todas las actualizaciones en batch (más eficiente)
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`[Auto-Detect] Marked ${inactiveCount} users as inactive`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Automatically detected and marked ${inactiveCount} inactive users as offline`,
      inactiveCount
    });

  } catch (error) {
    console.error('[Auto-Detect] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 