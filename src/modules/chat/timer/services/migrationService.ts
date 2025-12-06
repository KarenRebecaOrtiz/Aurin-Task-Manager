/**
 * Migration Service - Time Tracking Data Migration
 * 
 * This service migrates legacy time entries from chat messages to the new
 * time_logs subcollection and recalculates timeTracking aggregates.
 * 
 * Can be called from browser console or from a temporary admin UI.
 * 
 * Usage from browser console:
 *   import { migrateTaskTimeTracking } from '@/modules/chat/timer/services/migrationService';
 *   await migrateTaskTimeTracking('TASK_ID', true);  // dry run
 *   await migrateTaskTimeTracking('TASK_ID', false); // execute
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ============================================================================
// TYPES
// ============================================================================

interface LegacyTimeMessage {
  id: string;
  senderId: string;
  senderName: string;
  hours: number;
  dateString: string;
  timestamp: Timestamp;
  text?: string;
}

interface MigrationResult {
  taskId: string;
  taskTitle: string;
  legacyMessagesFound: number;
  existingTimeLogs: number;
  newTimeLogsCreated: number;
  calculatedTimeTracking: {
    totalHours: number;
    totalMinutes: number;
    memberHours: Record<string, number>;
  };
  dryRun: boolean;
  errors: string[];
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

/**
 * Migrate time tracking data for a single task
 * 
 * @param taskId - The task ID to migrate
 * @param dryRun - If true, only preview changes without applying
 * @returns Migration result with statistics
 */
export async function migrateTaskTimeTracking(
  taskId: string,
  dryRun: boolean = true
): Promise<MigrationResult> {
  const result: MigrationResult = {
    taskId,
    taskTitle: '',
    legacyMessagesFound: 0,
    existingTimeLogs: 0,
    newTimeLogsCreated: 0,
    calculatedTimeTracking: {
      totalHours: 0,
      totalMinutes: 0,
      memberHours: {},
    },
    dryRun,
    errors: [],
  };

  try {
    // 1. Get task document
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      result.errors.push(`Task ${taskId} not found`);
      return result;
    }
    
    const taskData = taskDoc.data();
    result.taskTitle = taskData.title || 'Sin título';
    
    console.log(`\n📋 Task: "${result.taskTitle}" (${taskId})`);
    console.log(`   Mode: ${dryRun ? '🔍 DRY RUN' : '⚡ EXECUTE'}`);

    // 2. Get existing time_logs
    const timeLogsRef = collection(db, 'tasks', taskId, 'time_logs');
    const existingLogsSnap = await getDocs(timeLogsRef);
    result.existingTimeLogs = existingLogsSnap.size;
    console.log(`   Existing time_logs: ${result.existingTimeLogs}`);

    // 3. Get legacy messages with hours > 0
    const messagesRef = collection(db, 'tasks', taskId, 'messages');
    const messagesSnap = await getDocs(messagesRef);
    
    const legacyMessages: LegacyTimeMessage[] = [];
    messagesSnap.forEach((msgDoc) => {
      const data = msgDoc.data();
      if (data.hours && data.hours > 0) {
        legacyMessages.push({
          id: msgDoc.id,
          senderId: data.senderId,
          senderName: data.senderName || 'Usuario desconocido',
          hours: data.hours,
          dateString: data.dateString || '',
          timestamp: data.timestamp,
          text: data.text,
        });
      }
    });
    
    result.legacyMessagesFound = legacyMessages.length;
    console.log(`   Legacy messages with hours: ${result.legacyMessagesFound}`);

    // 4. Check which messages already have corresponding time_logs
    const existingLogIds = new Set<string>();
    existingLogsSnap.forEach((logDoc) => {
      const data = logDoc.data();
      // Check if this log was migrated from a message
      if (data.migratedFromMessageId) {
        existingLogIds.add(data.migratedFromMessageId);
      }
    });

    // 5. Collect all time entries (existing logs + new from messages)
    const allTimeEntries: Array<{
      userId: string;
      userName: string;
      hours: number;
      durationMinutes: number;
      dateString: string;
      source: string;
    }> = [];

    // Add existing time_logs
    existingLogsSnap.forEach((logDoc) => {
      const data = logDoc.data();
      allTimeEntries.push({
        userId: data.userId,
        userName: data.userName || 'Usuario desconocido',
        hours: data.durationMinutes / 60,
        durationMinutes: data.durationMinutes,
        dateString: data.dateString || '',
        source: 'existing_log',
      });
    });

    // 6. Create new time_logs from legacy messages
    for (const msg of legacyMessages) {
      // Skip if already migrated
      if (existingLogIds.has(msg.id)) {
        console.log(`   ⏭️  Skipping message ${msg.id} (already migrated)`);
        continue;
      }

      const durationMinutes = Math.round(msg.hours * 60);
      
      allTimeEntries.push({
        userId: msg.senderId,
        userName: msg.senderName,
        hours: msg.hours,
        durationMinutes,
        dateString: msg.dateString,
        source: 'migrated_message',
      });

      if (!dryRun) {
        // Create the time_log document
        const newLogRef = doc(timeLogsRef);
        await setDoc(newLogRef, {
          userId: msg.senderId,
          userName: msg.senderName,
          durationMinutes,
          description: msg.text || `Migrado desde mensaje de chat`,
          dateString: msg.dateString,
          startTime: null,
          endTime: null,
          createdAt: msg.timestamp || serverTimestamp(),
          source: 'migration',
          migratedFromMessageId: msg.id, // Track source for idempotency
        });
        
        console.log(`   ✅ Created time_log for ${msg.senderName}: ${msg.hours}h`);
      } else {
        console.log(`   📝 Would create time_log for ${msg.senderName}: ${msg.hours}h`);
      }
      
      result.newTimeLogsCreated++;
    }

    // 7. Calculate new timeTracking aggregates
    let totalMinutes = 0;
    const memberMinutes: Record<string, number> = {};
    
    for (const entry of allTimeEntries) {
      totalMinutes += entry.durationMinutes;
      memberMinutes[entry.userId] = (memberMinutes[entry.userId] || 0) + entry.durationMinutes;
    }
    
    // Convert to hours/minutes format
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    const memberHours: Record<string, number> = {};
    for (const [userId, minutes] of Object.entries(memberMinutes)) {
      memberHours[userId] = minutes / 60; // Store as decimal hours
    }
    
    result.calculatedTimeTracking = {
      totalHours,
      totalMinutes: remainingMinutes,
      memberHours,
    };

    console.log(`\n   📊 Calculated totals:`);
    console.log(`      Total: ${totalHours}h ${remainingMinutes}m`);
    for (const [userId, hours] of Object.entries(memberHours)) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      console.log(`      ${userId}: ${h}h ${m}m`);
    }

    // 8. Update task document with new timeTracking
    if (!dryRun) {
      await updateDoc(taskRef, {
        timeTracking: {
          totalHours,
          totalMinutes: remainingMinutes,
          lastLogDate: serverTimestamp(),
          memberHours,
        },
        // Also update legacy fields
        totalHours: totalHours + (remainingMinutes / 60),
        memberHours,
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`\n   ✅ Task timeTracking updated!`);
    } else {
      console.log(`\n   📝 Would update task timeTracking`);
    }

    console.log(`\n✅ Migration ${dryRun ? 'preview' : 'complete'} for "${result.taskTitle}"`);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMsg);
    console.error(`\n❌ Error: ${errorMsg}`);
  }

  return result;
}

/**
 * Export for browser console usage
 * 
 * Usage in console:
 *   const { migrateTaskTimeTracking } = await import('/src/modules/chat/timer/services/migrationService');
 *   await migrateTaskTimeTracking('RNoU2W20fqDhlM9DdAgl', true);
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).migrateTaskTimeTracking = migrateTaskTimeTracking;
}

const migrationService = { migrateTaskTimeTracking };
export default migrationService;
