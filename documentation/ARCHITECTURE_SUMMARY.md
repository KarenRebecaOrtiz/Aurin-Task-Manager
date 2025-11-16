# Aurin Task Manager - Architecture Summary

## Quick Navigation

This codebase documentation consists of three comprehensive documents:

1. **ARCHITECTURE_OVERVIEW.md** (30KB, 1035 lines) - Detailed technical reference
2. **ARCHITECTURE_DIAGRAMS.md** (52KB, 896 lines) - Visual diagrams and data flows  
3. **ARCHITECTURE_SUMMARY.md** (this file) - Quick reference guide

---

## Project At A Glance

| Aspect | Details |
|--------|---------|
| **Name** | Aurin Task Manager |
| **Type** | Full-stack web application for project & task management |
| **Frontend Framework** | React 19 + Next.js 15.2.3 |
| **Language** | TypeScript 5.8.3 |
| **State Management** | Zustand (18+ stores) |
| **Database** | Firebase Firestore |
| **Backend** | Next.js API Routes + Firebase Functions |
| **Authentication** | Clerk |
| **Hosting** | Vercel |
| **Monitoring** | Sentry |
| **Status** | Active Development |

---

## Core Architecture Pattern

**Hybrid Modular Feature-Based Architecture**

The project combines:
- Module-based organization for features (`/modules` directory)
- Distributed Zustand stores for state management
- Next.js App Router with Server Components
- Firebase Firestore for real-time database
- Service layer for business logic
- Custom hooks for reusable logic

---

## Directory Structure (High-Level)

```
src/
├── app/                    # Next.js App Router (pages & API routes)
├── stores/                 # Zustand state management (18 stores)
├── modules/                # Feature modules (15+ feature folders)
├── components/             # Global UI components (45+ components)
├── hooks/                  # Custom React hooks (40+ hooks)
├── lib/                    # Utilities, Firebase, API helpers
├── services/               # Business logic services
├── types/                  # TypeScript type definitions
├── contexts/               # React Context providers
└── styles/                 # Global styles
```

---

## Technology Stack

### Frontend
- React 19.0.0
- Next.js 15.2.3
- TypeScript 5.8.3
- Zustand 5.0.6
- React Hook Form 7.66.0
- Zod 3.25.67
- Tailwind CSS 4.1.17
- Framer Motion 12.18.1
- Radix UI (Avatar, Dialog, Popover, Tooltip, etc.)

### Backend & Database
- Firebase 11.9.1 (Firestore, Storage, Auth)
- Firebase Admin 13.4.0
- Firebase Functions 6.3.2
- Firebase AI (Gemini)

### Authentication
- Clerk 6.20.2

### Additional Services
- Sentry 9.29.0 (error tracking)
- Sonner 2.0.5 (toast notifications)
- Nodemailer 7.0.3 (email)
- Vercel Blob (file storage)

---

## Key Features

### 1. Task Management
- Full CRUD operations
- Multiple views: Table & Kanban
- Status & priority filtering
- Archive functionality
- Activity tracking

### 2. Real-Time Messaging
- Task-based chat threads
- File uploads & replies
- Read status tracking
- AI-generated summaries (Gemini)
- Message persistence (IndexedDB)

### 3. Time Tracking
- Start/pause/resume timer
- Accumulate hours per task
- Firestore synchronization
- Web Worker for background timing
- Multi-device sync support

### 4. User & Team Management
- Client/account management
- Team member profiles
- Real-time online status
- Profile cards
- User availability

### 5. AI Integration
- Gemini summaries for messages
- Text reformulation
- Image analysis
- Intelligent task recommendations

### 6. Email Notifications
- Task assignment notifications
- Status change notifications
- HTML email templates
- SMTP integration

---

## State Management: Zustand Stores

### Central Stores
- **dataStore.ts** - Tasks, messages, clients, users
- **timerStore.ts** - Timer state with Firestore sync
- **tasksPageStore.ts** - Tasks page UI state
- **formStore.ts** - Form values and validation
- **tasksKanbanStore.ts** - Kanban board state

### Feature Stores
- **geminiStore.ts** - AI operations
- **userSwiperStore.ts** - User carousel
- **sidebarStore.ts** - Navigation state
- **clientsTableStore.ts** - Clients view
- **chunkStore.ts** - Message chunking
- + 8 more domain-specific stores

**Pattern:** Each store uses `create<Type>((set, get) => ({...}))` with direct Firebase operations.

---

## API Architecture

### Layer Structure
```
Request
  ↓
middleware.ts (Clerk auth)
  ↓
withAuth() wrapper (extract userId)
  ↓
Zod validation
  ↓
Services (business logic)
  ↓
Firebase operations
  ↓
Standardized response (apiSuccess/apiError)
  ↓
Response
```

### Response Format
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string, code?: string, details?: unknown }
```

### API Utilities
- **auth.ts** - Authentication helpers (requireAuth, withAuth, optionalAuth)
- **response.ts** - Response builders (apiSuccess, apiError, etc.)
- **Zod schemas** - Request validation

---

## Component Organization

### Modules (`/modules`)
Self-contained features with:
- components/
- hooks/
- utils/
- stores/ (if needed)
- types/
- index.ts (exports)

**Key Modules:**
- modules/tasks - Task listing
- modules/task-crud - Create/edit tasks
- modules/data-views - Table & Kanban views
- modules/chat - Messaging
- modules/header - Navigation
- modules/modal - Dialogs
- modules/profile-card - User info
- + 10 more modules

### Global Components (`/components`)
- **ui/** - 45+ reusable UI components
- **animate-ui/** - Animated components
- ChatSidebar, MessageSidebar, TimerDisplay

### Custom Hooks (`/hooks`)
- **Data:** useSharedTasksState, useDataStore, useTimer
- **Forms:** useFormOptimizations, useCreateTaskOptimizations
- **Messages:** useMessageActions, useMessagePagination
- **AI:** useGeminiSummary, useChatGPTIntegration
- **Media:** useImageUpload, useImageWithRetry
- + 20 more hooks

---

## Data Models

### Task
```typescript
{
  id: string
  clientId: string
  project: string
  name: string
  description: string
  status: "Por Iniciar" | "En Proceso" | "Backlog" | ...
  priority: "Baja" | "Media" | "Alta"
  startDate: Timestamp | null
  endDate: Timestamp | null
  LeadedBy: string[]
  AssignedTo: string[]
  CreatedBy: string
  createdAt: Timestamp
  archived?: boolean
}
```

### Message
```typescript
{
  id: string
  senderId: string
  senderName: string
  text: string | null
  timestamp: Timestamp
  read: boolean
  clientId: string
  fileUrl?: string
  fileName?: string
  replyTo?: { id, senderName, text }
  isSummary?: boolean
  isLoading?: boolean
}
```

---

## Key Architectural Patterns

### Pattern 1: Zustand with Async Actions
```typescript
export const useStore = create<Type>((set, get) => ({
  data: [],
  setData: (data) => set({ data }),
  fetchData: async () => {
    const result = await firebase.operation();
    set({ data: result });
  }
}));
```

### Pattern 2: Authenticated API Routes
```typescript
export const POST = withAuth(async (userId, request) => {
  const body = await request.json();
  const validated = schema.safeParse(body);
  
  if (!validated.success) {
    return apiBadRequest('Invalid', validated.error);
  }
  
  // Business logic
  return apiCreated(result);
});
```

### Pattern 3: Modular Exports
```typescript
// modules/feature/index.ts
export { Component } from './components/Component';
export { useHook } from './hooks/useHook';
export { utilFunction } from './utils';
```

### Pattern 4: Real-Time Listeners
```typescript
const unsubscribe = onSnapshot(
  query(collection(db, 'tasks'), where('clientId', '==', clientId)),
  (snapshot) => {
    const tasks = snapshot.docs.map(doc => doc.data());
    dataStore.setTasks(tasks);
  }
);
```

### Pattern 5: Service Layer
```typescript
// services/taskService.ts
export async function createTask(data: CreateInput): Promise<Task> {
  const docRef = doc(collection(db, 'tasks'));
  const task = { ...data, id: docRef.id, createdAt: now() };
  await setDoc(docRef, task);
  return task;
}
```

---

## Data Flow Examples

### Task Creation
```
Form Submit
  → Validation (Zod)
  → formStore.setValues()
  → POST /api/tasks
  → withAuth + validation
  → taskService.createTask()
  → Firestore setDoc()
  → emailNotification.send()
  → Firestore listener triggers
  → dataStore.addTask()
  → UI re-renders
  → Toast notification
```

### Real-Time Message
```
User sends
  → dataStore.addMessage()
  → Firestore setDoc()
  → onSnapshot listener
  → Update read status
  → dataStore.updateMessage()
  → All clients sync
```

### Timer Sync
```
Start timer
  → timerStore.setIsRunning()
  → Web Worker starts
  → Accumulate seconds
  → Periodic Firestore sync
  → On close: finalizeTimer()
  → Save to API
  → Store total hours
```

---

## Security

### Authentication
- Clerk middleware on protected routes
- Clerk auth() in Server Components
- API routes protected with withAuth()
- 401 responses for unauthenticated requests

### Validation
- Zod schemas for all API inputs
- Type-safe request handling
- Error messages don't expose internals

### Data
- Firebase Firestore security rules
- User-scoped data access
- Encryption for sensitive data
- Google Cloud Storage for files

---

## Performance Optimizations

### Frontend
- Zustand shallow selectors prevent re-renders
- Code splitting via Next.js routes
- Image optimization with remotePatterns
- SCSS modules for component scoping

### Backend
- Firestore indexes for fast queries
- Batch operations for multiple writes
- MessagePersistence with IndexedDB cache
- Long polling for Safari compatibility

### Database
- Denormalized data for common queries
- serverTimestamp() for consistency
- Multi-tab sync coordination
- Persistent local cache for offline

---

## Development Setup

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Linting
npm run lint           # Check
npm run lint:fix       # Fix
npm run lint:detailed  # Detailed report

# Testing
npm run test:notifications
npm run test:email-templates
```

---

## Deployment

### Hosting: Vercel
- Zero-config deployment
- Automatic scaling
- Source maps uploaded to Sentry

### Environment Variables
- `.env.local` for development
- Vercel dashboard for production
- Includes: Clerk keys, Firebase config, Sentry DSN

### Services
- Firebase for data/auth/storage
- Clerk for user management
- Sentry for error monitoring
- Nodemailer for emails

---

## Folder Structure Decisions

### Why `/modules` over flat `/features`?
- Enforces encapsulation
- Clear public API per module
- Easy to move/rename features
- Scales well to 50+ features

### Why Zustand over Redux?
- Simpler API
- Smaller bundle
- Per-store flexibility
- Easy async/await

### Why Firebase over traditional backend?
- Real-time sync built-in
- Automatic scaling
- Reduced ops overhead
- Integrated AI (Gemini)

### Why Next.js App Router?
- Server Components by default
- File-based routing
- Middleware support
- API routes co-located

---

## Adding New Features

### Step 1: Create Module
```
src/modules/new-feature/
├── index.ts
├── components/
│   ├── FeatureComponent.tsx
│   └── FeatureSubComponent.tsx
├── hooks/
│   └── useFeature.ts
└── utils/
    └── featureUtils.ts
```

### Step 2: Create Store (if needed)
```typescript
// src/stores/newFeatureStore.ts
export const useNewFeatureStore = create<Type>((set) => ({...}));
```

### Step 3: Create API Route
```typescript
// src/app/api/new-feature/route.ts
export const POST = withAuth(async (userId, req) => {
  // Handle request
});
```

### Step 4: Export from Module
```typescript
// src/modules/new-feature/index.ts
export { FeatureComponent } from './components/FeatureComponent';
export { useFeature } from './hooks/useFeature';
```

### Step 5: Use in Pages
```typescript
import { FeatureComponent, useFeature } from '@/modules/new-feature';

export default function Page() {
  const { data } = useFeature();
  return <FeatureComponent />;
}
```

---

## Common Development Tasks

### Access Current User
```typescript
// Client: useAuth hook
const { userId, user } = useAuth();

// Server: auth() function
const { userId } = await auth();
```

### Fetch Data from Firestore
```typescript
// Real-time listener
const unsubscribe = onSnapshot(
  collection(db, 'tasks'),
  (snapshot) => {
    const tasks = snapshot.docs.map(doc => doc.data());
  }
);

// Single query
const docs = await getDocs(query(collection(db, 'tasks')));
```

### Make API Request
```typescript
// From component/hook
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

const result = await response.json(); // { success, data/error }
```

### Update Store
```typescript
const useStore = create<Type>((set) => ({
  value: 0,
  setValue: (v) => set({ value: v }),
  increment: () => set(state => ({ value: state.value + 1 }))
}));

// In component
const increment = useStore(state => state.increment);
increment();
```

### Add Toast Notification
```typescript
// Using Sonner
import { toast } from 'sonner';

toast.success('Task created');
toast.error('Something went wrong');
```

---

## Testing Strategy

### Unit Tests
- Utility functions in `lib/`
- Service functions
- Zod schemas

### Integration Tests
- API routes
- Store interactions
- Component integration

### E2E Tests (ready for Playwright)
- Task CRUD flow
- Messaging
- Timer synchronization
- Authentication

---

## Monitoring & Debugging

### Sentry (Production)
- Error tracking
- Performance monitoring
- Release tracking

### Development
- Console logs (dev-only)
- React DevTools
- Browser DevTools
- Why Did You Render for performance

### Logging
```typescript
// Conditional logging
const debugLog = (msg: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(msg);
  }
};
```

---

## Known Constraints

### Browser Support
- Safari requires long polling (configured)
- IndexedDB not available in private browsing
- Requires modern JavaScript support

### Performance Limits
- Firestore read/write quotas
- File upload size limits
- Message pagination for large chats

### Real-Time Limitations
- Depends on internet connectivity
- Email delivery not guaranteed
- Firestore consistency (eventual)

---

## Future Improvements

### Potential Enhancements
1. **RTK Query** for server state
2. **Supabase** as Firebase alternative
3. **Dedicated backend** (Node/Python API)
4. **Redis** for session caching
5. **Algolia** for full-text search
6. **Message queue** (RabbitMQ/SQS)

### Scalability
- Firestore auto-scales
- Cloud Storage unlimited
- Function scaling automatic
- Consider sharding for large datasets

---

## Reference Documents

This summary provides a quick overview. For detailed information, refer to:

- **ARCHITECTURE_OVERVIEW.md** - Complete technical reference (20 sections)
- **ARCHITECTURE_DIAGRAMS.md** - Visual diagrams and data flows (8 diagrams)

---

## Key Takeaways

1. **Modular Design** - Features organized in self-contained modules
2. **Distributed State** - 18+ Zustand stores for clear separation
3. **Real-Time First** - Firebase Firestore for instant sync
4. **Type Safe** - TypeScript throughout + Zod validation
5. **Scalable** - Service layer, custom hooks, reusable components
6. **Secure** - Clerk auth, API validation, Firestore rules
7. **Observable** - Sentry monitoring, structured logging

---

## Document Generation Date
November 15, 2025

---
