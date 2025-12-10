/**
 * 🚀 SCRIPT DE MIGRACIÓN CLERK DEV → PROD + FIRESTORE
 * 
 * FASE 1: Crear usuarios en Clerk Producción
 * FASE 2: Guardar mapeo de IDs en archivo JSON
 * FASE 3: Actualizar referencias en Firestore
 * 
 * ⚠️  ANTES DE EJECUTAR:
 * 1. Asegúrate de tener backup de Firestore (ya lo tienes ✅)
 * 2. Ten a la mano tu CLERK_SECRET_KEY de PRODUCCIÓN
 * 
 * Ejecutar: node scripts/migrate-clerk-users.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import readline from 'readline';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// ============================================
// CONFIGURACIÓN
// ============================================
const CSV_PATH = './ins_2xnJaCmfW1NGB9RokEHztmOqf9N.csv';
const MAPPING_FILE = './clerk-id-mapping.json';

// 🔴 CLERK PRODUCCIÓN - Necesitas proporcionar esta key
const CLERK_PROD_SECRET_KEY = process.env.CLERK_PROD_SECRET_KEY || null;

// Colecciones a actualizar en Firestore
const COLLECTIONS_CONFIG = {
  tasks: {
    stringFields: ['CreatedBy', 'archivedBy', 'updatedBy'],
    arrayFields: ['AssignedTo', 'LeadedBy'],
    objectKeyFields: ['lastViewedBy'], // { user_xxx: timestamp }
  },
  users: {
    stringFields: ['userId'],
    arrayFields: [],
    objectKeyFields: [],
    // Nota: También hay que mover el documento a un nuevo ID
    requiresDocIdChange: true,
  },
  clients: {
    stringFields: ['createdBy'],
    arrayFields: [],
    objectKeyFields: [],
  },
};

// ============================================
// HELPERS
// ============================================
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

// ============================================
// INICIALIZAR FIREBASE ADMIN
// ============================================
function initFirebase() {
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey) {
    throw new Error('GCP_PRIVATE_KEY no encontrada en .env.local');
  }

  initializeApp({
    credential: cert({
      projectId: process.env.GCP_PROJECT_ID,
      clientEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
      privateKey: privateKey,
    }),
  });

  return getFirestore();
}

// ============================================
// LEER CSV DE USUARIOS
// ============================================
function readUsersCSV() {
  log('📄', `Leyendo CSV: ${CSV_PATH}`);
  
  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  log('✓', `${records.length} usuarios encontrados en CSV\n`);
  
  return records.map(record => ({
    devClerkId: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    username: record.username,
    email: record.primary_email_address,
    passwordDigest: record.password_digest,
    passwordHasher: record.password_hasher,
  }));
}

// ============================================
// FASE 1: CREAR USUARIOS EN CLERK PRODUCCIÓN
// ============================================
async function createUsersInClerkProd(users, clerkSecretKey) {
  log('🚀', 'FASE 1: Creando usuarios en Clerk Producción...\n');
  
  const mapping = {};
  const errors = [];
  
  for (const user of users) {
    try {
      log('👤', `Creando: ${user.firstName} ${user.lastName} (${user.email})`);
      
      const response = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: [user.email],
          first_name: user.firstName,
          last_name: user.lastName,
          username: user.username,
          // Importar con el mismo password hash
          password_digest: user.passwordDigest,
          password_hasher: user.passwordHasher,
          // Marcar email como verificado ya que viene de dev
          skip_password_checks: true,
          skip_password_requirement: true,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Si el usuario ya existe, intentamos obtener su ID
        if (data.errors?.[0]?.code === 'form_identifier_exists') {
          log('⚠️', `  Usuario ya existe, buscando ID existente...`);
          
          // Buscar usuario por email
          const searchResponse = await fetch(
            `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(user.email)}`,
            {
              headers: {
                'Authorization': `Bearer ${clerkSecretKey}`,
              },
            }
          );
          const searchData = await searchResponse.json();
          
          if (searchData.length > 0) {
            const existingUser = searchData[0];
            mapping[user.devClerkId] = {
              prodClerkId: existingUser.id,
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
              status: 'already_existed',
            };
            log('✓', `  Encontrado: ${existingUser.id}\n`);
            continue;
          }
        }
        
        throw new Error(JSON.stringify(data.errors || data));
      }

      mapping[user.devClerkId] = {
        prodClerkId: data.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        status: 'created',
      };
      
      log('✓', `  Creado: ${data.id}\n`);
      
      // Pequeña pausa para no saturar la API
      await new Promise(r => setTimeout(r, 200));
      
    } catch (error) {
      log('❌', `  Error: ${error.message}\n`);
      errors.push({
        user: user.email,
        error: error.message,
      });
    }
  }

  return { mapping, errors };
}

// ============================================
// FASE 2: GUARDAR MAPEO
// ============================================
function saveMappingToFile(mapping) {
  log('💾', 'FASE 2: Guardando mapeo de IDs...\n');
  
  const mappingData = {
    generatedAt: new Date().toISOString(),
    totalUsers: Object.keys(mapping).length,
    mapping: mapping,
  };

  writeFileSync(MAPPING_FILE, JSON.stringify(mappingData, null, 2));
  log('✓', `Mapeo guardado en: ${MAPPING_FILE}\n`);
  
  // Mostrar tabla de mapeo
  console.log('┌─────────────────────────────────────┬─────────────────────────────────────┬────────────────────┐');
  console.log('│ Dev ID                              │ Prod ID                             │ Status             │');
  console.log('├─────────────────────────────────────┼─────────────────────────────────────┼────────────────────┤');
  
  for (const [devId, info] of Object.entries(mapping)) {
    const devIdShort = devId.substring(0, 35).padEnd(35);
    const prodIdShort = info.prodClerkId.substring(0, 35).padEnd(35);
    const status = info.status.padEnd(18);
    console.log(`│ ${devIdShort} │ ${prodIdShort} │ ${status} │`);
  }
  
  console.log('└─────────────────────────────────────┴─────────────────────────────────────┴────────────────────┘\n');
  
  return mappingData;
}

// ============================================
// FASE 3: ACTUALIZAR FIRESTORE
// ============================================
async function updateFirestore(db, mapping) {
  log('🔥', 'FASE 3: Actualizando Firestore...\n');
  
  const stats = {
    collectionsProcessed: 0,
    documentsUpdated: 0,
    documentsCreated: 0,
    documentsDeleted: 0,
    errors: [],
  };

  for (const [collectionName, config] of Object.entries(COLLECTIONS_CONFIG)) {
    log('📁', `Procesando colección: ${collectionName}`);
    
    try {
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        log('⚪', `  Colección vacía, saltando...\n`);
        continue;
      }

      const batch = db.batch();
      let batchCount = 0;
      const MAX_BATCH = 400; // Firestore límite es 500, dejamos margen

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const updates = {};
        let hasUpdates = false;

        // Actualizar campos string
        for (const field of config.stringFields || []) {
          if (data[field] && mapping[data[field]]) {
            updates[field] = mapping[data[field]].prodClerkId;
            hasUpdates = true;
          }
        }

        // Actualizar campos array
        for (const field of config.arrayFields || []) {
          if (Array.isArray(data[field])) {
            const newArray = data[field].map(id => 
              mapping[id] ? mapping[id].prodClerkId : id
            );
            if (JSON.stringify(newArray) !== JSON.stringify(data[field])) {
              updates[field] = newArray;
              hasUpdates = true;
            }
          }
        }

        // Actualizar campos objeto (keys son user IDs)
        for (const field of config.objectKeyFields || []) {
          if (data[field] && typeof data[field] === 'object') {
            const newObj = {};
            let objChanged = false;
            
            for (const [key, value] of Object.entries(data[field])) {
              if (mapping[key]) {
                newObj[mapping[key].prodClerkId] = value;
                objChanged = true;
              } else {
                newObj[key] = value;
              }
            }
            
            if (objChanged) {
              updates[field] = newObj;
              hasUpdates = true;
            }
          }
        }

        // Caso especial: colección users necesita mover el documento
        if (config.requiresDocIdChange && mapping[doc.id]) {
          const newDocId = mapping[doc.id].prodClerkId;
          const newDocRef = db.collection(collectionName).doc(newDocId);
          const oldDocRef = db.collection(collectionName).doc(doc.id);
          
          // Crear nuevo documento con nuevo ID
          const newData = { ...data, ...updates };
          batch.set(newDocRef, newData);
          batchCount++;
          stats.documentsCreated++;
          
          // Marcar viejo documento para eliminar
          batch.delete(oldDocRef);
          batchCount++;
          stats.documentsDeleted++;
          
          log('🔄', `  Moviendo doc ${doc.id.substring(0, 20)}... → ${newDocId.substring(0, 20)}...`);
        } else if (hasUpdates) {
          // Actualizar documento existente
          batch.update(doc.ref, updates);
          batchCount++;
          stats.documentsUpdated++;
        }

        // Commit batch si está cerca del límite
        if (batchCount >= MAX_BATCH) {
          await batch.commit();
          log('💾', `  Batch committed (${batchCount} operaciones)`);
          batchCount = 0;
        }
      }

      // Commit batch restante
      if (batchCount > 0) {
        await batch.commit();
        log('💾', `  Batch final committed (${batchCount} operaciones)`);
      }

      stats.collectionsProcessed++;
      log('✓', `  Completado\n`);

    } catch (error) {
      log('❌', `  Error: ${error.message}\n`);
      stats.errors.push({
        collection: collectionName,
        error: error.message,
      });
    }
  }

  return stats;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 MIGRACIÓN CLERK DEV → PROD + FIRESTORE                       ║');
  console.log('║  ⚠️  Este script MODIFICARÁ datos en producción                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Verificar si ya existe un mapeo previo
    if (existsSync(MAPPING_FILE)) {
      log('📋', `Se encontró mapeo existente: ${MAPPING_FILE}`);
      const skipClerk = await askQuestion('\n¿Saltar FASE 1 (Clerk) y usar mapeo existente? (s/n): ');
      
      if (skipClerk.toLowerCase() === 's') {
        const existingMapping = JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'));
        log('✓', `Usando mapeo existente con ${existingMapping.totalUsers} usuarios\n`);
        
        // Solo hacer FASE 3
        log('🔥', 'Conectando a Firestore...');
        const db = initFirebase();
        log('✓', 'Conectado\n');
        
        const firestoreStats = await updateFirestore(db, existingMapping.mapping);
        
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN FINAL');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`   Colecciones procesadas:  ${firestoreStats.collectionsProcessed}`);
        console.log(`   Documentos actualizados: ${firestoreStats.documentsUpdated}`);
        console.log(`   Documentos creados:      ${firestoreStats.documentsCreated}`);
        console.log(`   Documentos eliminados:   ${firestoreStats.documentsDeleted}`);
        console.log(`   Errores:                 ${firestoreStats.errors.length}`);
        console.log('═══════════════════════════════════════════════════════════════════\n');
        
        return;
      }
    }

    // Solicitar API Key de producción
    let clerkKey = CLERK_PROD_SECRET_KEY;
    if (!clerkKey) {
      console.log('\n📝 Necesito tu CLERK_SECRET_KEY de PRODUCCIÓN');
      console.log('   (La encuentras en: Clerk Dashboard → Configure → API Keys)\n');
      clerkKey = await askQuestion('CLERK_SECRET_KEY de PROD (sk_live_...): ');
    }

    if (!clerkKey || !clerkKey.startsWith('sk_live_')) {
      console.log('\n❌ La key debe empezar con "sk_live_" (producción)');
      console.log('   Si quieres probar primero con dev, usa "sk_test_"\n');
      process.exit(1);
    }

    // Confirmación final
    console.log('\n⚠️  CONFIRMACIÓN REQUERIDA');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Este script va a:');
    console.log('  1. Crear 14 usuarios en tu instancia de Clerk PRODUCCIÓN');
    console.log('  2. Actualizar ~172 documentos en Firestore');
    console.log('');
    console.log('Tienes backup automático de hoy: 2025-12-09T17:34:46Z');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    
    const confirm = await askQuestion('¿Continuar? Escribe "MIGRAR" para confirmar: ');
    
    if (confirm !== 'MIGRAR') {
      console.log('\n❌ Migración cancelada.\n');
      process.exit(0);
    }

    // ========== FASE 1 ==========
    const users = readUsersCSV();
    const { mapping, errors: clerkErrors } = await createUsersInClerkProd(users, clerkKey);

    if (Object.keys(mapping).length === 0) {
      console.log('\n❌ No se pudieron crear usuarios. Abortando.\n');
      process.exit(1);
    }

    // ========== FASE 2 ==========
    saveMappingToFile(mapping);

    // Confirmar antes de FASE 3
    const continueFirestore = await askQuestion('¿Continuar con FASE 3 (actualizar Firestore)? (s/n): ');
    
    if (continueFirestore.toLowerCase() !== 's') {
      console.log('\n⏸️  Migración pausada. Puedes continuar después ejecutando el script de nuevo.\n');
      console.log(`   El mapeo está guardado en: ${MAPPING_FILE}\n`);
      process.exit(0);
    }

    // ========== FASE 3 ==========
    log('🔥', 'Conectando a Firestore...');
    const db = initFirebase();
    log('✓', 'Conectado\n');

    const firestoreStats = await updateFirestore(db, mapping);

    // ========== RESUMEN FINAL ==========
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRACIÓN COMPLETADA                                         ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESUMEN');
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`   Usuarios migrados a Clerk Prod:  ${Object.keys(mapping).length}`);
    console.log(`   Colecciones procesadas:          ${firestoreStats.collectionsProcessed}`);
    console.log(`   Documentos actualizados:         ${firestoreStats.documentsUpdated}`);
    console.log(`   Documentos creados:              ${firestoreStats.documentsCreated}`);
    console.log(`   Documentos eliminados:           ${firestoreStats.documentsDeleted}`);
    
    if (clerkErrors.length > 0) {
      console.log(`\n⚠️  Errores en Clerk: ${clerkErrors.length}`);
      for (const err of clerkErrors) {
        console.log(`      - ${err.user}: ${err.error}`);
      }
    }
    
    if (firestoreStats.errors.length > 0) {
      console.log(`\n⚠️  Errores en Firestore: ${firestoreStats.errors.length}`);
      for (const err of firestoreStats.errors) {
        console.log(`      - ${err.collection}: ${err.error}`);
      }
    }

    console.log('\n───────────────────────────────────────────────────────────────────');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Actualiza tu .env.local con las credenciales de Clerk PROD');
    console.log('   2. Prueba el login en tu app');
    console.log('   3. Verifica que las tareas y clientes muestren los usuarios correctos');
    console.log('───────────────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
