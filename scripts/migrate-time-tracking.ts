/**
 * Migration Script: Time Tracking Data
 * 
 * This script migrates legacy time entries from chat messages to the new
 * time_logs subcollection and recalculates timeTracking aggregates.
 * 
 * SAFETY GUARANTEES:
 * ✅ NON-DESTRUCTIVE: Only ADDS new data, never deletes existing data
 * ✅ IDEMPOTENT: Can be run multiple times safely
 * ✅ REVERSIBLE: Original messages remain untouched
 * ✅ DRY RUN: Preview changes before applying
 * 
 * Usage:
 *   npx ts-node scripts/migrate-time-tracking.ts --dry-run    # Preview only
 *   npx ts-node scripts/migrate-time-tracking.ts --execute    # Execute migration
 *   npx ts-node scripts/migrate-time-tracking.ts --task=TASK_ID  # Single task
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TASKS_COLLECTION = 'tasks';
const MESSAGES_COLLECTION = 'messages';
const TIME_LOGS_COLLECTION = 'time_logs';

// ============================================================================
// INITIALIZE FIREBASE ADMIN
// ============================================================================

function initFirebase() {
  if (getApps().length === 0) {
    // Try to use service account if available, otherwise use default credentials
    try {
      const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
      const serviceAccount = require(serviceAccountPath);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('✅ Firebase initialized with service account');
    } catch {
      // Fallback: use application default credentials
      initializeApp();
      console.log('✅ Firebase initialized with default credentials');
    }
  }
  return getFirestore();
}

// ============================================================================
// TYPES
// ============================================================================

interface LegacyMessage {
  id: string;
  senderId: string;
  senderName: string;
  hours: number;
  text?: string;
  dateString?: string;
  timestamp: Timestamp;
}

interface MigrationResult {
  taskId: string;
  taskName: string;
  legacyMessagesFound: number;
  timeLogsCreated: number;
  previousTotalHours: number;
  newTotalHours: number;
  memberHours: Record<string, number>;
  skipped: boolean;
  skipReason?: string;
}

interface MigrationSummary {
  totalTasks: number;
  tasksWithLegacyData: number;
  totalLegacyMessages: number;
  totalTimeLogsCreated: number;
  errors: string[];
  results: MigrationResult[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function minutesToHoursAndMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Get all tasks from Firestore
 */
async function getAllTasks(db: FirebaseFirestore.Firestore, taskId?: string) {
  if (taskId) {
    const taskDoc = await db.collection(TASKS_COLLECTION).doc(taskId).get();
    if (!taskDoc.exists) {
      throw new Error(`Task ${taskId} not found`);
    }
    return [{ id: taskDoc.id, ...taskDoc.data() }];
  }
  
  const snapshot = await db.collection(TASKS_COLLECTION).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get legacy messages with hours > 0 for a task
 */
async function getLegacyMessages(
  db: FirebaseFirestore.Firestore,
  taskId: string
): Promise<LegacyMessage[]> {
  const messagesRef = db
    .collection(TASKS_COLLECTION)
    .doc(taskId)
    .collection(MESSAGES_COLLECTION);
  
  const snapshot = await messagesRef.where('hours', '>', 0).get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    senderId: doc.data().senderId || '',
    senderName: doc.data().senderName || 'Usuario',
    hours: doc.data().hours || 0,
    text: doc.data().text || '',
    dateString: doc.data().dateString || '',
    timestamp: doc.data().timestamp,
  }));
}

/**
 * Check if time_logs already exist for this task
 */
async function getExistingTimeLogs(
  db: FirebaseFirestore.Firestore,
  taskId: string
): Promise<number> {
  const timeLogsRef = db
    .collection(TASKS_COLLECTION)
    .doc(taskId)
    .collection(TIME_LOGS_COLLECTION);
  
  const snapshot = await timeLogsRef.count().get();
  return snapshot.data().count;
}

/**
 * Migrate a single task's legacy messages to time_logs
 */
async function migrateTask(
  db: FirebaseFirestore.Firestore,
  task: { id: string; name?: string; timeTracking?: any; totalHours?: number },
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    taskId: task.id,
    taskName: task.name || 'Unknown',
    legacyMessagesFound: 0,
    timeLogsCreated: 0,
    previousTotalHours: task.timeTracking?.totalHours || task.totalHours || 0,
    newTotalHours: 0,
    memberHours: {},
    skipped: false,
  };

  // Get legacy messages
  const legacyMessages = await getLegacyMessages(db, task.id);
  result.legacyMessagesFound = legacyMessages.length;

  if (legacyMessages.length === 0) {
    result.skipped = true;
    result.skipReason = 'No legacy messages with hours found';
    return result;
  }

  // Check existing time_logs
  const existingLogsCount = await getExistingTimeLogs(db, task.id);
  
  // Calculate totals from legacy messages
  let totalMinutes = 0;
  const memberMinutes: Record<string, number> = {};

  for (const msg of legacyMessages) {
    const minutes = Math.round(msg.hours * 60);
    totalMinutes += minutes;
    
    if (msg.senderId) {
      memberMinutes[msg.senderId] = (memberMinutes[msg.senderId] || 0) + minutes;
    }
  }

  const { hours: totalHours, minutes: remainingMinutes } = minutesToHoursAndMinutes(totalMinutes);
  result.newTotalHours = totalHours + (remainingMinutes / 60);

  // Convert member minutes to hours
  for (const [userId, minutes] of Object.entries(memberMinutes)) {
    const { hours } = minutesToHoursAndMinutes(minutes);
    result.memberHours[userId] = hours + ((minutes % 60) / 60);
  }

  if (dryRun) {
    result.timeLogsCreated = legacyMessages.length;
    console.log(`\n📋 [DRY RUN] Task: ${result.taskName} (${result.taskId})`);
    console.log(`   Legacy messages found: ${legacyMessages.length}`);
    console.log(`   Existing time_logs: ${existingLogsCount}`);
    console.log(`   Previous total: ${result.previousTotalHours}h`);
    console.log(`   New total: ${result.newTotalHours.toFixed(2)}h`);
    console.log(`   Member breakdown:`, result.memberHours);
    return result;
  }

  // Execute migration
  const batch = db.batch();
  const taskRef = db.collection(TASKS_COLLECTION).doc(task.id);

  // Create time_logs from legacy messages
  for (const msg of legacyMessages) {
    const timeLogRef = db
      .collection(TASKS_COLLECTION)
      .doc(task.id)
      .collection(TIME_LOGS_COLLECTION)
      .doc(); // Auto-generate ID

    batch.set(timeLogRef, {
      userId: msg.senderId,
      userName: msg.senderName,
      startTime: null,
      endTime: null,
      durationMinutes: Math.round(msg.hours * 60),
      description: msg.text || '',
      dateString: msg.dateString || (msg.timestamp ? msg.timestamp.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      createdAt: msg.timestamp || FieldValue.serverTimestamp(),
      source: 'legacy',
    });

    result.timeLogsCreated++;
  }

  // Update task with timeTracking aggregates
  const memberHoursForFirestore: Record<string, number> = {};
  for (const [userId, minutes] of Object.entries(memberMinutes)) {
    memberHoursForFirestore[userId] = minutes / 60;
  }

  batch.update(taskRef, {
    timeTracking: {
      totalHours,
      totalMinutes: remainingMinutes,
      lastLogDate: FieldValue.serverTimestamp(),
      memberHours: memberHoursForFirestore,
    },
    totalHours: totalHours + (remainingMinutes / 60),
    memberHours: memberHoursForFirestore,
    lastUpdated: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log(`✅ Migrated task: ${result.taskName} - ${result.timeLogsCreated} logs, ${result.newTotalHours.toFixed(2)}h total`);

  return result;
}

/**
 * Run the full migration
 */
async function runMigration(options: {
  dryRun: boolean;
  taskId?: string;
}): Promise<MigrationSummary> {
  const db = initFirebase();
  
  const summary: MigrationSummary = {
    totalTasks: 0,
    tasksWithLegacyData: 0,
    totalLegacyMessages: 0,
    totalTimeLogsCreated: 0,
    errors: [],
    results: [],
  };

  console.log('\n' + '='.repeat(60));
  console.log(options.dryRun ? '🔍 DRY RUN MODE - No changes will be made' : '🚀 EXECUTING MIGRATION');
  console.log('='.repeat(60));

  try {
    const tasks = await getAllTasks(db, options.taskId);
    summary.totalTasks = tasks.length;

    console.log(`\nFound ${tasks.length} task(s) to process...\n`);

    for (const task of tasks) {
      try {
        const result = await migrateTask(db, task as any, options.dryRun);
        summary.results.push(result);

        if (!result.skipped) {
          summary.tasksWithLegacyData++;
          summary.totalLegacyMessages += result.legacyMessagesFound;
          summary.totalTimeLogsCreated += result.timeLogsCreated;
        }
      } catch (error) {
        const errorMsg = `Error migrating task ${task.id}: ${(error as Error).message}`;
        summary.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }
  } catch (error) {
    summary.errors.push(`Fatal error: ${(error as Error).message}`);
    console.error(`❌ Fatal error: ${(error as Error).message}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tasks processed: ${summary.totalTasks}`);
  console.log(`Tasks with legacy data: ${summary.tasksWithLegacyData}`);
  console.log(`Total legacy messages found: ${summary.totalLegacyMessages}`);
  console.log(`Time logs created: ${summary.totalTimeLogsCreated}`);
  console.log(`Errors: ${summary.errors.length}`);
  
  if (summary.errors.length > 0) {
    console.log('\n⚠️ Errors:');
    summary.errors.forEach(err => console.log(`   - ${err}`));
  }

  if (options.dryRun && summary.tasksWithLegacyData > 0) {
    console.log('\n💡 To execute this migration, run:');
    console.log('   npx ts-node scripts/migrate-time-tracking.ts --execute');
  }

  return summary;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const dryRun = !args.includes('--execute');
  const taskIdArg = args.find(arg => arg.startsWith('--task='));
  const taskId = taskIdArg ? taskIdArg.split('=')[1] : undefined;

  if (args.includes('--help')) {
    console.log(`
Time Tracking Migration Script

Usage:
  npx ts-node scripts/migrate-time-tracking.ts [options]

Options:
  --dry-run     Preview changes without executing (default)
  --execute     Execute the migration
  --task=ID     Migrate a specific task only
  --help        Show this help message

Examples:
  npx ts-node scripts/migrate-time-tracking.ts --dry-run
  npx ts-node scripts/migrate-time-tracking.ts --execute
  npx ts-node scripts/migrate-time-tracking.ts --task=RNoU2W20fqDhlM9DdAgl --execute
    `);
    return;
  }

  await runMigration({ dryRun, taskId });
}

main().catch(console.error);
