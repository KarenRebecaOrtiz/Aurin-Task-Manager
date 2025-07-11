import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  readFileSync('./firebase-migration/node_modules/deleteMessages.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteEncryptedMessages() {
  try {
    console.log('[deleteEncryptedMessages] Starting deletion of encrypted messages...');

    // Get all tasks
    const tasksSnapshot = await db.collection('tasks').get();
    let totalDeleted = 0;

    for (const taskDoc of tasksSnapshot.docs) {
      const taskId = taskDoc.id;
      console.log(`[deleteEncryptedMessages] Processing task: ${taskId}`);

      try {
        // Query messages with text starting with 'encrypted:'
        const messagesSnapshot = await db
          .collection(`tasks/${taskId}/messages`)
          .where('text', '>=', 'encrypted:')
          .where('text', '<=', 'encrypted:\uf8ff')
          .get();

        console.log(`[deleteEncryptedMessages] Found ${messagesSnapshot.size} encrypted messages in task ${taskId}`);

        // Process deletions in batches
        const batch = db.batch();
        let batchSize = 0;
        const maxBatchSize = 500; // Firestore batch limit

        for (const messageDoc of messagesSnapshot.docs) {
          if (batchSize >= maxBatchSize) {
            await batch.commit();
            console.log(`[deleteEncryptedMessages] Committed batch of ${batchSize} deletions for task ${taskId}`);
            totalDeleted += batchSize;
            batchSize = 0;
          }

          batch.delete(messageDoc.ref);
          batchSize++;
        }

        if (batchSize > 0) {
          await batch.commit();
          console.log(`[deleteEncryptedMessages] Committed final batch of ${batchSize} deletions for task ${taskId}`);
          totalDeleted += batchSize;
        }
      } catch (err) {
        if (err.code === 5 || err.message?.includes('NOT_FOUND')) {
          // Subcollection does not exist, skip
          console.log(`[deleteEncryptedMessages] No messages subcollection for task ${taskId}, skipping.`);
        } else {
          throw err;
        }
      }
    }

    console.log(`[deleteEncryptedMessages] Completed: Deleted ${totalDeleted} encrypted messages across all tasks.`);
  } catch (error) {
    console.error('[deleteEncryptedMessages] Error deleting encrypted messages:', error);
    throw error;
  }
}

// Run the script
deleteEncryptedMessages().catch((error) => {
  console.error('[deleteEncryptedMessages] Script failed:', error);
  process.exit(1);
}); 