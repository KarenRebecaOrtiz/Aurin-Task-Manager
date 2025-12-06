/**
 * Migration Script - Run with: node scripts/run-migration.mjs
 * 
 * Migrates legacy time logs from chat messages to proper time_logs collection
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc,
  getDocs, 
  setDoc,
  updateDoc,
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

// Firebase config from env
const firebaseConfig = {
  apiKey: "AIzaSyBr3nCrrkg00Iy0CXV30IBJABBYLMiXu1o",
  authDomain: "aurin-plattform.firebaseapp.com",
  projectId: "aurin-plattform",
  storageBucket: "aurin-plattform.firebasestorage.app",
  messagingSenderId: "125219589195",
  appId: "1:125219589195:web:a7c13fcee2418d03ed51ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TASK_ID = 'RNoU2W20fqDhlM9DdAgl';

async function migrateTask(taskId) {
  console.log(`\n🔍 Analyzing task: ${taskId}`);
  
  // 1. Get all messages with hours > 0
  const messagesRef = collection(db, 'tasks', taskId, 'messages');
  const q = query(messagesRef, where('hours', '>', 0));
  const messagesSnapshot = await getDocs(q);
  
  if (messagesSnapshot.empty) {
    console.log('❌ No time log messages found');
    return;
  }
  
  console.log(`✅ Found ${messagesSnapshot.size} time log messages`);
  
  // 2. Collect all time data
  const timeLogs = [];
  let totalMinutes = 0;
  const memberMinutes = {};
  
  messagesSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const hours = data.hours || 0;
    const minutes = Math.round(hours * 60);
    
    console.log(`  📝 ${data.senderName}: ${hours.toFixed(2)}h (${minutes}min) - ${data.dateString || 'No date'}`);
    
    timeLogs.push({
      messageId: docSnap.id,
      userId: data.senderId,
      userName: data.senderName,
      hours: hours,
      durationMinutes: minutes,
      dateString: data.dateString || new Date().toLocaleDateString('es-ES'),
      timestamp: data.timestamp,
      description: data.text || `Migrado de mensaje: ${docSnap.id}`,
      source: 'migration'
    });
    
    totalMinutes += minutes;
    memberMinutes[data.senderId] = (memberMinutes[data.senderId] || 0) + minutes;
  });
  
  // 3. Calculate totals
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  
  const memberHours = {};
  for (const [userId, mins] of Object.entries(memberMinutes)) {
    memberHours[userId] = mins / 60;
  }
  
  console.log(`\n📊 Totals:`);
  console.log(`  Total: ${totalHours}h ${remainingMinutes}m (${totalMinutes} minutes)`);
  for (const [userId, hours] of Object.entries(memberHours)) {
    console.log(`  ${userId}: ${hours.toFixed(2)}h`);
  }
  
  // 4. Create time_logs documents
  console.log(`\n📝 Creating time_logs documents...`);
  
  for (const log of timeLogs) {
    const timeLogRef = doc(collection(db, 'tasks', taskId, 'time_logs'));
    await setDoc(timeLogRef, {
      userId: log.userId,
      userName: log.userName,
      durationMinutes: log.durationMinutes,
      description: log.description,
      dateString: log.dateString,
      createdAt: log.timestamp || serverTimestamp(),
      source: 'migration',
      migratedFromMessageId: log.messageId,
      startTime: null,
      endTime: null
    });
    console.log(`  ✅ Created time_log for ${log.userName}: ${log.durationMinutes}min`);
  }
  
  // 5. Update task with timeTracking
  console.log(`\n📝 Updating task timeTracking...`);
  
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    timeTracking: {
      totalHours: totalHours,
      totalMinutes: remainingMinutes,
      lastLogDate: serverTimestamp(),
      memberHours: memberHours
    },
    totalHours: totalHours + (remainingMinutes / 60),
    memberHours: memberHours
  });
  
  console.log(`\n✅ Migration complete!`);
  console.log(`  Task now has: ${totalHours}h ${remainingMinutes}m total`);
}

// Run migration
console.log('🚀 Starting migration for task: Nombres para remesadora');
console.log('=' .repeat(60));

migrateTask(TASK_ID)
  .then(() => {
    console.log('\n✅ Migration finished successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
