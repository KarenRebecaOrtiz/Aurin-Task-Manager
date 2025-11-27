# Timer Cleanup System

## Overview

This document describes how the timer module handles the deletion of tasks and prevents orphaned timers from persisting in the system.

## The Problem

When a task is deleted, several cleanup actions need to occur:

1. **Firestore**: Timer documents in the subcollection `tasks/{taskId}/timers/{userId}` need to be deleted
2. **Local State**: Timer state in the `timerStateStore` needs to be cleared
3. **UI**: Components displaying the timer need to handle the missing task gracefully

Previously, when a task was deleted:
- ❌ Timer subcollection documents were **not deleted** (orphaned in Firestore)
- ❌ Local timer state was **not cleared** (remained in store)
- ❌ UI showed the **raw task ID** instead of task name (poor UX)

## The Solution

We implemented a **two-layer defense strategy**:

### 1. Backend: Cascade Delete (Prevention)

**Location**: `src/app/api/tasks/[id]/route.ts:291-308`

When a task is deleted via the API, we automatically delete all associated timer documents:

```typescript
// CASCADE DELETE: Delete all timers for this task
const timersSnapshot = await adminDb
  .collection('tasks')
  .doc(taskId)
  .collection('timers')
  .get();

if (!timersSnapshot.empty) {
  const deletePromises = timersSnapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);
}

// Now delete the task
await adminDb.collection('tasks').doc(taskId).delete();
```

**Benefits**:
- ✅ Prevents orphaned timer documents in Firestore
- ✅ Keeps database clean and consistent
- ✅ Happens automatically on every task deletion
- ✅ Non-blocking (uses try-catch, won't fail the deletion if timers fail)

### 2. Frontend: Orphaned Timer Cleanup (Recovery)

**Location**: `src/modules/chat/timer/hooks/useOrphanedTimerCleanup.ts`

A React hook that monitors active timers and cleans up any that reference deleted tasks:

```typescript
import { useOrphanedTimerCleanup } from '@/modules/chat/timer';

function TasksView() {
  const tasks = useTasksStore(state => state.tasks);
  const taskIds = tasks.map(t => t.id);
  const userId = useUser().user?.id;

  // Automatically clean up orphaned timers
  useOrphanedTimerCleanup(taskIds, userId);

  return <TasksList tasks={tasks} />;
}
```

**How it works**:
1. Receives array of valid task IDs from the parent component
2. Compares against active timers in `timerStateStore`
3. Finds timers whose `taskId` is not in the valid list
4. Clears them from local state
5. Attempts to delete them from Firestore (silently fails if already deleted)

**Benefits**:
- ✅ Handles edge cases where backend cleanup failed
- ✅ Cleans up timers from deleted tasks (even from other sessions/devices)
- ✅ Runs automatically when task list changes
- ✅ No manual intervention required

**Integration**:
Already integrated in `TasksTableIsolated.tsx:26-27`:
```typescript
const taskIds = tasks.map(task => task.id);
useOrphanedTimerCleanup(taskIds, user?.id || null);
```

### 3. UI: Deleted Task Indicator (Graceful Degradation)

**Location**: `src/modules/header/components/ui/GeoClock/GeoClockWithTimer.tsx:103-120`

The timer display component now shows a warning when the task is deleted:

```typescript
// Task was deleted - show warning and cleanup option
if (!taskName && activeTaskId) {
  return (
    <div className={styles.deletedTaskContainer}>
      <div className={styles.deletedTaskHeader}>
        <span>⚠️ Tarea eliminada</span>
      </div>
      <div className={styles.deletedTaskActions}>
        <button onClick={handleCleanupTimer}>
          Limpiar timer
        </button>
      </div>
    </div>
  );
}
```

**Benefits**:
- ✅ Clear visual feedback when a task is deleted
- ✅ Manual cleanup option for users
- ✅ No more cryptic task IDs displayed
- ✅ Styled differently (red/warning colors) to indicate problem

## System Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User deletes task via DELETE /api/tasks/:id                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ 1. Backend Cascade Delete   │
        │    - Delete all timers      │
        │    - Delete task document   │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ 2. Frontend Detects Change  │
        │    - Task list updates      │
        │    - useOrphanedTimerCleanup│
        │      triggered              │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ 3. Cleanup Orphaned Timers  │
        │    - Clear local state      │
        │    - Delete from Firestore  │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ 4. UI Updates               │
        │    - Timer disappears OR    │
        │    - Shows "Tarea eliminada"│
        └─────────────────────────────┘
```

## Edge Cases Handled

### Case 1: Task deleted while timer is running
- Backend deletes timer document
- Frontend cleanup runs on next task list update
- UI shows "Tarea eliminada" until cleanup completes
- User can manually clean up via button

### Case 2: Task deleted in another tab/device
- Backend deletes timer document
- Firebase realtime listener detects deletion
- `useTimerSync` hook updates local state
- Timer disappears from UI

### Case 3: Backend timer deletion fails
- Task is deleted successfully
- Timer subcollection deletion fails (network error, permissions, etc.)
- Frontend cleanup hook detects orphaned timer on next render
- Attempts cleanup from frontend
- If still fails, shows manual cleanup button

### Case 4: User is offline when task is deleted
- Backend deletes everything when online
- When user comes back online:
  - Task list syncs (task is gone)
  - Orphaned timer cleanup runs
  - Timer is removed from local state

## Testing Scenarios

### Scenario 1: Normal deletion
1. Create a task
2. Start a timer on it
3. Delete the task
4. **Expected**: Timer disappears immediately, no orphaned documents

### Scenario 2: Edge case - orphaned timer exists
1. Manually create a timer in Firestore for a non-existent task
2. Navigate to tasks page
3. **Expected**: Cleanup hook runs, timer is deleted

### Scenario 3: UI manual cleanup
1. Create a task with timer
2. Delete task while timer is running
3. If UI shows "Tarea eliminada"
4. Click "Limpiar timer" button
5. **Expected**: Timer disappears from UI

## Monitoring & Debugging

All cleanup operations log to console:

```typescript
// Backend logs
console.log('[API] DELETE - Deleted', timersSnapshot.size, 'timer(s) for task:', taskId);

// Frontend logs
console.log('[useOrphanedTimerCleanup] Found ${orphanedTimers.length} orphaned timer(s)');
console.log('[useOrphanedTimerCleanup] Cleaned up timer for deleted task:', timer.taskId);
```

Check browser console for these messages to verify cleanup is working.

## Future Improvements

- [ ] Add telemetry/analytics for orphaned timer detection
- [ ] Implement batch cleanup endpoint for admin cleanup
- [ ] Add database triggers for automatic subcollection cleanup
- [ ] Consider moving to a flat timer collection structure to avoid subcollection cleanup

## Related Files

- `src/app/api/tasks/[id]/route.ts` - Backend cascade delete
- `src/modules/chat/timer/hooks/useOrphanedTimerCleanup.ts` - Cleanup hook
- `src/modules/header/components/ui/GeoClock/GeoClockWithTimer.tsx` - UI handling
- `src/modules/data-views/tasks/components/tables/TasksTableIsolated.tsx` - Hook integration
