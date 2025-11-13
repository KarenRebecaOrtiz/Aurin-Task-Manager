<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Comprehensive Research: Time Tracking with Next.js, Firestore, and Timers

## Executive Overview

Building a collaborative time tracking system for task management requires careful consideration of real-time synchronization, state management, and Firestore optimization. This research provides extensive documentation on implementing timer features where multiple users can track their work time on shared tasks, with individual and aggregated hours visible to all team members.

## Architecture Patterns for Multi-User Timer Systems

### Real-Time Synchronization Strategy

When implementing timers that sync across multiple users, the fundamental challenge is maintaining consistency between client-side timers and server-side state. The recommended approach stores **timestamps rather than running timers** in Firestore.[^1]

**Best Practice Pattern:**

```javascript
// Store start timestamp instead of elapsed time
const timerDocument = {
  userId: "user123",
  taskId: "task456",
  startedAt: Timestamp.now(),
  pausedAt: null,
  totalElapsed: 0,
  status: "running" // running, paused, stopped
}
```

This approach allows clients to calculate elapsed time locally while maintaining a single source of truth in Firestore. When a user starts a timer, store the current timestamp. Each client calculates the difference between `Date.now()` and `startedAt` to display the running timer.[^1]

### Firestore Document Structure for Collaborative Time Tracking

**Option 1: Individual Timer Documents (Recommended for Real-Time Updates)**

```javascript
// Collection: timers
{
  id: "timer_user123_task456",
  userId: "user123",
  taskId: "task456",
  startedAt: Timestamp,
  pausedAt: Timestamp | null,
  intervals: [
    { start: Timestamp, end: Timestamp, duration: 3600 }
  ],
  totalSeconds: 3600,
  status: "paused"
}

// Collection: tasks (with aggregated data)
{
  id: "task456",
  title: "Feature Implementation",
  members: ["user123", "user456"],
  totalHours: 8.5, // Sum of all member hours
  memberHours: {
    "user123": 3.5,
    "user456": 5.0
  },
  lastUpdated: Timestamp
}
```

**Option 2: Grouped Monthly Documents (Cost-Optimized)**

For reducing Firestore read costs, consider grouping time entries by month rather than creating individual documents per session. This is particularly effective when displaying data in monthly charts:[^2]

```javascript
// Collection: timelogs
{
  id: "user123_2025-11",
  userId: "user123",
  month: "2025-11",
  entries: [
    {
      taskId: "task456",
      date: "2025-11-12",
      intervals: [...],
      totalSeconds: 7200
    }
  ]
}
```

**Trade-offs:** Individual documents provide better real-time listening capabilities, while monthly grouping reduces read operations from 30-60 documents to just 1-2 documents when querying ranges.[^2]

## Next.js Implementation Patterns

### Timer Hook with useInterval

Implementing a reliable timer in Next.js requires proper cleanup to prevent memory leaks:[^3][^4]

```javascript
import { useState, useEffect, useRef } from 'react';

function useTimer(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => prevSeconds + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  return { seconds, isRunning, start, pause, reset };
}
```


### Server-Side vs Client-Side Considerations

Next.js 13+ with App Router requires careful handling of client-side timers. Timer components must be marked with `'use client'` directive since `setInterval` is a browser API.[^5][^6]

**Timezone Handling:**

```javascript
// Always store UTC timestamps in Firestore
// Format on client based on user timezone
const currentTime = new Date().toLocaleDateString("en-US", {
  timeZone: "UTC",
  weekday: "long"
});
```

To avoid hydration mismatches between server and client, defer timer initialization until after mount:[^6]

```javascript
'use client';

export default function TimerComponent() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return <div>Loading...</div>;
  
  return <Timer />;
}
```


## Zustand State Management Patterns

### Store Configuration for Timer State

Zustand provides lightweight state management perfect for timer applications, with built-in persistence middleware:[^7][^8]

```javascript
import create from 'zustand';
import { persist } from 'zustand/middleware';

const useTimerStore = create(
  persist(
    (set, get) => ({
      activeTimers: {},
      
      startTimer: async (userId, taskId) => {
        const startedAt = Date.now();
        
        // Optimistic update
        set(state => ({
          activeTimers: {
            ...state.activeTimers,
            [taskId]: {
              userId,
              taskId,
              startedAt,
              status: 'running'
            }
          }
        }));
        
        // Sync to Firestore
        await saveTimerToFirestore(userId, taskId, startedAt);
      },
      
      pauseTimer: async (taskId) => {
        const timer = get().activeTimers[taskId];
        if (!timer) return;
        
        const pausedAt = Date.now();
        const elapsed = pausedAt - timer.startedAt;
        
        set(state => ({
          activeTimers: {
            ...state.activeTimers,
            [taskId]: {
              ...timer,
              pausedAt,
              totalElapsed: (timer.totalElapsed || 0) + elapsed,
              status: 'paused'
            }
          }
        }));
        
        await updateTimerInFirestore(taskId, pausedAt, elapsed);
      },
      
      removeTimer: async (taskId) => {
        const { [taskId]: removed, ...rest } = get().activeTimers;
        set({ activeTimers: rest });
        await deleteTimerFromFirestore(taskId);
      }
    }),
    {
      name: 'timer-storage',
      // Only persist non-sensitive data
      partialState: (state) => ({
        activeTimers: state.activeTimers
      })
    }
  )
);
```

**Advantages of Zustand for Timer Apps:**[^7]

- Minimal boilerplate compared to Redux
- Automatic re-render optimization (components only re-render when subscribed state changes)
- Easy async action handling without middleware
- Built-in persistence with localStorage
- No Provider wrapper needed


### Handling Async Operations

```javascript
const useTimerStore = create((set, get) => ({
  timers: [],
  loading: false,
  error: null,
  
  fetchTimers: async (taskId) => {
    set({ loading: true, error: null });
    try {
      const timers = await getTimersFromFirestore(taskId);
      set({ timers, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
```


## Firestore Optimization Strategies

### Reducing Read/Write Operations

**1. Batch Writes for Multiple Updates**[^9][^10]

When updating multiple timer records or aggregating totals, use batch writes to reduce costs and ensure atomicity:

```javascript
import { writeBatch, doc } from 'firebase/firestore';

async function stopTimerAndUpdateTask(db, timerId, taskId, duration) {
  const batch = writeBatch(db);
  
  // Update timer document
  const timerRef = doc(db, 'timers', timerId);
  batch.update(timerRef, {
    status: 'stopped',
    stoppedAt: Timestamp.now(),
    totalSeconds: duration
  });
  
  // Update task aggregates
  const taskRef = doc(db, 'tasks', taskId);
  batch.update(taskRef, {
    totalHours: increment(duration / 3600),
    [`memberHours.${userId}`]: increment(duration / 3600)
  });
  
  await batch.commit();
}
```

**Batch Write Limits:**[^10]

- Maximum 500 operations per batch
- Complete within 270 seconds
- All operations succeed or fail together
- Cannot include reads within batch (use transactions for read-modify-write)

**2. Transactions for Race Conditions**

Use transactions when multiple users might update the same task simultaneously:

```javascript
import { runTransaction, doc } from 'firebase/firestore';

async function addTimeToTask(db, taskId, userId, seconds) {
  const taskRef = doc(db, 'tasks', taskId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const taskDoc = await transaction.get(taskRef);
      
      if (!taskDoc.exists()) {
        throw new Error("Task does not exist");
      }
      
      const currentTotal = taskDoc.data().totalHours || 0;
      const currentUserHours = taskDoc.data().memberHours?.[userId] || 0;
      
      transaction.update(taskRef, {
        totalHours: currentTotal + (seconds / 3600),
        [`memberHours.${userId}`]: currentUserHours + (seconds / 3600),
        lastUpdated: Timestamp.now()
      });
    });
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}
```

**3. Local Cache and Optimistic Updates**

Minimize Firestore reads by implementing local-only listeners:[^11]

```javascript
import { onSnapshot, doc } from 'firebase/firestore';

// Listen to cache only for frequent updates
const unsubscribe = onSnapshot(
  doc(db, "tasks", taskId),
  { 
    includeMetadataChanges: true,
    source: 'cache' 
  },
  (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) {
      // Local change, update UI immediately
      updateUIOptimistically(snapshot.data());
    }
  }
);
```

**4. Aggregate on Write, Not Read**[^12]

Instead of querying all user timers to calculate totals, maintain aggregated values:

```javascript
// BAD: Query all timers every time
const timersSnapshot = await getDocs(
  query(collection(db, 'timers'), where('taskId', '==', taskId))
);
const total = timersSnapshot.docs.reduce((sum, doc) => 
  sum + doc.data().totalSeconds, 0
);

// GOOD: Maintain aggregate in task document
const taskDoc = await getDoc(doc(db, 'tasks', taskId));
const total = taskDoc.data().totalHours; // Pre-calculated
```

This pattern reduces reads by 99x when you have 100 timers per task.[^12]

### Real-Time Listeners with onSnapshot

Firestore's `onSnapshot` provides real-time updates essential for collaborative timer apps:[^13][^11]

```javascript
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function useTaskTimers(taskId) {
  const [timers, setTimers] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  
  useEffect(() => {
    const q = query(
      collection(db, 'timers'),
      where('taskId', '==', taskId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const timerData = [];
      let total = 0;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('New timer:', change.doc.data());
        }
        if (change.type === 'modified') {
          console.log('Modified timer:', change.doc.data());
        }
        if (change.type === 'removed') {
          console.log('Removed timer:', change.doc.data());
        }
      });
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        timerData.push({ id: doc.id, ...data });
        total += data.totalSeconds || 0;
      });
      
      setTimers(timerData);
      setTotalHours(total / 3600);
    });
    
    return () => unsubscribe();
  }, [taskId]);
  
  return { timers, totalHours };
}
```

**Latency Compensation:** Firestore provides immediate local updates before server confirmation using `metadata.hasPendingWrites`:[^11]

```javascript
const source = doc.metadata.hasPendingWrites ? "Local" : "Server";
console.log(source, "data:", doc.data());
```

This creates a responsive UI where users see their changes instantly, even with network latency.

## Complete Implementation Example

### Timer Component with All Features

```javascript
'use client';

import { useState, useEffect } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TaskTimer({ taskId, userId }) {
  const [mounted, setMounted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [taskData, setTaskData] = useState(null);
  
  const { 
    activeTimers, 
    startTimer, 
    pauseTimer, 
    removeTimer 
  } = useTimerStore();
  
  const currentTimer = activeTimers[taskId];
  const isRunning = currentTimer?.status === 'running';
  
  // Mount check for SSR compatibility
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Calculate elapsed time for running timer
  useEffect(() => {
    if (!isRunning || !currentTimer) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - currentTimer.startedAt) / 1000
      );
      setElapsedSeconds((currentTimer.totalElapsed || 0) + elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, currentTimer]);
  
  // Real-time task data listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'tasks', taskId),
      (snapshot) => {
        if (snapshot.exists()) {
          setTaskData(snapshot.data());
        }
      }
    );
    
    return () => unsubscribe();
  }, [taskId]);
  
  const handleStart = async () => {
    await startTimer(userId, taskId);
  };
  
  const handlePause = async () => {
    await pauseTimer(taskId);
  };
  
  const handleStop = async () => {
    await removeTimer(taskId);
    setElapsedSeconds(0);
  };
  
  if (!mounted) return <div>Loading...</div>;
  
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="timer-container">
      <div className="timer-display">
        <h3>Your Time: {formatTime(elapsedSeconds)}</h3>
      </div>
      
      <div className="timer-controls">
        {!isRunning ? (
          <button onClick={handleStart}>Start</button>
        ) : (
          <button onClick={handlePause}>Pause</button>
        )}
        <button onClick={handleStop}>Stop & Save</button>
      </div>
      
      {taskData && (
        <div className="task-summary">
          <h4>Total Team Hours: {taskData.totalHours?.toFixed(2)}h</h4>
          <ul>
            {Object.entries(taskData.memberHours || {}).map(([uid, hours]) => (
              <li key={uid}>
                {uid}: {hours.toFixed(2)}h
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```


### Firestore Service Layer

```javascript
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  increment 
} from 'firebase/firestore';
import { db } from './firebase';

export const TimerService = {
  async startTimer(userId, taskId) {
    const timerId = `${userId}_${taskId}_${Date.now()}`;
    const timerRef = doc(db, 'timers', timerId);
    
    await setDoc(timerRef, {
      userId,
      taskId,
      startedAt: Timestamp.now(),
      status: 'running',
      totalSeconds: 0,
      intervals: []
    });
    
    return timerId;
  },
  
  async pauseTimer(timerId, elapsed) {
    const timerRef = doc(db, 'timers', timerId);
    
    await updateDoc(timerRef, {
      pausedAt: Timestamp.now(),
      totalSeconds: increment(elapsed),
      status: 'paused',
      'intervals': arrayUnion({
        start: timer.startedAt,
        end: Timestamp.now(),
        duration: elapsed
      })
    });
  },
  
  async deleteTimer(timerId) {
    await deleteDoc(doc(db, 'timers', timerId));
  },
  
  async updateTaskAggregates(taskId, userId, seconds) {
    const taskRef = doc(db, 'tasks', taskId);
    
    await updateDoc(taskRef, {
      totalHours: increment(seconds / 3600),
      [`memberHours.${userId}`]: increment(seconds / 3600),
      lastUpdated: Timestamp.now()
    });
  }
};
```


## Performance Optimization Tips

### 1. Debounce Firestore Updates

Avoid writing every second to Firestore. Instead, batch updates:

```javascript
import { useRef, useCallback } from 'react';
import { debounce } from 'lodash';

const debouncedUpdate = useRef(
  debounce(async (timerId, elapsed) => {
    await updateDoc(doc(db, 'timers', timerId), {
      totalSeconds: elapsed
    });
  }, 30000) // Update every 30 seconds
).current;
```


### 2. Index Configuration

Create composite indexes for common queries:[^9]

```javascript
// Query: timers by taskId and status
const q = query(
  collection(db, 'timers'),
  where('taskId', '==', taskId),
  where('status', '==', 'running')
);
```

Firestore will prompt you to create the index on first run.

### 3. Pagination for Large Timer Lists

```javascript
import { query, orderBy, limit, startAfter } from 'firebase/firestore';

async function getTimerPage(lastDoc = null, pageSize = 20) {
  let q = query(
    collection(db, 'timers'),
    orderBy('startedAt', 'desc'),
    limit(pageSize)
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs;
}
```


## Security Rules

Implement proper Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only modify their own timers
    match /timers/{timerId} {
      allow read: if resource.data.taskId in 
        get(/databases/$(database)/documents/tasks/$(resource.data.taskId)).data.members;
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    
    // All task members can read, only admins can write aggregates
    match /tasks/{taskId} {
      allow read: if request.auth.uid in resource.data.members;
      allow update: if request.auth.uid in resource.data.admins;
    }
  }
}
```


## Additional Resources \& Best Practices

### Testing Considerations

Test timer synchronization with multiple browser windows to simulate collaborative editing. Use Firebase Local Emulator Suite for development to avoid production costs.[^5]

### Error Handling

Always implement retry logic for network failures:

```javascript
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```


### Monitoring

Track Firestore usage in Firebase Console to identify optimization opportunities. Monitor read/write ratios and adjust document structure if reads significantly outnumber writes.[^12]

This comprehensive implementation provides a solid foundation for building a collaborative time tracking system with Next.js, Firestore, and Zustand, ensuring real-time synchronization, cost optimization, and excellent user experience across multiple team members.
<span style="display:none">[^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45][^46][^47][^48][^49][^50][^51][^52][^53][^54][^55][^56][^57][^58][^59][^60][^61][^62][^63][^64][^65][^66][^67][^68][^69][^70][^71][^72]</span>

<div align="center">⁂</div>

[^1]: https://www.reddit.com/r/Firebase/comments/g7qh9c/sync_countdown_timer_between_multiple_clients/

[^2]: https://stackoverflow.com/questions/70948776/firestore-best-practices-make-one-document-per-entry-or-group-entries-of-a-give

[^3]: https://stackoverflow.com/questions/59779473/setinterval-using-next-js-and-hooks

[^4]: https://www.geeksforgeeks.org/reactjs/how-to-use-setinterval-method-inside-react-components/

[^5]: https://firebase.google.com/codelabs/firebase-nextjs?hl=es-419

[^6]: https://www.linkedin.com/pulse/handling-date-time-nextjs-best-practices-common-pitfalls-aloui-zxkze

[^7]: https://dev.to/mrsupercraft/mastering-state-management-with-zustand-in-nextjs-and-react-1g26

[^8]: https://stackoverflow.com/questions/76986202/next-js-zustand-and-loading-initial-state-from-the-local-storage

[^9]: https://estuary.dev/blog/firestore-query-best-practices/

[^10]: https://moldstud.com/articles/p-mastering-firestore-transactions-and-batch-writes-a-comprehensive-developer-guide

[^11]: https://www.semanticscholar.org/paper/012ae5c6913964f4f57b81fc1579bee3380ba068

[^12]: https://www.reddit.com/r/Firebase/comments/o2nfo5/how_i_optimized_firestore_readwrite_by_2000_times/

[^13]: https://firebase.google.com/docs/firestore/query-data/listen?hl=es-419

[^14]: https://dl.acm.org/doi/pdf/10.1145/3623565.3623754

[^15]: https://arxiv.org/html/2504.03884v1

[^16]: https://zenodo.org/record/5856420/files/Synchronizing_Real-Time_Tasks_in_Time-Triggered_Networks.pdf

[^17]: https://arxiv.org/pdf/2109.13492.pdf

[^18]: https://arxiv.org/html/2501.16015v1

[^19]: https://arxiv.org/pdf/2301.05861.pdf

[^20]: https://arxiv.org/pdf/2205.07696.pdf

[^21]: http://arxiv.org/pdf/2412.20221.pdf

[^22]: https://www.reddit.com/r/reactjs/comments/kdqf0f/how_can_i_keep_track_of_a_countdown_timer_in_the/

[^23]: https://www.youtube.com/watch?v=i16PlS9aTJU

[^24]: https://www.youtube.com/watch?v=3QcpGXJcCYA

[^25]: https://dev.to/martinpersson/building-a-real-time-chat-app-with-firebase-and-nextjs-1fea

[^26]: https://www.youtube.com/watch?v=o6sd2iNBaig

[^27]: https://firebase.google.com/codelabs/firebase-nextjs

[^28]: https://ieeexplore.ieee.org/document/10346218/

[^29]: https://smij.sciencesforce.com/journal/vol2/iss1/1

[^30]: https://gaexcellence.com/jistm/article/view/4883

[^31]: https://www.synstojournals.com/multi/article/view/143

[^32]: https://www.ijraset.com/best-journal/design-and-implementation-of-microcontroller-based-borewell-timer-

[^33]: https://www.jisem-journal.com/index.php/journal/article/view/12580

[^34]: https://ijsrcseit.com/index.php/home/article/view/CSEIT251112177

[^35]: https://sshjournal.com/index.php/sshj/article/view/1421

[^36]: https://ieeexplore.ieee.org/document/10765541/

[^37]: https://www.ahajournals.org/doi/10.1161/str.55.suppl_1.TP218

[^38]: https://arxiv.org/pdf/2405.04402.pdf

[^39]: http://arxiv.org/pdf/2503.13679.pdf

[^40]: https://dl.acm.org/doi/pdf/10.1145/3698384.3699617

[^41]: https://arxiv.org/html/2503.19904v1

[^42]: http://arxiv.org/pdf/2401.08595.pdf

[^43]: https://www.mdpi.com/1424-8220/23/7/3432/pdf?version=1679664854

[^44]: https://www.mdpi.com/1424-8220/23/14/6380/pdf?version=1689253765

[^45]: https://blog.stackademic.com/building-a-simple-pomodoro-app-with-next-js-and-tailwind-css-ef2eaa9b5195

[^46]: https://dl.acm.org/doi/10.1145/3636555.3636913

[^47]: https://www.semanticscholar.org/paper/e3629c0759142fb4e8b7ea1a7db66e79549c982a

[^48]: https://ieeexplore.ieee.org/document/10970091/

[^49]: https://www.semanticscholar.org/paper/b153cddf90747ac1d6d6b4df31649a47dea538b9

[^50]: https://asmedigitalcollection.asme.org/mechanicaldesign/article/145/5/051405/1155868/Independence-or-Interaction-Understanding-the

[^51]: https://www.semanticscholar.org/paper/a9fd7df0ab12fd60d9b632e838ea724b8c86dd6c

[^52]: https://www.cambridge.org/core/product/identifier/S2056472424004289/type/journal_article

[^53]: https://www.semanticscholar.org/paper/4631208fc0d7df17ff1930198306e0f7b567f205

[^54]: https://dl.acm.org/doi/10.1145/2968219.2971429

[^55]: http://arxiv.org/pdf/1106.1816.pdf

[^56]: https://dx.plos.org/10.1371/journal.pone.0306923

[^57]: https://dl.acm.org/doi/pdf/10.1145/3628034.3628038

[^58]: https://escholarship.org/content/qt3k77m02p/qt3k77m02p.pdf?t=pavs3z

[^59]: https://arxiv.org/pdf/2106.00583.pdf

[^60]: https://hrmars.com/papers_submitted/15188/web-based-task-management-system-for-improving-group-work-collaboration.pdf

[^61]: http://arxiv.org/pdf/2503.09189.pdf

[^62]: https://pmc.ncbi.nlm.nih.gov/articles/PMC11972307/

[^63]: https://www.monitask.com/en/integration/firebase-firestore-time-tracking

[^64]: https://firedraw.dezoko.com/blog/real-time-collaboration-design-firestore-schemas-as-a-team

[^65]: https://arxiv.org/abs/2504.03884

[^66]: https://dl.acm.org/doi/10.1145/3582515.3609523

[^67]: https://www.semanticscholar.org/paper/94ad72cff175ef0d4669b0bc0512cde2b988a785

[^68]: http://www.inderscience.com/link.php?id=68520

[^69]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5077164/

[^70]: https://arxiv.org/html/2405.06445v4

[^71]: https://www.frontiersin.org/articles/10.3389/fnint.2011.00028/pdf

[^72]: https://totalsynergy.com/time-tracking-software-for-architects-12-key-features/

