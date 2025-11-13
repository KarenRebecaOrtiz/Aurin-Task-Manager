# Timer Module Implementation Roadmap

## 📋 Overview

This roadmap provides a step-by-step guide to implement the modular timer system for the chat module. Each task is designed to be completed independently with clear acceptance criteria.

**Total Estimated Time:** 15-20 hours
**Complexity Level:** Medium-High
**Module Location:** `src/modules/chat/timer/`

---

## 🎯 Implementation Philosophy

### Core Principles
1. **DRY (Don't Repeat Yourself)** - Extract reusable logic into utils/services
2. **SOLID Principles** - Single responsibility, dependency inversion
3. **Incremental Development** - Build and test each layer before moving up
4. **Test as You Go** - Validate each component before integration

### Architecture Layers (Bottom-Up)
```
Layer 1: Types & Constants (Foundation)
Layer 2: Utils & Services (Business Logic)
Layer 3: Stores (State Management)
Layer 4: Hooks (Composition Layer)
Layer 5: Components (UI Layer)
Layer 6: Integration (ChatSidebar)
```

---

## 📊 Progress Tracking

- [ ] **PHASE 1:** Foundation (Types & Constants)
- [ ] **PHASE 2:** Services Layer
- [ ] **PHASE 3:** State Management
- [ ] **PHASE 4:** Hooks Layer
- [ ] **PHASE 5:** Components Layer
- [ ] **PHASE 6:** Integration & Migration
- [ ] **PHASE 7:** Testing & Optimization

---

# PHASE 1: Foundation (Types & Constants)

**Estimated Time:** 1-2 hours
**Files:** 2
**Dependencies:** None

## Task 1.1: Define Core Types

**File:** `src/modules/chat/timer/types/timer.types.ts`
**Estimated Time:** 45 minutes

### Implementation Steps

1. **Define TimerStatus enum**
   ```typescript
   export enum TimerStatus {
     IDLE = 'idle',
     RUNNING = 'running',
     PAUSED = 'paused',
     STOPPED = 'stopped'
   }
   ```

2. **Define TimerInterval interface**
   ```typescript
   export interface TimerInterval {
     start: Date;
     end: Date;
     duration: number; // seconds
   }
   ```

3. **Define TimerDocument interface (Firestore schema)**
   ```typescript
   export interface TimerDocument {
     id: string;
     userId: string;
     taskId: string;
     status: TimerStatus;
     startedAt: Timestamp | null;
     pausedAt: Timestamp | null;
     totalSeconds: number;
     intervals: TimerInterval[];
     deviceId: string;
     lastSync: Timestamp;
     createdAt: Timestamp;
     updatedAt: Timestamp;
   }
   ```

4. **Define LocalTimerState interface**
   ```typescript
   export interface LocalTimerState {
     timerId: string;
     taskId: string;
     userId: string;
     status: TimerStatus;
     startedAt: Date | null;
     pausedAt: Date | null;
     accumulatedSeconds: number;
     intervals: TimerInterval[];
     lastSyncTime: number | null;
   }
   ```

5. **Define TimerSyncState interface**
   ```typescript
   export interface TimerSyncState {
     syncStatus: 'idle' | 'syncing' | 'error';
     lastSyncTimestamp: number | null;
     pendingWrites: Record<string, boolean>;
     errors: Record<string, Error>;
     isOnline: boolean;
   }
   ```

6. **Define TimeEntryFormData interface**
   ```typescript
   export interface TimeEntryFormData {
     time: string; // "HH:MM"
     date: Date;
     comment?: string;
   }
   ```

7. **Define Hook Return Types**
   ```typescript
   export interface UseTimerStateReturn {
     timerSeconds: number;
     isRunning: boolean;
     isPaused: boolean;
     intervals: TimerInterval[];
     status: TimerStatus;
     lastSyncTime: number | null;
   }

   export interface UseTimerActionsReturn {
     startTimer: () => Promise<void>;
     pauseTimer: () => Promise<void>;
     stopTimer: () => Promise<void>;
     resetTimer: () => Promise<void>;
     isProcessing: boolean;
   }

   export interface UseTimerSyncReturn {
     isSyncing: boolean;
     syncError: Error | null;
     lastSyncTime: number | null;
     retrySyncManually: () => Promise<void>;
   }

   export interface UseTimeEntryReturn {
     form: UseFormReturn<TimeEntryFormData>;
     isSubmitting: boolean;
     submitTimeEntry: () => Promise<void>;
     resetForm: () => void;
     errors: Record<string, string>;
   }

   export interface UseTimerOptimisticReturn {
     isOptimistic: boolean;
     hasPendingWrites: boolean;
     optimisticValue: number | null;
     confirmationStatus: 'pending' | 'confirmed' | 'failed';
   }
   ```

### Acceptance Criteria
- ✅ All types compile without errors
- ✅ Types match Firestore document structure
- ✅ All exports are properly typed
- ✅ JSDoc comments added for complex types

---

## Task 1.2: Define Constants

**File:** `src/modules/chat/timer/utils/timerConstants.ts`
**Estimated Time:** 15 minutes

### Implementation Steps

1. **Define timing constants**
   ```typescript
   export const SYNC_INTERVAL_MS = 30000; // 30 seconds
   export const DEBOUNCE_INTERVAL_MS = 5000; // 5 seconds
   export const MAX_RETRY_ATTEMPTS = 3;
   export const RETRY_DELAY_BASE_MS = 1000; // 1 second
   export const MAX_REASONABLE_TIME_SECONDS = 24 * 60 * 60; // 24 hours
   ```

2. **Define collection names**
   ```typescript
   export const TIMER_COLLECTION_NAME = 'timers';
   export const TASKS_COLLECTION_NAME = 'tasks';
   ```

3. **Define default values**
   ```typescript
   export const DEFAULT_TIMER_VALUES = {
     time: '00:00',
     date: new Date(),
     comment: '',
   } as const;
   ```

4. **Define error messages**
   ```typescript
   export const ERROR_MESSAGES = {
     TIMER_ALREADY_RUNNING: 'Timer is already running',
     TIMER_NOT_RUNNING: 'Timer is not running',
     INVALID_TIME_FORMAT: 'Invalid time format (HH:MM)',
     FUTURE_DATE_NOT_ALLOWED: 'Cannot add time for future dates',
     NETWORK_ERROR: 'Network error. Please check your connection.',
   } as const;
   ```

### Acceptance Criteria
- ✅ All constants are properly typed
- ✅ Constants are exported and accessible
- ✅ Values match research recommendations

---

# PHASE 2: Services Layer

**Estimated Time:** 4-5 hours
**Files:** 5
**Dependencies:** Phase 1 (Types & Constants)

## Task 2.1: Timer Calculations Service

**File:** `src/modules/chat/timer/services/timerCalculations.ts`
**Estimated Time:** 45 minutes

### Implementation Steps

1. **Implement calculateElapsedSeconds**
   ```typescript
   export function calculateElapsedSeconds(startTime: Date, currentTime: Date): number {
     return Math.max(0, Math.floor((currentTime.getTime() - startTime.getTime()) / 1000));
   }
   ```

2. **Implement calculateTotalFromIntervals**
   ```typescript
   export function calculateTotalFromIntervals(intervals: TimerInterval[]): number {
     return intervals.reduce((total, interval) => total + interval.duration, 0);
   }
   ```

3. **Implement aggregateIntervals (merge consecutive intervals)**
   ```typescript
   export function aggregateIntervals(intervals: TimerInterval[]): TimerInterval[] {
     // Sort by start time
     // Merge overlapping or consecutive intervals
     // Return aggregated array
   }
   ```

4. **Implement isTimeReasonable**
   ```typescript
   export function isTimeReasonable(seconds: number): boolean {
     return seconds >= 0 && seconds <= MAX_REASONABLE_TIME_SECONDS;
   }
   ```

5. **Implement conversion utilities**
   ```typescript
   export function convertSecondsToHours(seconds: number): number {
     return seconds / 3600;
   }

   export function convertHoursToSeconds(hours: number): number {
     return Math.floor(hours * 3600);
   }
   ```

### Acceptance Criteria
- ✅ All functions are pure (no side effects)
- ✅ Edge cases handled (negative values, zero, etc.)
- ✅ JSDoc comments with examples
- ✅ Manual testing with sample data

---

## Task 2.2: Timer Formatters

**File:** `src/modules/chat/timer/utils/timerFormatters.ts`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Implement formatSecondsToHHMMSS**
   ```typescript
   export function formatSecondsToHHMMSS(seconds: number): string {
     const h = Math.floor(seconds / 3600);
     const m = Math.floor((seconds % 3600) / 60);
     const s = seconds % 60;
     return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
   }
   ```

2. **Implement formatSecondsToHours**
   ```typescript
   export function formatSecondsToHours(seconds: number): string {
     const hours = (seconds / 3600).toFixed(2);
     return `${hours}h`;
   }
   ```

3. **Implement formatTimeInput**
   ```typescript
   export function formatTimeInput(hours: number, minutes: number): string {
     return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
   }
   ```

4. **Implement parseTimeInput**
   ```typescript
   export function parseTimeInput(timeString: string): { hours: number; minutes: number } {
     const [hours, minutes] = timeString.split(':').map(Number);
     return { hours: hours || 0, minutes: minutes || 0 };
   }
   ```

5. **Implement formatDateForDisplay**
   ```typescript
   export function formatDateForDisplay(date: Date): string {
     return date.toLocaleDateString('es-MX', {
       timeZone: 'America/Mexico_City',
       year: 'numeric',
       month: 'long',
       day: 'numeric'
     });
   }
   ```

### Acceptance Criteria
- ✅ All formatters return correct strings
- ✅ Edge cases handled (zero, negative, etc.)
- ✅ Test with various inputs

---

## Task 2.3: Timer Validation

**File:** `src/modules/chat/timer/utils/timerValidation.ts`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Import Zod**
   ```typescript
   import { z } from 'zod';
   ```

2. **Create timeInputSchema**
   ```typescript
   export const timeInputSchema = z
     .string()
     .min(1, { message: "La hora es requerida" })
     .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
       message: "Formato de hora inválido (HH:MM)"
     });
   ```

3. **Create dateInputSchema**
   ```typescript
   export const dateInputSchema = z
     .date({ required_error: "La fecha es requerida" })
     .refine((date) => {
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       return date <= today;
     }, { message: "No puedes añadir tiempo para fechas futuras" });
   ```

4. **Create commentInputSchema**
   ```typescript
   export const commentInputSchema = z.string().optional();
   ```

5. **Create combined timerFormSchema**
   ```typescript
   export const timerFormSchema = z.object({
     time: timeInputSchema,
     date: dateInputSchema,
     comment: commentInputSchema,
   });
   ```

6. **Create validation helpers**
   ```typescript
   export function validateTimeFormat(time: string): boolean {
     return timeInputSchema.safeParse(time).success;
   }

   export function validateDateNotFuture(date: Date): boolean {
     return dateInputSchema.safeParse(date).success;
   }
   ```

### Acceptance Criteria
- ✅ All schemas validate correctly
- ✅ Error messages are in Spanish
- ✅ Test with valid and invalid inputs

---

## Task 2.4: Timer Debounce Utilities

**File:** `src/modules/chat/timer/utils/timerDebounce.ts`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Implement createDebouncedFunction**
   ```typescript
   export function createDebouncedFunction<T extends (...args: any[]) => any>(
     fn: T,
     delay: number
   ): T {
     let timeoutId: NodeJS.Timeout | null = null;

     return ((...args: Parameters<T>) => {
       if (timeoutId) clearTimeout(timeoutId);
       timeoutId = setTimeout(() => fn(...args), delay);
     }) as T;
   }
   ```

2. **Implement useDebouncedCallback hook**
   ```typescript
   export function useDebouncedCallback<T extends (...args: any[]) => any>(
     callback: T,
     delay: number
   ): T {
     const callbackRef = useRef(callback);
     const timeoutRef = useRef<NodeJS.Timeout | null>(null);

     useEffect(() => {
       callbackRef.current = callback;
     }, [callback]);

     useEffect(() => {
       return () => {
         if (timeoutRef.current) {
           clearTimeout(timeoutRef.current);
         }
       };
     }, []);

     return useCallback(
       ((...args) => {
         if (timeoutRef.current) {
           clearTimeout(timeoutRef.current);
         }
         timeoutRef.current = setTimeout(() => {
           callbackRef.current(...args);
         }, delay);
       }) as T,
       [delay]
     );
   }
   ```

3. **Implement useDebouncedValue hook**
   ```typescript
   export function useDebouncedValue<T>(value: T, delay: number): T {
     const [debouncedValue, setDebouncedValue] = useState(value);

     useEffect(() => {
       const timeoutId = setTimeout(() => {
         setDebouncedValue(value);
       }, delay);

       return () => clearTimeout(timeoutId);
     }, [value, delay]);

     return debouncedValue;
   }
   ```

### Acceptance Criteria
- ✅ Debounce delays execution correctly
- ✅ Cleanup on unmount works
- ✅ Test with rapid changes

---

## Task 2.5: Timer Retry Service

**File:** `src/modules/chat/timer/services/timerRetry.ts`
**Estimated Time:** 1 hour

### Implementation Steps

1. **Define RetryOptions interface**
   ```typescript
   export interface RetryOptions {
     maxAttempts?: number;
     baseDelay?: number;
     maxDelay?: number;
     onRetry?: (attempt: number, error: Error) => void;
   }
   ```

2. **Implement exponential backoff calculation**
   ```typescript
   function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
     const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
     // Add jitter (random variance)
     return delay + Math.random() * 1000;
   }
   ```

3. **Implement error classification**
   ```typescript
   function isRetryableError(error: Error): boolean {
     // Network errors, timeout errors, etc.
     const retryableMessages = ['network', 'timeout', 'unavailable'];
     return retryableMessages.some(msg =>
       error.message.toLowerCase().includes(msg)
     );
   }
   ```

4. **Implement retryWithBackoff**
   ```typescript
   export async function retryWithBackoff<T>(
     operation: () => Promise<T>,
     options: RetryOptions = {}
   ): Promise<T> {
     const {
       maxAttempts = MAX_RETRY_ATTEMPTS,
       baseDelay = RETRY_DELAY_BASE_MS,
       maxDelay = 30000,
       onRetry,
     } = options;

     let lastError: Error;

     for (let attempt = 0; attempt < maxAttempts; attempt++) {
       try {
         return await operation();
       } catch (error) {
         lastError = error as Error;

         // Don't retry non-retryable errors
         if (!isRetryableError(lastError)) {
           throw lastError;
         }

         // Don't retry on last attempt
         if (attempt === maxAttempts - 1) {
           throw lastError;
         }

         // Call retry callback
         if (onRetry) {
           onRetry(attempt + 1, lastError);
         }

         // Wait before retrying
         const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }

     throw lastError!;
   }
   ```

### Acceptance Criteria
- ✅ Retry logic works with exponential backoff
- ✅ Non-retryable errors throw immediately
- ✅ Max attempts respected
- ✅ Test with failing operations

---

## Task 2.6: Timer Cache Service

**File:** `src/modules/chat/timer/services/timerCache.ts`
**Estimated Time:** 1 hour

### Implementation Steps

1. **Define CacheEntry interface**
   ```typescript
   interface CacheEntry<T> {
     data: T;
     timestamp: number;
     hasPendingWrites: boolean;
   }
   ```

2. **Implement TimerCache class**
   ```typescript
   class TimerCache {
     private cache: Map<string, CacheEntry<TimerDocument>>;
     private ttl: number; // Time to live in milliseconds

     constructor(ttl: number = 60000) {
       this.cache = new Map();
       this.ttl = ttl;
     }

     get(timerId: string): TimerDocument | null {
       const entry = this.cache.get(timerId);
       if (!entry) return null;

       // Check if expired
       if (Date.now() - entry.timestamp > this.ttl) {
         this.cache.delete(timerId);
         return null;
       }

       return entry.data;
     }

     set(timerId: string, data: TimerDocument, hasPendingWrites: boolean = false): void {
       this.cache.set(timerId, {
         data,
         timestamp: Date.now(),
         hasPendingWrites,
       });
     }

     invalidate(timerId: string): void {
       this.cache.delete(timerId);
     }

     invalidateAll(): void {
       this.cache.clear();
     }

     hasPendingWrites(timerId: string): boolean {
       const entry = this.cache.get(timerId);
       return entry?.hasPendingWrites ?? false;
     }
   }
   ```

3. **Create singleton instance**
   ```typescript
   export const timerCache = new TimerCache();
   ```

4. **Implement cache-first strategy helper**
   ```typescript
   export async function getCachedOrFetch<T>(
     key: string,
     fetchFn: () => Promise<T>,
     cache: TimerCache
   ): Promise<T> {
     // Try cache first
     const cached = cache.get(key);
     if (cached) return cached as T;

     // Fetch from network
     const data = await fetchFn();
     cache.set(key, data as any);
     return data;
   }
   ```

### Acceptance Criteria
- ✅ Cache stores and retrieves data correctly
- ✅ TTL expiration works
- ✅ Pending writes tracked correctly
- ✅ Test with multiple entries

---

## Task 2.7: Timer Firebase Service

**File:** `src/modules/chat/timer/services/timerFirebase.ts`
**Estimated Time:** 2 hours

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import {
     doc,
     getDoc,
     setDoc,
     updateDoc,
     deleteDoc,
     collection,
     query,
     where,
     onSnapshot,
     writeBatch,
     runTransaction,
     Timestamp,
     serverTimestamp,
     increment,
   } from 'firebase/firestore';
   import { db } from '@/lib/firebase';
   import type { TimerDocument, TimerInterval } from '../types/timer.types';
   import { TIMER_COLLECTION_NAME, TASKS_COLLECTION_NAME } from '../utils/timerConstants';
   ```

2. **Implement createTimer**
   ```typescript
   export async function createTimer(userId: string, taskId: string): Promise<string> {
     const timerId = `${userId}_${taskId}_${Date.now()}`;
     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);

     const timerData: Partial<TimerDocument> = {
       id: timerId,
       userId,
       taskId,
       status: TimerStatus.IDLE,
       startedAt: null,
       pausedAt: null,
       totalSeconds: 0,
       intervals: [],
       deviceId: generateDeviceId(),
       lastSync: serverTimestamp(),
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp(),
     };

     await setDoc(timerRef, timerData);
     return timerId;
   }
   ```

3. **Implement CRUD operations**
   ```typescript
   export async function getTimer(timerId: string): Promise<TimerDocument | null> {
     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
     const timerSnap = await getDoc(timerRef);

     if (!timerSnap.exists()) return null;

     return { id: timerSnap.id, ...timerSnap.data() } as TimerDocument;
   }

   export async function updateTimer(
     timerId: string,
     data: Partial<TimerDocument>
   ): Promise<void> {
     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
     await updateDoc(timerRef, {
       ...data,
       updatedAt: serverTimestamp(),
     });
   }

   export async function deleteTimer(timerId: string): Promise<void> {
     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
     await deleteDoc(timerRef);
   }
   ```

4. **Implement state operations**
   ```typescript
   export async function startTimerInFirestore(timerId: string): Promise<void> {
     await updateTimer(timerId, {
       status: TimerStatus.RUNNING,
       startedAt: serverTimestamp(),
       pausedAt: null,
       lastSync: serverTimestamp(),
     });
   }

   export async function pauseTimerInFirestore(
     timerId: string,
     interval: TimerInterval
   ): Promise<void> {
     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
     const timerSnap = await getDoc(timerRef);

     if (!timerSnap.exists()) throw new Error('Timer not found');

     const currentData = timerSnap.data() as TimerDocument;
     const newIntervals = [...currentData.intervals, interval];

     await updateTimer(timerId, {
       status: TimerStatus.PAUSED,
       pausedAt: serverTimestamp(),
       intervals: newIntervals,
       totalSeconds: increment(interval.duration),
       lastSync: serverTimestamp(),
     });
   }

   export async function stopTimerInFirestore(
     timerId: string,
     finalInterval: TimerInterval
   ): Promise<void> {
     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
     const timerSnap = await getDoc(timerRef);

     if (!timerSnap.exists()) throw new Error('Timer not found');

     const currentData = timerSnap.data() as TimerDocument;
     const newIntervals = [...currentData.intervals, finalInterval];
     const finalSeconds = currentData.totalSeconds + finalInterval.duration;

     // Update timer
     await updateTimer(timerId, {
       status: TimerStatus.STOPPED,
       intervals: newIntervals,
       totalSeconds: finalSeconds,
       lastSync: serverTimestamp(),
     });

     // Update task aggregates
     await updateTaskAggregates(currentData.taskId, currentData.userId, finalSeconds);
   }
   ```

5. **Implement batch operations**
   ```typescript
   export async function updateTaskAggregates(
     taskId: string,
     userId: string,
     seconds: number
   ): Promise<void> {
     const batch = writeBatch(db);
     const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

     batch.update(taskRef, {
       totalHours: increment(seconds / 3600),
       [`memberHours.${userId}`]: increment(seconds / 3600),
       lastUpdated: serverTimestamp(),
     });

     await batch.commit();
   }

   export async function batchStopTimer(
     timerId: string,
     taskId: string,
     userId: string,
     interval: TimerInterval
   ): Promise<void> {
     const batch = writeBatch(db);

     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
     const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

     // Get current timer data
     const timerSnap = await getDoc(timerRef);
     if (!timerSnap.exists()) throw new Error('Timer not found');

     const currentData = timerSnap.data() as TimerDocument;
     const newIntervals = [...currentData.intervals, interval];
     const finalSeconds = currentData.totalSeconds + interval.duration;

     // Update timer
     batch.update(timerRef, {
       status: TimerStatus.STOPPED,
       intervals: newIntervals,
       totalSeconds: finalSeconds,
       lastSync: serverTimestamp(),
       updatedAt: serverTimestamp(),
     });

     // Update task aggregates
     batch.update(taskRef, {
       totalHours: increment(finalSeconds / 3600),
       [`memberHours.${userId}`]: increment(finalSeconds / 3600),
       lastUpdated: serverTimestamp(),
     });

     await batch.commit();
   }
   ```

6. **Implement transaction operations**
   ```typescript
   export async function addTimeToTaskTransaction(
     taskId: string,
     userId: string,
     seconds: number
   ): Promise<void> {
     const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

     await runTransaction(db, async (transaction) => {
       const taskDoc = await transaction.get(taskRef);

       if (!taskDoc.exists()) {
         throw new Error('Task does not exist');
       }

       const currentTotal = taskDoc.data().totalHours || 0;
       const currentUserHours = taskDoc.data().memberHours?.[userId] || 0;

       transaction.update(taskRef, {
         totalHours: currentTotal + (seconds / 3600),
         [`memberHours.${userId}`]: currentUserHours + (seconds / 3600),
         lastUpdated: serverTimestamp(),
       });
     });
   }
   ```

7. **Implement real-time listeners**
   ```typescript
   export function listenToTimer(
     timerId: string,
     callback: (data: TimerDocument | null) => void
   ): () => void {
     const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);

     const unsubscribe = onSnapshot(
       timerRef,
       { includeMetadataChanges: true },
       (snapshot) => {
         if (!snapshot.exists()) {
           callback(null);
           return;
         }

         const data = { id: snapshot.id, ...snapshot.data() } as TimerDocument;
         const hasPendingWrites = snapshot.metadata.hasPendingWrites;

         // Update cache
         timerCache.set(timerId, data, hasPendingWrites);

         callback(data);
       },
       (error) => {
         console.error('Error listening to timer:', error);
       }
     );

     return unsubscribe;
   }

   export function listenToTaskTimers(
     taskId: string,
     callback: (timers: TimerDocument[]) => void
   ): () => void {
     const q = query(
       collection(db, TIMER_COLLECTION_NAME),
       where('taskId', '==', taskId)
     );

     const unsubscribe = onSnapshot(
       q,
       (snapshot) => {
         const timers: TimerDocument[] = [];
         snapshot.forEach((doc) => {
           timers.push({ id: doc.id, ...doc.data() } as TimerDocument);
         });
         callback(timers);
       },
       (error) => {
         console.error('Error listening to task timers:', error);
       }
     );

     return unsubscribe;
   }
   ```

8. **Implement query operations**
   ```typescript
   export async function getActiveTimersForTask(taskId: string): Promise<TimerDocument[]> {
     const q = query(
       collection(db, TIMER_COLLECTION_NAME),
       where('taskId', '==', taskId),
       where('status', '==', TimerStatus.RUNNING)
     );

     const snapshot = await getDocs(q);
     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimerDocument));
   }

   export async function getUserTimerForTask(
     userId: string,
     taskId: string
   ): Promise<TimerDocument | null> {
     const q = query(
       collection(db, TIMER_COLLECTION_NAME),
       where('userId', '==', userId),
       where('taskId', '==', taskId)
     );

     const snapshot = await getDocs(q);
     if (snapshot.empty) return null;

     const doc = snapshot.docs[0];
     return { id: doc.id, ...doc.data() } as TimerDocument;
   }
   ```

9. **Implement helper function**
   ```typescript
   function generateDeviceId(): string {
     if (typeof window !== 'undefined' && typeof crypto !== 'undefined' && crypto.randomUUID) {
       return crypto.randomUUID();
     }
     return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
   }
   ```

### Acceptance Criteria
- ✅ All CRUD operations work
- ✅ Batch writes are atomic
- ✅ Real-time listeners update correctly
- ✅ Error handling implemented
- ✅ Test with Firestore emulator

---

# PHASE 3: State Management

**Estimated Time:** 2-3 hours
**Files:** 2
**Dependencies:** Phase 1 & 2

## Task 3.1: Timer State Store

**File:** `src/modules/chat/timer/stores/timerStateStore.ts`
**Estimated Time:** 1.5 hours

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import { create } from 'zustand';
   import { persist } from 'zustand/middleware';
   import type { LocalTimerState, TimerStatus, TimerInterval } from '../types/timer.types';
   ```

2. **Define store state interface**
   ```typescript
   interface TimerStateStore {
     // State
     activeTimers: Record<string, LocalTimerState>;
     currentTaskId: string | null;
     currentUserId: string | null;
     isInitialized: boolean;

     // Actions
     setCurrentTask: (taskId: string, userId: string) => void;
     setTimerState: (taskId: string, state: LocalTimerState) => void;
     updateTimerSeconds: (taskId: string, seconds: number) => void;
     addInterval: (taskId: string, interval: TimerInterval) => void;
     clearTimer: (taskId: string) => void;
     resetStore: () => void;
     setInitialized: (value: boolean) => void;

     // Selectors
     getTimerForTask: (taskId: string) => LocalTimerState | undefined;
     getIsTimerRunning: (taskId: string) => boolean;
     getAllActiveTimers: () => LocalTimerState[];
   }
   ```

3. **Create store**
   ```typescript
   export const useTimerStateStore = create<TimerStateStore>()(
     persist(
       (set, get) => ({
         // Initial state
         activeTimers: {},
         currentTaskId: null,
         currentUserId: null,
         isInitialized: false,

         // Actions
         setCurrentTask: (taskId, userId) => set({
           currentTaskId: taskId,
           currentUserId: userId
         }),

         setTimerState: (taskId, state) => set((prev) => ({
           activeTimers: {
             ...prev.activeTimers,
             [taskId]: state,
           },
         })),

         updateTimerSeconds: (taskId, seconds) => set((prev) => {
           const timer = prev.activeTimers[taskId];
           if (!timer) return prev;

           return {
             activeTimers: {
               ...prev.activeTimers,
               [taskId]: {
                 ...timer,
                 accumulatedSeconds: seconds,
               },
             },
           };
         }),

         addInterval: (taskId, interval) => set((prev) => {
           const timer = prev.activeTimers[taskId];
           if (!timer) return prev;

           return {
             activeTimers: {
               ...prev.activeTimers,
               [taskId]: {
                 ...timer,
                 intervals: [...timer.intervals, interval],
               },
             },
           };
         }),

         clearTimer: (taskId) => set((prev) => {
           const { [taskId]: removed, ...rest } = prev.activeTimers;
           return { activeTimers: rest };
         }),

         resetStore: () => set({
           activeTimers: {},
           currentTaskId: null,
           currentUserId: null,
           isInitialized: false,
         }),

         setInitialized: (value) => set({ isInitialized: value }),

         // Selectors
         getTimerForTask: (taskId) => get().activeTimers[taskId],

         getIsTimerRunning: (taskId) => {
           const timer = get().activeTimers[taskId];
           return timer?.status === 'running';
         },

         getAllActiveTimers: () => Object.values(get().activeTimers),
       }),
       {
         name: 'timer-state-storage',
         partialize: (state) => ({
           activeTimers: state.activeTimers,
           currentTaskId: state.currentTaskId,
           currentUserId: state.currentUserId,
         }),
       }
     )
   );
   ```

### Acceptance Criteria
- ✅ Store updates state correctly
- ✅ Persist middleware works
- ✅ Selectors return correct values
- ✅ Test state mutations

---

## Task 3.2: Timer Sync Store

**File:** `src/modules/chat/timer/stores/timerSyncStore.ts`
**Estimated Time:** 1 hour

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import { create } from 'zustand';
   ```

2. **Define store state interface**
   ```typescript
   interface TimerSyncStore {
     // State
     syncStatus: 'idle' | 'syncing' | 'error';
     lastSyncTimestamp: number | null;
     pendingWrites: Record<string, boolean>;
     errors: Record<string, Error>;
     isOnline: boolean;

     // Actions
     setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
     setLastSyncTimestamp: (timestamp: number) => void;
     addPendingWrite: (timerId: string) => void;
     removePendingWrite: (timerId: string) => void;
     setError: (timerId: string, error: Error) => void;
     clearError: (timerId: string) => void;
     setOnlineStatus: (isOnline: boolean) => void;
     resetSyncStore: () => void;

     // Selectors
     getIsSyncing: () => boolean;
     hasPendingWrites: (timerId: string) => boolean;
     getError: (timerId: string) => Error | undefined;
   }
   ```

3. **Create store**
   ```typescript
   export const useTimerSyncStore = create<TimerSyncStore>((set, get) => ({
     // Initial state
     syncStatus: 'idle',
     lastSyncTimestamp: null,
     pendingWrites: {},
     errors: {},
     isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

     // Actions
     setSyncStatus: (status) => set({ syncStatus: status }),

     setLastSyncTimestamp: (timestamp) => set({ lastSyncTimestamp: timestamp }),

     addPendingWrite: (timerId) => set((prev) => ({
       pendingWrites: {
         ...prev.pendingWrites,
         [timerId]: true,
       },
     })),

     removePendingWrite: (timerId) => set((prev) => {
       const { [timerId]: removed, ...rest } = prev.pendingWrites;
       return { pendingWrites: rest };
     }),

     setError: (timerId, error) => set((prev) => ({
       errors: {
         ...prev.errors,
         [timerId]: error,
       },
       syncStatus: 'error',
     })),

     clearError: (timerId) => set((prev) => {
       const { [timerId]: removed, ...rest } = prev.errors;
       return { errors: rest };
     }),

     setOnlineStatus: (isOnline) => set({ isOnline }),

     resetSyncStore: () => set({
       syncStatus: 'idle',
       lastSyncTimestamp: null,
       pendingWrites: {},
       errors: {},
     }),

     // Selectors
     getIsSyncing: () => get().syncStatus === 'syncing',

     hasPendingWrites: (timerId) => Boolean(get().pendingWrites[timerId]),

     getError: (timerId) => get().errors[timerId],
   }));
   ```

### Acceptance Criteria
- ✅ Store tracks sync status correctly
- ✅ Pending writes tracked per timer
- ✅ Errors stored and retrievable
- ✅ Online status updates

---

# PHASE 4: Hooks Layer

**Estimated Time:** 3-4 hours
**Files:** 5
**Dependencies:** Phase 1, 2, & 3

## Task 4.1: useTimerState Hook

**File:** `src/modules/chat/timer/hooks/useTimerState.ts`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import { useMemo } from 'react';
   import { useShallow } from 'zustand/react/shallow';
   import { useTimerStateStore } from '../stores/timerStateStore';
   import type { UseTimerStateReturn } from '../types/timer.types';
   ```

2. **Implement hook**
   ```typescript
   export function useTimerState(taskId: string): UseTimerStateReturn {
     const timer = useTimerStateStore(
       useShallow((state) => state.getTimerForTask(taskId))
     );

     return useMemo(() => ({
       timerSeconds: timer?.accumulatedSeconds ?? 0,
       isRunning: timer?.status === 'running',
       isPaused: timer?.status === 'paused',
       intervals: timer?.intervals ?? [],
       status: timer?.status ?? 'idle',
       lastSyncTime: timer?.lastSyncTime ?? null,
     }), [timer]);
   }
   ```

### Acceptance Criteria
- ✅ Hook returns correct state
- ✅ Memoization works
- ✅ Re-renders only when state changes

---

## Task 4.2: useTimerActions Hook

**File:** `src/modules/chat/timer/hooks/useTimerActions.ts`
**Estimated Time:** 1.5 hours

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import { useState, useCallback } from 'react';
   import { useTimerStateStore } from '../stores/timerStateStore';
   import { useTimerSyncStore } from '../stores/timerSyncStore';
   import {
     startTimerInFirestore,
     pauseTimerInFirestore,
     batchStopTimer,
     deleteTimer,
   } from '../services/timerFirebase';
   import { calculateElapsedSeconds } from '../services/timerCalculations';
   import { retryWithBackoff } from '../services/timerRetry';
   import { TimerStatus } from '../types/timer.types';
   import type { UseTimerActionsReturn, TimerInterval } from '../types/timer.types';
   ```

2. **Implement hook**
   ```typescript
   export function useTimerActions(taskId: string, userId: string): UseTimerActionsReturn {
     const [isProcessing, setIsProcessing] = useState(false);

     const {
       setTimerState,
       updateTimerSeconds,
       addInterval,
       clearTimer,
       getTimerForTask,
     } = useTimerStateStore();

     const {
       setSyncStatus,
       addPendingWrite,
       removePendingWrite,
       setError,
       clearError,
     } = useTimerSyncStore();

     const startTimer = useCallback(async () => {
       try {
         setIsProcessing(true);

         // Get current timer
         const currentTimer = getTimerForTask(taskId);
         if (currentTimer?.status === TimerStatus.RUNNING) {
           throw new Error('Timer is already running');
         }

         const timerId = currentTimer?.timerId || `${userId}_${taskId}_${Date.now()}`;
         const now = new Date();

         // Optimistic update
         setTimerState(taskId, {
           timerId,
           taskId,
           userId,
           status: TimerStatus.RUNNING,
           startedAt: now,
           pausedAt: null,
           accumulatedSeconds: currentTimer?.accumulatedSeconds ?? 0,
           intervals: currentTimer?.intervals ?? [],
           lastSyncTime: performance.now(),
         });

         // Mark as pending
         addPendingWrite(timerId);
         setSyncStatus('syncing');

         // Sync to Firebase with retry
         await retryWithBackoff(() => startTimerInFirestore(timerId));

         // Success
         removePendingWrite(timerId);
         setSyncStatus('idle');
         clearError(timerId);
       } catch (error) {
         console.error('Error starting timer:', error);
         setError(taskId, error as Error);
         throw error;
       } finally {
         setIsProcessing(false);
       }
     }, [taskId, userId, getTimerForTask, setTimerState, addPendingWrite, setSyncStatus, removePendingWrite, clearError, setError]);

     const pauseTimer = useCallback(async () => {
       try {
         setIsProcessing(true);

         const currentTimer = getTimerForTask(taskId);
         if (!currentTimer || currentTimer.status !== TimerStatus.RUNNING) {
           throw new Error('Timer is not running');
         }

         const now = new Date();
         const elapsed = calculateElapsedSeconds(currentTimer.startedAt!, now);

         const interval: TimerInterval = {
           start: currentTimer.startedAt!,
           end: now,
           duration: elapsed,
         };

         // Optimistic update
         setTimerState(taskId, {
           ...currentTimer,
           status: TimerStatus.PAUSED,
           pausedAt: now,
           accumulatedSeconds: currentTimer.accumulatedSeconds + elapsed,
         });
         addInterval(taskId, interval);

         // Mark as pending
         addPendingWrite(currentTimer.timerId);
         setSyncStatus('syncing');

         // Sync to Firebase with retry
         await retryWithBackoff(() =>
           pauseTimerInFirestore(currentTimer.timerId, interval)
         );

         // Success
         removePendingWrite(currentTimer.timerId);
         setSyncStatus('idle');
         clearError(currentTimer.timerId);
       } catch (error) {
         console.error('Error pausing timer:', error);
         setError(taskId, error as Error);
         throw error;
       } finally {
         setIsProcessing(false);
       }
     }, [taskId, getTimerForTask, setTimerState, addInterval, addPendingWrite, setSyncStatus, removePendingWrite, clearError, setError]);

     const stopTimer = useCallback(async () => {
       try {
         setIsProcessing(true);

         const currentTimer = getTimerForTask(taskId);
         if (!currentTimer) {
           throw new Error('No active timer');
         }

         let finalInterval: TimerInterval | null = null;
         let finalSeconds = currentTimer.accumulatedSeconds;

         // If running, calculate final interval
         if (currentTimer.status === TimerStatus.RUNNING && currentTimer.startedAt) {
           const now = new Date();
           const elapsed = calculateElapsedSeconds(currentTimer.startedAt, now);
           finalInterval = {
             start: currentTimer.startedAt,
             end: now,
             duration: elapsed,
           };
           finalSeconds += elapsed;
         }

         // Optimistic update - clear local state
         clearTimer(taskId);

         // Mark as pending
         addPendingWrite(currentTimer.timerId);
         setSyncStatus('syncing');

         // Sync to Firebase with retry (batch operation includes aggregates)
         if (finalInterval) {
           await retryWithBackoff(() =>
             batchStopTimer(currentTimer.timerId, taskId, userId, finalInterval!)
           );
         } else {
           await retryWithBackoff(() => deleteTimer(currentTimer.timerId));
         }

         // Success
         removePendingWrite(currentTimer.timerId);
         setSyncStatus('idle');
         clearError(currentTimer.timerId);
       } catch (error) {
         console.error('Error stopping timer:', error);
         setError(taskId, error as Error);
         throw error;
       } finally {
         setIsProcessing(false);
       }
     }, [taskId, userId, getTimerForTask, clearTimer, addPendingWrite, setSyncStatus, removePendingWrite, clearError, setError]);

     const resetTimer = useCallback(async () => {
       try {
         setIsProcessing(true);

         const currentTimer = getTimerForTask(taskId);
         if (!currentTimer) return;

         // Clear local state
         clearTimer(taskId);

         // Delete from Firebase
         await retryWithBackoff(() => deleteTimer(currentTimer.timerId));

         clearError(currentTimer.timerId);
       } catch (error) {
         console.error('Error resetting timer:', error);
         setError(taskId, error as Error);
         throw error;
       } finally {
         setIsProcessing(false);
       }
     }, [taskId, getTimerForTask, clearTimer, clearError, setError]);

     return {
       startTimer,
       pauseTimer,
       stopTimer,
       resetTimer,
       isProcessing,
     };
   }
   ```

### Acceptance Criteria
- ✅ All actions work correctly
- ✅ Optimistic updates applied
- ✅ Firebase sync happens
- ✅ Errors handled gracefully
- ✅ Test each action

---

## Task 4.3: useTimerSync Hook

**File:** `src/modules/chat/timer/hooks/useTimerSync.ts`
**Estimated Time:** 1.5 hours

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import { useEffect, useCallback, useState } from 'react';
   import { useTimerStateStore } from '../stores/timerStateStore';
   import { useTimerSyncStore } from '../stores/timerSyncStore';
   import {
     getUserTimerForTask,
     listenToTimer,
   } from '../services/timerFirebase';
   import { calculateElapsedSeconds } from '../services/timerCalculations';
   import { retryWithBackoff } from '../services/timerRetry';
   import type { UseTimerSyncReturn, TimerDocument } from '../types/timer.types';
   ```

2. **Implement hook**
   ```typescript
   export function useTimerSync(
     taskId: string,
     userId: string,
     enabled: boolean = true
   ): UseTimerSyncReturn {
     const [syncError, setSyncError] = useState<Error | null>(null);

     const { setTimerState, setInitialized, getTimerForTask } = useTimerStateStore();
     const {
       syncStatus,
       lastSyncTimestamp,
       setSyncStatus,
       setLastSyncTimestamp,
       setOnlineStatus,
       getError,
     } = useTimerSyncStore();

     // Initialize timer from Firebase
     useEffect(() => {
       if (!enabled || !taskId || !userId) return;

       let mounted = true;

       const initializeTimer = async () => {
         try {
           setSyncStatus('syncing');

           const timerDoc = await retryWithBackoff(() =>
             getUserTimerForTask(userId, taskId)
           );

           if (!mounted) return;

           if (timerDoc) {
             // Convert Firestore document to local state
             const localState = convertFirestoreToLocal(timerDoc);
             setTimerState(taskId, localState);
           }

           setInitialized(true);
           setSyncStatus('idle');
         } catch (error) {
           console.error('Error initializing timer:', error);
           setSyncError(error as Error);
           setSyncStatus('error');
         }
       };

       initializeTimer();

       return () => {
         mounted = false;
       };
     }, [enabled, taskId, userId, setTimerState, setInitialized, setSyncStatus]);

     // Set up real-time listener
     useEffect(() => {
       if (!enabled || !taskId || !userId) return;

       const currentTimer = getTimerForTask(taskId);
       if (!currentTimer) return;

       const unsubscribe = listenToTimer(
         currentTimer.timerId,
         (timerDoc) => {
           if (!timerDoc) return;

           // Check if this update is from another device
           const deviceId = generateDeviceId(); // Should be stored somewhere
           if (timerDoc.deviceId === deviceId) return;

           // Update from another device - sync local state
           const localState = convertFirestoreToLocal(timerDoc);
           setTimerState(taskId, localState);
           setLastSyncTimestamp(performance.now());
         }
       );

       return () => {
         unsubscribe();
       };
     }, [enabled, taskId, userId, getTimerForTask, setTimerState, setLastSyncTimestamp]);

     // Handle online/offline events
     useEffect(() => {
       const handleOnline = () => {
         setOnlineStatus(true);
         // Retry pending operations
       };

       const handleOffline = () => {
         setOnlineStatus(false);
       };

       window.addEventListener('online', handleOnline);
       window.addEventListener('offline', handleOffline);

       return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
       };
     }, [setOnlineStatus]);

     const retrySyncManually = useCallback(async () => {
       // Re-initialize timer
       try {
         setSyncStatus('syncing');
         const timerDoc = await getUserTimerForTask(userId, taskId);
         if (timerDoc) {
           const localState = convertFirestoreToLocal(timerDoc);
           setTimerState(taskId, localState);
         }
         setSyncStatus('idle');
         setSyncError(null);
       } catch (error) {
         setSyncError(error as Error);
         setSyncStatus('error');
       }
     }, [taskId, userId, setTimerState, setSyncStatus]);

     return {
       isSyncing: syncStatus === 'syncing',
       syncError: syncError || getError(taskId) || null,
       lastSyncTime: lastSyncTimestamp,
       retrySyncManually,
     };
   }

   // Helper function to convert Firestore document to local state
   function convertFirestoreToLocal(doc: TimerDocument): LocalTimerState {
     return {
       timerId: doc.id,
       taskId: doc.taskId,
       userId: doc.userId,
       status: doc.status,
       startedAt: doc.startedAt?.toDate() ?? null,
       pausedAt: doc.pausedAt?.toDate() ?? null,
       accumulatedSeconds: doc.totalSeconds,
       intervals: doc.intervals.map(interval => ({
         start: new Date(interval.start),
         end: new Date(interval.end),
         duration: interval.duration,
       })),
       lastSyncTime: performance.now(),
     };
   }
   ```

### Acceptance Criteria
- ✅ Timer initializes from Firebase
- ✅ Real-time updates work
- ✅ Multi-device sync works
- ✅ Online/offline handled
- ✅ Manual retry works

---

## Task 4.4: useTimeEntry Hook

**File:** `src/modules/chat/timer/hooks/useTimeEntry.ts`
**Estimated Time:** 45 minutes

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import { useCallback, useMemo } from 'react';
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   import { timerFormSchema, DEFAULT_TIMER_VALUES } from '../utils';
   import { parseTimeInput } from '../utils/timerFormatters';
   import { addTimeToTaskTransaction } from '../services/timerFirebase';
   import type { UseTimeEntryReturn, TimeEntryFormData } from '../types/timer.types';
   ```

2. **Implement hook**
   ```typescript
   export function useTimeEntry(
     taskId: string,
     userId: string,
     onSuccess?: () => void
   ): UseTimeEntryReturn {
     const form = useForm<TimeEntryFormData>({
       resolver: zodResolver(timerFormSchema),
       defaultValues: DEFAULT_TIMER_VALUES,
       mode: 'onChange',
     });

     const submitTimeEntry = useCallback(async () => {
       try {
         // Validate form
         const isValid = await form.trigger();
         if (!isValid) {
           console.log('Form validation failed');
           return;
         }

         const values = form.getValues();

         // Parse time
         const { hours, minutes } = parseTimeInput(values.time);
         const totalSeconds = hours * 3600 + minutes * 60;

         if (totalSeconds === 0) {
           throw new Error('Time cannot be zero');
         }

         // Add time to task using transaction
         await addTimeToTaskTransaction(taskId, userId, totalSeconds);

         // TODO: Also create time entry message in chat
         // This will be integrated with chat message service

         // Reset form
         form.reset(DEFAULT_TIMER_VALUES);

         // Call success callback
         if (onSuccess) {
           onSuccess();
         }
       } catch (error) {
         console.error('Error submitting time entry:', error);
         throw error;
       }
     }, [form, taskId, userId, onSuccess]);

     const resetForm = useCallback(() => {
       form.reset(DEFAULT_TIMER_VALUES);
     }, [form]);

     const errors = useMemo(() => {
       const formErrors = form.formState.errors;
       return {
         time: formErrors.time?.message || '',
         date: formErrors.date?.message || '',
         comment: formErrors.comment?.message || '',
       };
     }, [form.formState.errors]);

     return {
       form,
       isSubmitting: form.formState.isSubmitting,
       submitTimeEntry,
       resetForm,
       errors,
     };
   }
   ```

### Acceptance Criteria
- ✅ Form validation works
- ✅ Time parsing correct
- ✅ Transaction completes
- ✅ Form resets after submit
- ✅ Errors displayed

---

## Task 4.5: useTimerOptimistic Hook

**File:** `src/modules/chat/timer/hooks/useTimerOptimistic.ts`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import { useMemo } from 'react';
   import { useTimerSyncStore } from '../stores/timerSyncStore';
   import { useTimerStateStore } from '../stores/timerStateStore';
   import type { UseTimerOptimisticReturn } from '../types/timer.types';
   ```

2. **Implement hook**
   ```typescript
   export function useTimerOptimistic(taskId: string): UseTimerOptimisticReturn {
     const { hasPendingWrites, getError, syncStatus } = useTimerSyncStore();
     const { getTimerForTask } = useTimerStateStore();

     const timer = getTimerForTask(taskId);
     const timerId = timer?.timerId || taskId;

     const isPending = hasPendingWrites(timerId);
     const error = getError(timerId);

     return useMemo(() => ({
       isOptimistic: isPending,
       hasPendingWrites: isPending,
       optimisticValue: timer?.accumulatedSeconds ?? null,
       confirmationStatus: error ? 'failed' : isPending ? 'pending' : 'confirmed',
     }), [isPending, error, timer]);
   }
   ```

### Acceptance Criteria
- ✅ Returns correct optimistic state
- ✅ Tracks pending writes
- ✅ Shows confirmation status
- ✅ Updates when state changes

---

# PHASE 5: Components Layer

**Estimated Time:** 4-5 hours
**Files:** 8
**Dependencies:** All previous phases

## Task 5.1: TimerButton Component

**File:** `src/modules/chat/timer/components/atoms/TimerButton.tsx`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import React from 'react';
   import Image from 'next/image';
   import styles from './TimerButton.module.scss';
   ```

2. **Define props interface**
   ```typescript
   interface TimerButtonProps {
     variant: 'start' | 'pause' | 'stop' | 'reset';
     onClick: () => void;
     disabled?: boolean;
     loading?: boolean;
     size?: 'small' | 'medium' | 'large';
     className?: string;
   }
   ```

3. **Implement component**
   ```typescript
   export const TimerButton: React.FC<TimerButtonProps> = ({
     variant,
     onClick,
     disabled = false,
     loading = false,
     size = 'medium',
     className = '',
   }) => {
     const iconMap = {
       start: '/Play.svg',
       pause: '/Stop.svg',
       stop: '/Stop.svg',
       reset: '/refresh.svg',
     };

     const labelMap = {
       start: 'Iniciar',
       pause: 'Pausar',
       stop: 'Detener',
       reset: 'Reiniciar',
     };

     return (
       <button
         type="button"
         className={`${styles.timerButton} ${styles[variant]} ${styles[size]} ${className}`}
         onClick={onClick}
         disabled={disabled || loading}
         aria-label={labelMap[variant]}
       >
         {loading ? (
           <span className={styles.spinner} />
         ) : (
           <Image
             src={iconMap[variant]}
             alt={labelMap[variant]}
             width={size === 'small' ? 12 : size === 'medium' ? 16 : 20}
             height={size === 'small' ? 12 : size === 'medium' ? 16 : 20}
           />
         )}
         <span>{labelMap[variant]}</span>
       </button>
     );
   };
   ```

4. **Create SCSS module**
   ```scss
   // src/modules/chat/timer/components/atoms/TimerButton.module.scss
   .timerButton {
     display: flex;
     align-items: center;
     gap: 8px;
     padding: 8px 16px;
     border: none;
     border-radius: 8px;
     cursor: pointer;
     transition: all 0.2s;
     font-weight: 500;

     &:disabled {
       opacity: 0.5;
       cursor: not-allowed;
     }

     &.start {
       background: #10b981;
       color: white;

       &:hover:not(:disabled) {
         background: #059669;
       }
     }

     &.pause {
       background: #f59e0b;
       color: white;

       &:hover:not(:disabled) {
         background: #d97706;
       }
     }

     &.stop {
       background: #ef4444;
       color: white;

       &:hover:not(:disabled) {
         background: #dc2626;
       }
     }

     &.reset {
       background: #6b7280;
       color: white;

       &:hover:not(:disabled) {
         background: #4b5563;
       }
     }

     &.small {
       padding: 4px 8px;
       font-size: 12px;
     }

     &.large {
       padding: 12px 24px;
       font-size: 16px;
     }
   }

   .spinner {
     width: 16px;
     height: 16px;
     border: 2px solid rgba(255, 255, 255, 0.3);
     border-top-color: white;
     border-radius: 50%;
     animation: spin 0.6s linear infinite;
   }

   @keyframes spin {
     to { transform: rotate(360deg); }
   }
   ```

### Acceptance Criteria
- ✅ Button renders with all variants
- ✅ Loading state shows spinner
- ✅ Disabled state works
- ✅ All sizes render correctly
- ✅ Hover states work

---

## Task 5.2: Migrate TimeInput Component

**File:** `src/modules/chat/timer/components/atoms/TimeInput.tsx`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Copy from existing file**
   - Copy `/src/components/ui/TimeInput.tsx`
   - Copy `/src/components/ui/TimeInput.module.scss`

2. **Update imports**
   - Update to use timer module types
   - Keep @number-flow/react import

3. **Add enhancements**
   - Add error prop and styling
   - Add accessibility improvements
   - Add JSDoc comments

### Acceptance Criteria
- ✅ Component works as before
- ✅ Animations smooth
- ✅ Error state displays
- ✅ Accessibility improved

---

## Task 5.3: Migrate TimerCounter Component

**File:** `src/modules/chat/timer/components/atoms/TimerCounter.tsx`
**Estimated Time:** 30 minutes

### Implementation Steps

1. **Copy from existing file**
   - Copy `/src/components/TimerCounter.tsx`
   - Copy `/src/components/TimerCounter.module.scss`

2. **Add optimistic UI**
   - Add pending indicator
   - Add sync status icon
   - Add error state

3. **Update types**
   - Use timer module types

### Acceptance Criteria
- ✅ Counter displays correctly
- ✅ Animations work
- ✅ Optimistic UI shows
- ✅ Sync status visible

---

## Task 5.4: DateSelector Component

**File:** `src/modules/chat/timer/components/molecules/DateSelector.tsx`
**Estimated Time:** 45 minutes

### Implementation Steps

1. **Import dependencies**
   ```typescript
   import React from 'react';
   import { DayPicker } from 'react-day-picker';
   import { es } from 'date-fns/locale';
   import 'react-day-picker/style.css';
   import styles from './DateSelector.module.scss';
   ```

2. **Define props**
   ```typescript
   interface DateSelectorProps {
     value: Date;
     onChange: (date: Date) => void;
     error?: string;
     disabled?: boolean;
   }
   ```

3. **Implement component**
   ```typescript
   export const DateSelector: React.FC<DateSelectorProps> = ({
     value,
     onChange,
     error,
     disabled = false,
   }) => {
     const handleSelect = (date: Date | undefined) => {
       if (date) {
         onChange(date);
       }
     };

     const today = new Date();
     today.setHours(0, 0, 0, 0);

     return (
       <div className={styles.dateSelectorContainer}>
         <DayPicker
           mode="single"
           selected={value}
           onSelect={handleSelect}
           locale={es}
           weekStartsOn={1}
           disabled={(date) => date > today || disabled}
           modifiers={{
             disabled: (date) => date > today,
           }}
           modifiersStyles={{
             disabled: {
               color: '#9ca3af',
               textDecoration: 'line-through',
               cursor: 'not-allowed',
             },
           }}
           className={styles.calendar}
         />
         {error && (
           <div className={styles.error}>
             {error}
           </div>
         )}
       </div>
     );
   };
   ```

4. **Create styles**
   ```scss
   // DateSelector.module.scss
   .dateSelectorContainer {
     .calendar {
       // Custom calendar styles
     }

     .error {
       color: #ef4444;
       font-size: 14px;
       margin-top: 8px;
       text-align: center;
     }
   }
   ```

### Acceptance Criteria
- ✅ Calendar displays correctly
- ✅ Future dates disabled
- ✅ Spanish locale works
- ✅ Error displays

---

## Task 5.5: TimeEntryForm Component

**File:** `src/modules/chat/timer/components/molecules/TimeEntryForm.tsx`
**Estimated Time:** 1 hour

### Implementation Steps

(Implementation details continue in similar fashion...)

### Due to length constraints, I'll create a summary section for remaining tasks:

---

# PHASE 5 (Continued): Remaining Components

## Task 5.6: TimerIntervalsList Component (45 min)
- Display list of timer sessions
- Show start/end times and duration
- Collapsible with "show more"

## Task 5.7: TimerDisplay Component (1 hour)
- Combine TimerCounter with controls
- Integrate all hooks
- Show sync status
- Handle loading/error states

## Task 5.8: TimerPanel Component (1.5 hours)
- Refactor from existing TimerPanel.tsx
- Use TimeEntryForm
- Add GSAP animations
- Integrate all features

---

# PHASE 6: Integration & Migration

**Estimated Time:** 2-3 hours

## Task 6.1: Update ChatSidebar (1 hour)
- Import from timer module
- Replace old imports
- Test integration

## Task 6.2: Cleanup Old Files (30 min)
- Archive old timer files
- Update imports across codebase
- Remove unused code

## Task 6.3: Update Exports (30 min)
- Verify all exports in index.ts
- Update documentation
- Create migration guide

---

# PHASE 7: Testing & Optimization

**Estimated Time:** 2-3 hours

## Task 7.1: Integration Testing (1 hour)
- Test all timer flows
- Test multi-device sync
- Test offline mode

## Task 7.2: Performance Optimization (1 hour)
- Profile re-renders
- Optimize memoization
- Test with slow network

## Task 7.3: Documentation (1 hour)
- Update README
- Document Firestore security rules
- Create usage examples

---

# 📝 Final Checklist

- [ ] All files created
- [ ] All TODOs implemented
- [ ] Types compile without errors
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Security rules documented
- [ ] Migration guide created
- [ ] Old files cleaned up

---

# 🎯 Success Criteria

1. **Functionality**
   - Timer starts/pauses/stops correctly
   - Multi-device sync works
   - Manual time entry works
   - Data persists correctly

2. **Code Quality**
   - Follows DRY principle
   - Follows SOLID principles
   - Well-typed with TypeScript
   - Properly documented

3. **Performance**
   - No unnecessary re-renders
   - Smooth animations
   - Fast Firebase operations
   - Minimal Firestore reads

4. **User Experience**
   - Responsive UI
   - Clear feedback
   - Error handling
   - Offline support

---

**Estimated Total Time:** 15-20 hours
**Recommended Approach:** Complete phases sequentially, testing each layer before moving up.

Good luck with the implementation! 🚀
