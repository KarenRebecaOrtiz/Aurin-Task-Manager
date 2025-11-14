# Refactoring Guide: Implementing the Service Layer

## 1. Introduction

This guide outlines the steps to refactor the `useSharedTasksState.ts` hook to use the newly created **Service Layer**.

The primary goal of this refactoring is to apply the **Separation of Concerns** principle. We want to decouple our React hooks (which should be concerned with UI logic and state) from our data fetching logic (which should be concerned with how to communicate with the backend).

**Benefits of this new architecture:**
- **Cleaner Code:** Your hooks and components become much simpler and easier to read.
- **Improved Testability:** You can easily mock the service functions in your tests.
- **Scalability:** The data fetching logic is centralized, making it easier to manage and update.
- **Instant Perceived Performance:** The new `taskService` includes a persistent caching strategy that will make your app feel incredibly fast on subsequent loads.

---

## 2. The New Service Layer

The following files have been created in `src/services/`:

- `taskService.ts`: Handles all backend communication related to tasks (fetching, archiving, etc.). It includes a cache-first strategy using `idb-keyval`.
- `clientService.ts`: Handles all backend communication related to clients.
- `userService.ts`: Handles fetching users from your API and enriching the data with Firestore.
- `index.ts`: Exports all service functions from a single entry point.

These files currently contain template code. You will need to move your existing Firebase logic from `useSharedTasksState.ts` into the corresponding functions in these files, as indicated by the `// --- USER: ...` comments.

---

## 3. Refactoring `useSharedTasksState.ts`

Here is a step-by-step guide to refactor the hook.

### Step 1: Import the Services

First, remove the direct Firebase imports and import your new services instead.

**BEFORE:**
```typescript
import { collection, onSnapshot, query, ... } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
```

**AFTER:**
```typescript
import * as api from '@/services';
// You might still need `auth` for user checks, but not `db`.
import { auth } from '@/lib/firebase'; 
```

### Step 2: Simplify the `loadAllData` function

This function will become much simpler. It will now orchestrate calls to the service layer instead of containing the implementation details.

**BEFORE:**
Your current `loadAllData` function is very long and contains all the `getDocs`, `query`, `fetch`, and data mapping logic.

**AFTER (Conceptual):**
```typescript
const loadAllData = useCallback(async () => {
  if (!userId) return;

  // Set loading states
  setIsLoadingTasks(true);
  setIsLoadingClients(true);
  setIsLoadingUsers(true);

  // --- Task Fetching with Caching ---
  // 1. Get tasks from the service (might be from cache)
  const { data: tasksFromService, source: taskSource } = await api.getTasks();
  setTasks(tasksFromService);
  if (taskSource === 'network') {
    setIsLoadingTasks(false);
  }

  // 2. If data came from cache, re-fetch in the background
  if (taskSource === 'cache') {
    console.log('[useSharedTasksState] Displaying cached tasks, re-fetching in background...');
    api.fetchTasksFromNetwork().then(networkResult => {
      console.log('[useSharedTasksState] Fresh tasks received from network.');
      setTasks(networkResult.data);
      setIsLoadingTasks(false);
    });
  }

  // --- Client and User Fetching ---
  // (For simplicity, these don't have caching yet, but the pattern is the same)
  
  api.getClients().then(clientsData => {
    setClients(clientsData);
    setIsLoadingClients(false);
  });

  api.getUsers().then(usersData => {
    setUsers(usersData);
    setIsLoadingUsers(false);
  });

}, [userId, setTasks, setClients, setUsers, ...]);
```

### Step 3: Remove Redundant Logic

Once you've moved the logic to the service layer, you can delete a lot of the complex code from `useSharedTasksState.ts`:
- The data mapping helpers (`safeTimestampToISO`, etc.) can live in the services or in a shared `utils` file.
- The complex `useEffect` logic for avoiding re-renders can be simplified, as the data flow is now much cleaner. You may no longer need the local state variables (`localTasks`, etc.) because the caching and Zustand store will handle the state management.

---

## 4. Summary

By migrating your data fetching logic to this new service layer, you will have a more professional and robust architecture that is easier to maintain and provides a better user experience.

**Next Steps you could take:**
1.  Perform the refactoring of `useSharedTasksState.ts` as described above.
2.  Apply the same caching pattern from `taskService.ts` to `clientService.ts` and `userService.ts`.
3.  Consider implementing real-time listeners (`onSnapshot`) within your services to make your app collaborative.
