import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST() {
  try {
    console.log('🧹 Iniciando limpieza de notificaciones expiradas...');
    
    const now = new Date();
    const notificationsRef = collection(db, 'notifications');
    
    // Query para notificaciones expiradas
    const q = query(
      notificationsRef, 
      where('expiresAt', '<', now.toISOString())
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ No hay notificaciones expiradas para eliminar');
      return NextResponse.json({ 
        success: true, 
        deleted: 0,
        message: 'No hay notificaciones expiradas'
      });
    }

    // Usar batch para eliminar múltiples documentos eficientemente
    const batch = writeBatch(db);
    let deletedCount = 0;
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    
    console.log(`✅ ${deletedCount} notificaciones expiradas eliminadas`);
    
    return NextResponse.json({ 
      success: true, 
      deleted: deletedCount,
      message: `${deletedCount} notificaciones eliminadas`
    });
    
  } catch (error) {
    console.error('❌ Error limpiando notificaciones:', error);
    return NextResponse.json({ 
      error: 'Error limpiando notificaciones',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 