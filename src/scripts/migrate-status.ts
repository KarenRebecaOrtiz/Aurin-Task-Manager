import { collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function migrateLastManualStatus() {
  try {
    console.log('🚀 Iniciando migración de lastManualStatus...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let updatedCount = 0;
    const updatePromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      if (!data.lastManualStatus) {
        await updateDoc(doc.ref, { 
          lastManualStatus: data.status || 'Disponible' 
        });
        updatedCount++;
        console.log(`✅ Usuario ${doc.id} actualizado con lastManualStatus: ${data.status || 'Disponible'}`);
      }
    });
    
    await Promise.all(updatePromises);
    console.log(`🎉 Migración completada. ${updatedCount} usuarios actualizados.`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Ejecutar migración
migrateLastManualStatus(); 