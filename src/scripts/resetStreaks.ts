import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

/**
 * Script para resetear streaks incorrectos
 * Ejecutar desde la consola del navegador en desarrollo
 */
export const resetStreaks = async () => {
  try {
    console.log('🔄 Iniciando reset de streaks...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let updatedCount = 0;
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Verificar si tiene datos de streak
      if (userData.currentStreak !== undefined || userData.lastAccessDate !== undefined) {
        console.log(`📊 Usuario ${userId}:`, {
          currentStreak: userData.currentStreak,
          lastAccessDate: userData.lastAccessDate,
          longestStreak: userData.longestStreak,
          totalAccessDays: userData.totalAccessDays
        });
        
        // Resetear a valores por defecto
        await updateDoc(doc(db, 'users', userId), {
          currentStreak: 0,
          longestStreak: 0,
          lastAccessDate: null,
          totalAccessDays: 0
        });
        
        updatedCount++;
        console.log(`✅ Usuario ${userId} reseteado`);
      }
    }
    
    console.log(`🎉 Reset completado. ${updatedCount} usuarios actualizados.`);
    
  } catch (error) {
    console.error('❌ Error en reset de streaks:', error);
  }
};

// Para ejecutar desde la consola del navegador:
// import { resetStreaks } from '@/scripts/resetStreaks';
// resetStreaks(); 