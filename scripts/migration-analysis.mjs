/**
 * 🔍 SCRIPT DE ANÁLISIS DE MIGRACIÓN - SOLO LECTURA
 * 
 * Este script NO modifica nada. Solo:
 * 1. Lee el CSV de usuarios exportados de Clerk dev
 * 2. Lee las colecciones de Firestore
 * 3. Genera un reporte de qué referencias a user_id existen
 * 
 * Ejecutar: node scripts/migration-analysis.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// ============================================
// CONFIGURACIÓN
// ============================================
const CSV_PATH = './ins_2xnJaCmfW1NGB9RokEHztmOqf9N.csv';
const REPORT_OUTPUT = './migration-report.json';
const REPORT_READABLE = './migration-report.txt';

// Colecciones a analizar en Firestore
const COLLECTIONS_TO_ANALYZE = [
  'tasks',
  'users', 
  'clients',
  'projects',
  'notifications',
  'comments',
  'timeEntries',
  'activityLogs'
];

// Campos que típicamente contienen user_id de Clerk
const USER_ID_FIELDS = [
  'CreatedBy',
  'createdBy', 
  'AssignedTo',
  'assignedTo',
  'LeadedBy',
  'leadedBy',
  'userId',
  'user_id',
  'ownerId',
  'owner',
  'memberId',
  'memberIds',
  'archivedBy',
  'lastViewedBy',
  'updatedBy'
];

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
  console.log(`\n📄 Leyendo CSV: ${CSV_PATH}`);
  
  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`   ✓ ${records.length} usuarios encontrados en CSV\n`);
  
  return records.map(record => ({
    clerkId: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    username: record.username,
    email: record.primary_email_address,
  }));
}

// ============================================
// ANALIZAR UNA COLECCIÓN
// ============================================
async function analyzeCollection(db, collectionName, devUserIds) {
  const results = {
    collectionName,
    totalDocs: 0,
    docsWithUserRefs: 0,
    fieldBreakdown: {},
    sampleDocs: [],
  };

  try {
    const snapshot = await db.collection(collectionName).get();
    results.totalDocs = snapshot.size;

    if (snapshot.empty) {
      console.log(`   ⚪ ${collectionName}: vacía`);
      return results;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      let docHasUserRef = false;
      const docUserRefs = [];

      // Buscar campos que contienen user IDs
      for (const field of USER_ID_FIELDS) {
        if (data[field]) {
          const value = data[field];
          
          // Puede ser string, array u objeto
          if (typeof value === 'string' && devUserIds.includes(value)) {
            docHasUserRef = true;
            docUserRefs.push({ field, value, type: 'string' });
            results.fieldBreakdown[field] = (results.fieldBreakdown[field] || 0) + 1;
          } 
          else if (Array.isArray(value)) {
            const matchingIds = value.filter(v => devUserIds.includes(v));
            if (matchingIds.length > 0) {
              docHasUserRef = true;
              docUserRefs.push({ field, value: matchingIds, type: 'array' });
              results.fieldBreakdown[field] = (results.fieldBreakdown[field] || matchingIds.length);
            }
          }
          else if (typeof value === 'object' && value !== null) {
            // Para objetos como lastViewedBy: { user_xxx: timestamp }
            const matchingKeys = Object.keys(value).filter(k => devUserIds.includes(k));
            if (matchingKeys.length > 0) {
              docHasUserRef = true;
              docUserRefs.push({ field, value: matchingKeys, type: 'object-keys' });
              results.fieldBreakdown[field] = (results.fieldBreakdown[field] || 0) + matchingKeys.length;
            }
          }
        }
      }

      // También revisar si el ID del documento es un user ID
      if (devUserIds.includes(doc.id)) {
        docHasUserRef = true;
        docUserRefs.push({ field: '_documentId_', value: doc.id, type: 'doc-id' });
        results.fieldBreakdown['_documentId_'] = (results.fieldBreakdown['_documentId_'] || 0) + 1;
      }

      if (docHasUserRef) {
        results.docsWithUserRefs++;
        // Guardar muestra de los primeros 3 docs
        if (results.sampleDocs.length < 3) {
          results.sampleDocs.push({
            docId: doc.id,
            userRefs: docUserRefs,
          });
        }
      }
    });

    const emoji = results.docsWithUserRefs > 0 ? '🔴' : '🟢';
    console.log(`   ${emoji} ${collectionName}: ${results.docsWithUserRefs}/${results.totalDocs} docs con referencias a usuarios dev`);

  } catch (error) {
    console.log(`   ❌ ${collectionName}: Error - ${error.message}`);
    results.error = error.message;
  }

  return results;
}

// ============================================
// GENERAR REPORTE
// ============================================
function generateReport(users, analysisResults) {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalDevUsers: users.length,
      collectionsAnalyzed: analysisResults.length,
      collectionsWithRefs: analysisResults.filter(r => r.docsWithUserRefs > 0).length,
      totalDocsToMigrate: analysisResults.reduce((sum, r) => sum + r.docsWithUserRefs, 0),
    },
    devUsers: users,
    collections: analysisResults,
  };

  // Guardar JSON
  writeFileSync(REPORT_OUTPUT, JSON.stringify(report, null, 2));
  console.log(`\n📊 Reporte JSON guardado en: ${REPORT_OUTPUT}`);

  // Generar versión legible
  let readable = `
╔══════════════════════════════════════════════════════════════════╗
║           REPORTE DE ANÁLISIS DE MIGRACIÓN                       ║
║           Generado: ${new Date().toLocaleString()}                        
╚══════════════════════════════════════════════════════════════════╝

📋 RESUMEN
───────────────────────────────────────────────────────────────────
• Usuarios en Development (CSV):     ${report.summary.totalDevUsers}
• Colecciones analizadas:            ${report.summary.collectionsAnalyzed}
• Colecciones CON referencias:       ${report.summary.collectionsWithRefs}
• Total documentos a migrar:         ${report.summary.totalDocsToMigrate}

👥 USUARIOS DE DEVELOPMENT
───────────────────────────────────────────────────────────────────
`;

  for (const user of users) {
    readable += `• ${user.firstName} ${user.lastName} (${user.email})\n`;
    readable += `  ID: ${user.clerkId}\n\n`;
  }

  readable += `
📁 DETALLE POR COLECCIÓN
───────────────────────────────────────────────────────────────────
`;

  for (const col of analysisResults) {
    if (col.error) {
      readable += `\n❌ ${col.collectionName}: ERROR - ${col.error}\n`;
      continue;
    }

    const status = col.docsWithUserRefs > 0 ? '⚠️  REQUIERE MIGRACIÓN' : '✅ Sin cambios necesarios';
    readable += `\n${col.collectionName} (${col.totalDocs} docs) - ${status}\n`;
    
    if (col.docsWithUserRefs > 0) {
      readable += `   Documentos afectados: ${col.docsWithUserRefs}\n`;
      readable += `   Campos con referencias:\n`;
      for (const [field, count] of Object.entries(col.fieldBreakdown)) {
        readable += `      • ${field}: ${count} referencias\n`;
      }
      
      if (col.sampleDocs.length > 0) {
        readable += `   Ejemplos:\n`;
        for (const sample of col.sampleDocs) {
          readable += `      Doc ID: ${sample.docId}\n`;
          for (const ref of sample.userRefs) {
            readable += `         - ${ref.field}: ${JSON.stringify(ref.value)} (${ref.type})\n`;
          }
        }
      }
    }
  }

  readable += `
═══════════════════════════════════════════════════════════════════
                    FIN DEL REPORTE
═══════════════════════════════════════════════════════════════════

⚠️  PRÓXIMOS PASOS (si decides continuar):
1. Revisa este reporte cuidadosamente
2. Haz un BACKUP de tu Firestore antes de cualquier migración
3. El script de migración creará los usuarios en producción
4. Luego actualizará las referencias con los nuevos IDs

🛑 IMPORTANTE: Este análisis NO modificó ningún dato.
`;

  writeFileSync(REPORT_READABLE, readable);
  console.log(`📄 Reporte legible guardado en: ${REPORT_READABLE}`);

  return report;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 ANÁLISIS DE MIGRACIÓN CLERK DEV → PROD                       ║');
  console.log('║  Este script es de SOLO LECTURA - No modifica nada               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  try {
    // 1. Leer usuarios del CSV
    const users = readUsersCSV();
    const devUserIds = users.map(u => u.clerkId);

    console.log('👥 Usuarios de Development encontrados:');
    for (const user of users) {
      console.log(`   • ${user.firstName} ${user.lastName} <${user.email}>`);
      console.log(`     ID: ${user.clerkId}`);
    }

    // 2. Conectar a Firestore
    console.log('\n🔥 Conectando a Firestore...');
    const db = initFirebase();
    console.log('   ✓ Conectado\n');

    // 3. Analizar cada colección
    console.log('📁 Analizando colecciones:');
    const analysisResults = [];
    
    for (const collectionName of COLLECTIONS_TO_ANALYZE) {
      const result = await analyzeCollection(db, collectionName, devUserIds);
      analysisResults.push(result);
    }

    // 4. Generar reporte
    const report = generateReport(users, analysisResults);

    // 5. Mostrar resumen final
    console.log('\n' + '═'.repeat(67));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(67));
    console.log(`   Usuarios a migrar:        ${report.summary.totalDevUsers}`);
    console.log(`   Documentos a actualizar:  ${report.summary.totalDocsToMigrate}`);
    console.log(`   Colecciones afectadas:    ${report.summary.collectionsWithRefs}`);
    console.log('═'.repeat(67));
    
    if (report.summary.totalDocsToMigrate > 0) {
      console.log('\n⚠️  Se encontraron referencias que necesitarían actualizarse.');
      console.log('   Revisa el reporte en: migration-report.txt');
    } else {
      console.log('\n✅ No se encontraron referencias a usuarios de development.');
    }

    console.log('\n✅ Análisis completado. Ningún dato fue modificado.\n');

  } catch (error) {
    console.error('\n❌ Error durante el análisis:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
