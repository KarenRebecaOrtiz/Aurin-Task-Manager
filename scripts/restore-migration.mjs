/**
 * 🔄 SCRIPT DE RESTAURACIÓN PARCIAL
 * 
 * Copia SOLO las colecciones afectadas por la migración:
 * - users
 * - tasks  
 * - clients
 * 
 * Desde: restored-dec9
 * Hacia: (default)
 * 
 * Ejecutar: node scripts/restore-migration.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

// Colecciones a restaurar
const COLLECTIONS_TO_RESTORE = ['users', 'tasks', 'clients'];

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

// Inicializar Firebase Admin
function initFirebase() {
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey) {
    throw new Error('GCP_PRIVATE_KEY no encontrada en .env.local');
  }

  const app = initializeApp({
    credential: cert({
      projectId: process.env.GCP_PROJECT_ID,
      clientEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
      privateKey: privateKey,
    }),
  });

  // Conectar a ambas bases de datos
  const defaultDb = getFirestore(app);
  const restoredDb = getFirestore(app, 'restored-dec9');

  return { defaultDb, restoredDb };
}

async function restoreCollection(sourceDb, targetDb, collectionName) {
  log('📁', `Restaurando colección: ${collectionName}`);
  
  try {
    // 1. Leer todos los documentos de la fuente (restored-dec9)
    const sourceSnapshot = await sourceDb.collection(collectionName).get();
    
    if (sourceSnapshot.empty) {
      log('⚪', `  Colección vacía en backup, saltando...`);
      return { restored: 0, deleted: 0 };
    }

    log('📊', `  ${sourceSnapshot.size} documentos encontrados en backup`);

    // 2. Eliminar todos los documentos actuales en target (default)
    const targetSnapshot = await targetDb.collection(collectionName).get();
    log('🗑️', `  Eliminando ${targetSnapshot.size} documentos actuales...`);
    
    const deleteBatch = targetDb.batch();
    let deleteCount = 0;
    
    for (const doc of targetSnapshot.docs) {
      deleteBatch.delete(doc.ref);
      deleteCount++;
      
      // Commit en batches de 400
      if (deleteCount % 400 === 0) {
        await deleteBatch.commit();
        log('💾', `    Eliminados ${deleteCount} documentos...`);
      }
    }
    
    if (deleteCount % 400 !== 0) {
      await deleteBatch.commit();
    }

    // 3. Copiar documentos del backup a default
    log('📥', `  Copiando ${sourceSnapshot.size} documentos del backup...`);
    
    const restoreBatch = targetDb.batch();
    let restoreCount = 0;
    
    for (const doc of sourceSnapshot.docs) {
      const targetRef = targetDb.collection(collectionName).doc(doc.id);
      restoreBatch.set(targetRef, doc.data());
      restoreCount++;
      
      // Commit en batches de 400
      if (restoreCount % 400 === 0) {
        await restoreBatch.commit();
        log('💾', `    Restaurados ${restoreCount} documentos...`);
      }
    }
    
    if (restoreCount % 400 !== 0) {
      await restoreBatch.commit();
    }

    log('✅', `  Completado: ${restoreCount} documentos restaurados\n`);
    
    return { restored: restoreCount, deleted: deleteCount };
    
  } catch (error) {
    log('❌', `  Error: ${error.message}\n`);
    return { restored: 0, deleted: 0, error: error.message };
  }
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 RESTAURACIÓN PARCIAL DE FIRESTORE                            ║');
  console.log('║  Desde: restored-dec9 → Hacia: (default)                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Colecciones a restaurar:');
  for (const col of COLLECTIONS_TO_RESTORE) {
    console.log(`   • ${col}`);
  }
  
  console.log('\n⚠️  ADVERTENCIA: Esto SOBRESCRIBIRÁ los datos actuales en estas colecciones.');
  
  const confirm = await askQuestion('\n¿Continuar? Escribe "RESTAURAR" para confirmar: ');
  
  if (confirm !== 'RESTAURAR') {
    console.log('\n❌ Restauración cancelada.\n');
    process.exit(0);
  }

  try {
    log('🔥', 'Conectando a Firestore...');
    const { defaultDb, restoredDb } = initFirebase();
    log('✅', 'Conectado a ambas bases de datos\n');

    const stats = {
      totalRestored: 0,
      totalDeleted: 0,
      errors: [],
    };

    for (const collectionName of COLLECTIONS_TO_RESTORE) {
      const result = await restoreCollection(restoredDb, defaultDb, collectionName);
      stats.totalRestored += result.restored;
      stats.totalDeleted += result.deleted;
      if (result.error) {
        stats.errors.push({ collection: collectionName, error: result.error });
      }
    }

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ RESTAURACIÓN COMPLETADA                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESUMEN');
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`   Documentos eliminados (migrados): ${stats.totalDeleted}`);
    console.log(`   Documentos restaurados (backup):  ${stats.totalRestored}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errores: ${stats.errors.length}`);
      for (const err of stats.errors) {
        console.log(`      - ${err.collection}: ${err.error}`);
      }
    }

    console.log('\n───────────────────────────────────────────────────────────────────');
    console.log('✅ Tus datos han sido restaurados al estado anterior a la migración.');
    console.log('   Ahora puedes usar tus keys de desarrollo de Clerk normalmente.');
    console.log('───────────────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
