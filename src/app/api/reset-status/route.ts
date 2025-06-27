import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Verificar que sea una llamada autorizada (puedes agregar autenticación aquí)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Aquí puedes verificar el token si es necesario

    // Obtener todos los usuarios
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);

    const updatePromises = querySnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const now = new Date();
      
      // Verificar si el usuario está inactivo (más de 5 minutos sin actividad)
      const lastOnlineAt = userData.lastOnlineAt ? new Date(userData.lastOnlineAt) : null;
      const isInactive = lastOnlineAt && (now.getTime() - lastOnlineAt.getTime()) > 5 * 60 * 1000; // 5 minutos
      
      // Si está inactivo y no está ya marcado como "Fuera", marcarlo como offline
      if (isInactive && userData.status !== 'Fuera') {
        return updateDoc(doc(db, 'users', userDoc.id), {
          status: 'Fuera',
          lastOnlineAt: lastOnlineAt?.toISOString()
        });
      }
      
      // Si el estado es "Fuera" y es después de las 12am, resetear a "Disponible"
      if (userData.status === 'Fuera') {
        const lastReset = userData.lastStatusReset ? new Date(userData.lastStatusReset) : null;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastResetDate = lastReset ? new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate()) : null;

        if (!lastResetDate || today > lastResetDate) {
          // Resetear a "Disponible" y actualizar timestamp
          return updateDoc(doc(db, 'users', userDoc.id), {
            status: 'Disponible',
            lastStatusReset: now.toISOString()
          });
        }
      }
      
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      success: true, 
      message: `Status reset completed for ${querySnapshot.docs.length} users` 
    });

  } catch (error) {
    console.error('Error resetting user statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 