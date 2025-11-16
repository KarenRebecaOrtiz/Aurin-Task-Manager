# Aurin Task Manager - Comprehensive Architecture Overview

## Project Summary

**Name:** Aurin Task Manager  
**Framework:** Next.js 15.2.3 (React 19.0.0)  
**Type:** Full-stack web application for project and task management  
**Language:** TypeScript  
**Build Tool:** Next.js with Tailwind CSS and Sass  
**Deployment:** Vercel (with Sentry error tracking)  
**Status:** Active development

---

## 1. Technology Stack

### Frontend Stack
- **React 19.0.0** - UI framework with Server Components support
- **Next.js 15.2.3** - Full-stack React framework with App Router
- **TypeScript 5.8.3** - Type safety and developer experience
- **Tailwind CSS 4.1.17** - Utility-first CSS framework
- **SCSS/Sass 1.89.1** - Component-level styling
- **React Hook Form 7.66.0** - Form state management
- **Zod 3.25.67** - Runtime schema validation
- **Zustand 5.0.6** - Lightweight state management

### UI Components & Animation
- **Framer Motion 12.18.1** - React animation library
- **Motion 12.23.24** - Animation utilities
- **Radix UI** - Headless UI components (Avatar, Dialog, Label, Popover, Separator, Tooltip)
- **Lucide React 0.522.0** - Icon library
- **GSAP 3.13.0** - Animation library
- **Class Variance Authority 0.7.1** - CSS class composition

### Backend & Data
- **Firebase 11.9.1** - Real-time database and storage
- **Firebase Admin 13.4.0** - Server-side Firebase operations
- **Firebase Functions 6.3.2** - Serverless backend functions
- **Firestore** - Cloud database
- **Firebase Storage** - File storage with Google Cloud
- **Firebase Auth** - Authentication (integrated with Clerk)
- **Firebase AI** - Gemini AI backend

### Authentication
- **Clerk 6.20.2** - User authentication and management
- **Clerk Backend & Node SDK** - Server-side authentication

### Additional Services
- **Sentry 9.29.0** - Error tracking and monitoring
- **Sonner 2.0.5** - Toast notifications
- **Nodemailer 7.0.3** - Email notifications
- **Svix 1.66.0** - Webhook management
- **Vercel Blob** - File storage

### Development & Code Quality
- **ESLint 9.30.1** - Linting with Next.js config
- **TypeScript** - Strict typing for better code quality
- **Why Did You Render** - React performance debugging

---

## 2. Project Structure

```
src/
├── app/                          # Next.js App Router (Pages & Layouts)
│   ├── layout.tsx               # Root layout with Clerk & Theme providers
│   ├── page.tsx                 # Landing/home page
│   ├── (auth)/                  # Auth group (sign-in, sign-up)
│   ├── dashboard/               # Protected dashboard area
│   │   ├── layout.tsx           # Dashboard layout wrapper
│   │   ├── tasks/               # Tasks page
│   │   ├── accounts/            # Clients/accounts page
│   │   ├── members/             # Team members page
│   │   ├── new-task/            # New task creation
│   │   └── task/[taskId]/       # Task detail pages
│   ├── api/                     # API routes (Next.js Route Handlers)
│   │   ├── tasks/               # Task CRUD endpoints
│   │   ├── users/               # User endpoints
│   │   ├── upload/              # File upload endpoints
│   │   ├── generate-summary/    # AI summary generation
│   │   └── [other-endpoints]/   # Various service endpoints
│   └── firebase/                # Firebase test page
│
├── stores/                       # Zustand state management (18 store files)
│   ├── dataStore.ts             # Main data state (tasks, clients, users, messages)
│   ├── timerStore.ts            # Timer/time tracking state
│   ├── tasksPageStore.ts        # Tasks page UI state
│   ├── tasksKanbanStore.ts      # Kanban view state
│   ├── formStore.ts             # Form management state
│   ├── createTaskStore.ts       # Task creation state
│   ├── sidebarStore.ts          # Sidebar state
│   ├── sidebarStateStore.ts     # Detailed sidebar UI state
│   ├── geminiStore.ts           # AI/Gemini state
│   ├── userSwiperStore.ts       # User carousel state
│   ├── chunkStore.ts            # Data chunking for messages
│   └── [other-stores]/          # Feature-specific stores
│
├── modules/                      # Feature modules (organized by domain)
│   ├── tasks/                   # Task listing & management
│   ├── task-crud/               # Task creation & editing
│   ├── data-views/              # Table & Kanban views
│   │   ├── tasks/               # Task views
│   │   └── clients/             # Client/account views
│   ├── chat/                    # Real-time messaging & chat
│   ├── header/                  # Header navigation
│   ├── footer/                  # Footer component
│   ├── modal/                   # Modal provider & dialogs
│   ├── profile-card/            # User profile card
│   ├── profile-config/          # User profile settings
│   ├── config/                  # Configuration module
│   ├── sonner/                  # Toast notification provider
│   ├── toast/                   # Legacy toast system
│   ├── loader/                  # Loading states
│   ├── advices/                 # Tips & hints
│   └── shared/                  # Shared module utilities
│
├── features/                     # Features (new architecture)
│   └── chat/                    # Chat feature
│
├── components/                   # Global components
│   ├── ui/                      # Reusable UI components (45+ components)
│   ├── animate-ui/              # Animated UI components
│   ├── hooks/                   # Component-level hooks
│   ├── ChatSidebar.tsx          # Chat sidebar component
│   ├── MessageSidebar.tsx       # Message sidebar component
│   ├── TimerDisplay.tsx         # Timer display component
│   └── [other-global-components]/
│
├── hooks/                        # Custom React hooks (40+ hooks)
│   ├── useTimer.ts              # Timer hook
│   ├── useSharedTasksState.ts   # Shared task state hook
│   ├── useMessageActions.ts     # Message actions
│   ├── useMessagePagination.ts  # Message pagination
│   ├── useGeminiSummary.ts      # Gemini AI summaries
│   ├── useCreateTaskOptimizations.ts
│   ├── useImageUpload.ts
│   ├── useChatGPTIntegration.ts
│   └── [many-more-hooks]/
│
├── lib/                          # Utility libraries & services
│   ├── firebase.ts              # Firebase initialization & config
│   ├── firebase-admin.ts        # Firebase Admin SDK setup
│   ├── firebaseConfig.ts        # Firebase credentials
│   ├── api/                     # API utilities
│   │   ├── auth.ts              # Auth middleware & helpers
│   │   └── response.ts          # Standardized API responses
│   ├── validations/             # Zod schemas
│   │   └── task.schema.ts       # Task validation schemas
│   ├── taskUtils.ts             # Task helper functions
│   ├── userUtils.ts             # User helper functions
│   ├── messagePersistence.ts    # Message caching/indexedDB
│   ├── encryption.ts            # Data encryption utilities
│   ├── emailService.ts          # Email sending
│   ├── cache-utils.ts           # Caching utilities
│   ├── upload.ts                # File upload helpers
│   └── utils.ts                 # General utilities
│
├── services/                     # Business logic services
│   ├── taskService.ts           # Task operations
│   ├── userService.ts           # User operations
│   ├── clientService.ts         # Client/account operations
│   ├── emailNotificationService.ts  # Email notifications
│   └── emailTemplates.ts        # HTML email templates
│
├── contexts/                     # React Context (legacy state)
│   ├── ThemeContext.tsx         # Light/dark theme
│   └── AuthContext.tsx          # Authentication context
│
├── types/                        # TypeScript type definitions
│   ├── index.ts                 # Main type exports
│   ├── clerk.d.ts               # Clerk type extensions
│   └── google-maps.d.ts         # Google Maps types
│
├── config/                       # Configuration files
│   └── [configuration]/
│
├── styles/                       # Global styles
│   └── globals.scss             # Root styles
│
├── middleware.ts                 # Next.js middleware (Clerk auth)
│
└── scripts/                      # Utility scripts
    ├── test-notification-system.ts
    └── test-email-templates.ts
```

---

## 3. Architecture Pattern: Modular Feature-Based Architecture

### Core Architecture Principles

The project uses a **hybrid modular architecture** combining:
- **Module-based organization** (features grouped in `/modules` folder)
- **Zustand for distributed state** (18+ independent stores)
- **Next.js App Router** (file-based routing with Server Components)
- **Firebase as backend** (Firestore, Storage, Functions)
- **Service layer** for business logic

### Organization Patterns

#### A. Module Pattern (`/modules`)
Each module is a self-contained feature with:
```
module-name/
├── index.ts              # Public API exports
├── components/           # Component files
├── hooks/                # Module-specific hooks
├── stores/               # Module-specific stores (if any)
├── utils/                # Helper functions
└── types/                # Local TypeScript types
```

**Examples:**
- `modules/chat/` - Real-time messaging
- `modules/data-views/` - Table and Kanban views
- `modules/task-crud/` - Task creation/editing
- `modules/header/` - Top navigation
- `modules/modal/` - Dialog provider

#### B. Store Pattern (`/stores`)
Zustand stores organized by domain with clear responsibilities:
- `dataStore.ts` - Central data state (tasks, clients, users, messages)
- `timerStore.ts` - Time tracking state with Firestore sync
- `tasksPageStore.ts` - UI state for tasks page
- `formStore.ts` - Form state management
- `tasksKanbanStore.ts` - Kanban-specific state

#### C. Hook Pattern (`/hooks`)
Custom hooks for business logic isolation:
- `useSharedTasksState.ts` - Share task state across components
- `useMessageActions.ts` - Message CRUD operations
- `useGeminiSummary.ts` - AI summary generation
- `useImageUpload.ts` - Image upload handling
- `useTimer.ts` - Timer operations

#### D. API Route Pattern (`/app/api`)
RESTful Next.js route handlers with:
- Standardized response format
- Clerk authentication
- Validation with Zod
- Consistent error handling

---

## 4. State Management Architecture

### Zustand Store Structure

**Central Data Store (`dataStore.ts`)**
```typescript
- messages: { [key: string]: Message[] }  // By conversation/task ID
- tasks: Task[]
- clients: Client[]
- users: User[]
- isLoadingTasks: boolean

Methods:
- addMessage(), updateMessage(), deleteMessage()
- setTasks(), addTask(), updateTask(), deleteTask()
- setClients(), addClient(), updateClient()
- setUsers(), addUser(), updateUser()
```

**Timer Store (`timerStore.ts`)**
```typescript
- isRunning: boolean
- accumulatedSeconds: number
- startTime: Date | null
- taskId: string | null
- userId: string | null
- syncStatus: 'idle' | 'syncing' | 'error'

Methods:
- startTimer(), pauseTimer(), resetTimer()
- finalizeTimer() - Returns total hours
- initializeTimer() - Restore from Firestore
- Automatic Firestore sync with Web Worker
```

**Tasks Page Store (`tasksPageStore.ts`)**
```typescript
- container: 'tareas' | 'cuentas' | 'miembros' | 'config'
- taskView: 'table' | 'kanban'
- isEditTaskOpen: boolean
- isCreateTaskOpen: boolean
- editTaskId: string | null

Methods:
- setContainer(), setTaskView()
- setIsEditTaskOpen(), setIsCreateTaskOpen()
- Modal and form state management
```

### State Management Patterns

1. **Distributed Stores**: Each store handles specific domain
2. **Shallow Selector Pattern**: Uses `useShallow` for performance
3. **Async Actions**: Direct Firebase operations in store actions
4. **Server Sync**: Stores sync with Firestore in real-time

---

## 5. API Architecture

### API Layer Structure

**Authentication Utilities (`/lib/api/auth.ts`)**
- `requireAuth()` - Check authentication
- `requireAuthProtected()` - Protected routes
- `withAuth()` - HOF wrapper for authenticated handlers
- `optionalAuth()` - Optional authentication

**Response Utilities (`/lib/api/response.ts`)**
Standardized response format:
```typescript
{
  success: true,
  data: T
}

OR

{
  success: false,
  error: string,
  code?: string,
  details?: unknown
}
```

Utility functions:
- `apiSuccess(data, options)` - 200 response
- `apiCreated(data, location)` - 201 response
- `apiBadRequest(message, details)` - 400 response
- `apiUnauthorized(message)` - 401 response
- `apiNotFound(resource)` - 404 response
- `apiServerError(message, error)` - 500 response

### API Route Handlers

**Route Organization:**
```
/api/
├── tasks/
│   ├── route.ts           # GET (list), POST (create)
│   └── [id]/
│       └── route.ts       # GET (detail), PUT/PATCH (update), DELETE
├── users/
│   ├── route.ts
│   └── [id]/route.ts
├── upload/
│   ├── upload.ts
│   └── delete-image.ts
├── generate-summary/      # AI operations
├── send-notification-emails/  # Email operations
└── [other-endpoints]/
```

**API Pattern Example (POST /api/tasks):**
```typescript
export const POST = withAuth(async (userId, request) => {
  // 1. Parse and validate with Zod
  const body = await request.json();
  const validationResult = createTaskSchema.safeParse(body);
  
  // 2. Return validation error if invalid
  if (!validationResult.success) {
    return apiBadRequest('Invalid task data', ...);
  }
  
  // 3. Perform business logic
  // - Save to Firestore
  // - Send notifications
  // - Update activity log
  
  // 4. Return standardized response
  return apiCreated(createdTask, '/api/tasks/' + taskId);
});
```

### Validation Schema Pattern

**Zod Schemas (`/lib/validations/task.schema.ts`)**
```typescript
- taskSchema - Full task validation
- createTaskSchema - POST request validation
- updateTaskSchema - Full PUT validation
- patchTaskSchema - PATCH (partial) validation
```

---

## 6. Database Architecture

### Firebase Firestore Collections

**Collections:**
- `tasks` - Task documents with full details
- `clients` - Client/account information
- `users` - User profiles and metadata
- `messages` - Chat/task messages
- `notifications` - Notification queue
- `timers` - Timer records for time tracking
- `activityLog` - Task activity history

### Data Models

**Task Document:**
```typescript
{
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;  // "Por Iniciar", "En Proceso", etc.
  priority: string;  // "Baja", "Media", "Alta"
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  LeadedBy: string[];  // User IDs
  AssignedTo: string[];  // User IDs
  CreatedBy: string;
  createdAt: Timestamp;
  lastActivity?: string;
  hasUnreadUpdates?: boolean;
  archived?: boolean;
}
```

**Message Document:**
```typescript
{
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp;
  read: boolean;
  clientId: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  replyTo?: { id, senderName, text };
  isSummary?: boolean;  // AI summary flag
  isLoading?: boolean;  // Loading state
}
```

### Firebase Features Used

1. **Firestore**: Main database with:
   - Real-time listeners
   - Persistent local cache
   - Multi-tab management
   - Long polling (Safari compatibility)

2. **Firebase Storage**: File uploads with:
   - Google Cloud integration
   - Image upload/delete endpoints

3. **Firebase Functions**: Serverless backend for:
   - Email notifications
   - Scheduled tasks
   - Complex business logic

4. **Firebase Auth**: Legacy auth (Clerk is primary)

5. **Firebase Messaging**: Push notifications

6. **Firebase AI**: Gemini API integration for:
   - Summary generation
   - Text analysis
   - Image analysis

---

## 7. Features & Capabilities

### Core Features

#### A. Task Management
- **Create/Read/Update/Delete** (CRUD) tasks
- **Task Properties**: Name, description, status, priority, dates, leaders, assignees
- **Multiple Views**: Table and Kanban board layouts
- **Search & Filter**: By status, priority, assignee, date range
- **Bulk Operations**: Archive/restore multiple tasks
- **Activity Tracking**: Last activity timestamp and activity log

#### B. Real-Time Messaging
- **Task-based Chat**: Message threads per task
- **Message Features**:
  - File uploads (images, documents)
  - Message replies
  - Read status tracking
  - Unread indicators
  - AI summaries via Gemini
- **Pagination**: Load older messages on demand
- **Persistence**: IndexedDB for offline support

#### C. Time Tracking
- **Timer Module**:
  - Start/pause/resume timing
  - Accumulate hours per task
  - Firestore synchronization
  - Web Worker for background timing
  - Device ID tracking for multi-device sync
  - Drift detection via `lastSyncTime`
- **Timer State**: Restored from Firestore on page reload

#### D. User & Client Management
- **Clients/Accounts**: Manage projects and teams
- **Team Members**: User profiles, roles, status
- **User Sync**: Real-time user availability
- **Profile Cards**: User information display
- **Online Status**: Track user availability

#### E. AI Integration (Gemini)
- **Message Summaries**: AI-generated task summaries
- **Text Reformulation**: Rewrite task descriptions
- **Image Analysis**: Parse documents/images
- **Intelligent Assistance**: Task recommendations

#### F. Email Notifications
- **Task Notifications**: New task assignments
- **Update Notifications**: Task status changes
- **Email Templates**: HTML formatted emails
- **Nodemailer Integration**: SMTP sending

#### G. Authentication & Authorization
- **Clerk Integration**: User sign-up/sign-in
- **Protected Routes**: Dashboard requires auth
- **Public Routes**: Landing, auth pages
- **API Protection**: All API routes except feedback

### Advanced Features

- **Offline Support**: Firestore persistent local cache
- **Multi-Tab Sync**: Coordinated state across tabs
- **SafariOptimization**: Long polling, graceful degradation
- **Error Tracking**: Sentry integration
- **File Uploads**: Google Cloud Storage integration
- **Toast Notifications**: Sonner library
- **Responsive Design**: Mobile, tablet, desktop support

---

## 8. Key Architectural Patterns

### Pattern 1: Zustand Store with Async Actions
```typescript
export const useDataStore = create<DataStore>((set, get) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: async (task) => {
    // Firebase operation
    const newTask = await firestore.add(task);
    // Update store
    set((state) => ({
      tasks: [...state.tasks, newTask]
    }));
  }
}));
```

### Pattern 2: Middleware-Protected API Routes
```typescript
// middleware.ts
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api(.*)']);
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  return NextResponse.next();
});
```

### Pattern 3: Authenticated API Handler
```typescript
export const POST = withAuth(async (userId, request) => {
  // userId is guaranteed to exist
  const data = await request.json();
  // Process request
  return apiSuccess(result);
});
```

### Pattern 4: Modular Components
```typescript
// Module exports
export * from './components/TaskList';
export * from './components/TaskDetail';
export { useTaskActions } from './hooks/useTaskActions';
```

### Pattern 5: React Context for Theme
```typescript
<ClerkProvider>
  <ThemeProvider>
    <html>
      {/* App content */}
    </html>
  </ThemeProvider>
</ClerkProvider>
```

### Pattern 6: Service Layer
```typescript
// services/taskService.ts
export async function createTask(data: CreateTaskInput): Promise<Task> {
  const docRef = doc(collection(db, 'tasks'));
  const task = { ...data, id: docRef.id, createdAt: now() };
  await setDoc(docRef, task);
  return task;
}

// Used in API routes and hooks
const task = await taskService.createTask(validatedData);
```

---

## 9. Data Flow Patterns

### A. Task Creation Flow

```
User Form Submit
    ↓
Client: FormStore (form state)
    ↓
Validation: Zod Schema
    ↓
API: POST /api/tasks
    ↓
Server: withAuth(userId) + validate
    ↓
Database: Firestore setDoc()
    ↓
Services: emailNotificationService.send()
    ↓
Response: apiCreated(task)
    ↓
Client: Update dataStore
    ↓
UI: Optimistic update + toast notification
```

### B. Real-Time Message Flow

```
User Sends Message
    ↓
dataStore.addMessage()
    ↓
Optimistic UI update (isPending flag)
    ↓
Firestore: setDoc() + serverTimestamp
    ↓
Firestore Listener (onSnapshot)
    ↓
Update message read status
    ↓
Update dataStore
    ↓
UI reflects server state
```

### C. Timer Synchronization Flow

```
User Starts Timer
    ↓
timerStore.startTimer()
    ↓
Web Worker: Tick every 1 second
    ↓
Accumulate seconds locally
    ↓
Periodic Firestore sync (every N seconds)
    ↓
On Page Close: finalizeTimer()
    ↓
Calculate total hours
    ↓
API: Save final time tracking record
```

---

## 10. Key Technologies Deep Dive

### Zustand State Management
- **Why**: Lightweight, simple API, no boilerplate
- **Usage**: 18+ stores for domain-specific state
- **Performance**: Shallow selector pattern with `useShallow`
- **Async**: Direct async/await in store actions

### Firebase Firestore
- **Real-time**: `onSnapshot()` for live updates
- **Offline**: Persistent local cache for offline support
- **Sync**: Multi-tab coordinator for cross-tab sync
- **Performance**: Indexed queries for fast retrieval

### Web Worker
- **Purpose**: Timer tick without blocking main thread
- **Location**: `/public/timerWorker.js`
- **Communication**: postMessage for updates
- **Fallback**: Uses timeout if worker unavailable

### Clerk Authentication
- **Pattern**: Uses `auth()` helper in Server Components
- **Middleware**: Protects dashboard and API routes
- **User Data**: Automatically synced to Firestore

### Next.js App Router
- **File Routing**: URL structure from file paths
- **Server Components**: Default, data fetching on server
- **Client Components**: "use client" for interactive features
- **API Routes**: `/app/api/` for endpoints
- **Middleware**: Central auth and request handling

---

## 11. Performance Optimizations

### Frontend Optimizations
1. **Code Splitting**: Next.js automatic route-based splitting
2. **Image Optimization**: Next.js Image component with remotePatterns
3. **CSS**: Tailwind CSS with PostCSS, SCSS modules for components
4. **State**: Zustand shallow selectors to prevent re-renders
5. **Lazy Loading**: React.lazy for heavy components
6. **Memoization**: useCallback, useMemo for derived state

### Backend Optimizations
1. **Firestore Indexing**: Indexes defined in firestore.indexes.json
2. **Query Optimization**: Specific queries with where() clauses
3. **Batch Operations**: Batch writes for multiple documents
4. **Caching**: MessagePersistence with IndexedDB

### Database Optimizations
1. **Denormalization**: Task, message data co-located
2. **Composite Keys**: clientId + taskId for message lookups
3. **Timestamps**: Firestore serverTimestamp for consistency
4. **TTL**: Messages archived after period

---

## 12. Security Architecture

### Authentication & Authorization

**Clerk Protection:**
- All dashboard routes protected
- API routes require authentication
- User ID extracted from Clerk sessions
- Public routes: landing, sign-in, sign-up, feedback

**API Security:**
- Middleware enforces auth on `/api` routes
- `withAuth()` wrapper ensures userId context
- Zod validation prevents malformed requests
- Error messages don't expose sensitive data

### Data Security

**Firestore Rules:**
```
- Users can only access their own data
- Task data limited by permissions
- Public sharing controlled via rules
```

**Encryption:**
- Sensitive data encrypted with `/lib/encryption.ts`
- File uploads to Google Cloud Storage (HTTPS)

### Environment Security
- Credentials in `.env.local` (gitignored)
- Clerk keys secured
- Firebase config in code (client-safe credentials)
- Sentry DSN for error tracking

---

## 13. Development Workflow

### Project Setup
```bash
npm install
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run lint:fix      # Fix linting issues
```

### Type Checking
```bash
# ESLint with TypeScript support
npm run lint:check    # Max warnings: 0
npm run lint:detailed # Compact format
```

### Testing
```bash
npm run test:notifications      # Test notification system
npm run test:email-templates    # Test email templates
```

### Debugging
- Sentry.io for production error tracking
- Why Did You Render for React optimization
- Browser DevTools for client debugging
- Console logs conditional on NODE_ENV === 'development'

---

## 14. Deployment & DevOps

### Hosting
- **Platform**: Vercel (Next.js native)
- **Database**: Firebase Firestore (Google Cloud)
- **Storage**: Google Cloud Storage
- **Monitoring**: Sentry for error tracking

### Environment Variables
- Development: `.env.local` (local)
- Production: Vercel environment variables
- Sensitive: Clerk keys, Firebase config, Sentry DSN

### Build Configuration
- Next.js with TypeScript
- Sentry integration via `withSentryConfig`
- Image optimization for Clerk, randomuser.me, Google Cloud
- ESLint for code quality

---

## 15. Key Architectural Decisions

### Why Zustand Over Redux?
- Simpler API (no boilerplate)
- Direct async/await support
- Smaller bundle size
- Per-store flexibility

### Why Firebase Over Traditional Backend?
- Real-time capabilities
- Automatic scaling
- Integrated authentication
- AI capabilities (Gemini)
- Reduced backend maintenance

### Why Modular Over Monolithic?
- Features can be developed independently
- Code reuse across modules
- Clear separation of concerns
- Easier testing and maintenance

### Why Next.js App Router?
- Server Components for better performance
- File-based routing simplicity
- API routes co-located with pages
- Built-in middleware support
- Native TypeScript support

### Why Clerk Over Custom Auth?
- User management out-of-the-box
- Multi-factor authentication
- Social login integration
- Session management
- Reduced security burden

---

## 16. Common Development Patterns

### Adding a New Feature

1. **Create Module**:
   ```
   src/modules/new-feature/
   ├── index.ts
   ├── components/
   ├── hooks/
   └── utils/
   ```

2. **Add State** (if needed):
   ```typescript
   // src/stores/newFeatureStore.ts
   export const useNewFeatureStore = create<Store>((set) => ({...}));
   ```

3. **Create API Route**:
   ```typescript
   // src/app/api/new-feature/route.ts
   export const POST = withAuth(async (userId, req) => {...});
   ```

4. **Export from Module**:
   ```typescript
   // src/modules/new-feature/index.ts
   export { NewFeatureComponent } from './components/...';
   export { useNewFeatureStore } from '...';
   ```

### Adding a New API Endpoint

1. **Define Zod Schema**:
   ```typescript
   export const newEndpointSchema = z.object({...});
   ```

2. **Create Route Handler**:
   ```typescript
   export const POST = withAuth(async (userId, req) => {
     const data = newEndpointSchema.parse(await req.json());
     // Business logic
     return apiSuccess(result);
   });
   ```

3. **Add Service Function**:
   ```typescript
   // src/services/newService.ts
   export async function operation(data): Promise<Result> {...}
   ```

4. **Use in Hooks**:
   ```typescript
   const { mutate } = useMutation(async (data) => {
     const res = await fetch('/api/new-endpoint', {...});
     return res.json();
   });
   ```

---

## 17. Testing Strategy

### Unit Tests
- Utility functions in `src/lib/`
- Service functions in `src/services/`
- Zod schemas validation

### Integration Tests
- API routes with mock Firestore
- Store interactions
- Component integration

### E2E Tests
- Critical user flows
- Task CRUD operations
- Messaging functionality
- Timer synchronization

### Manual Testing
- `npm run test:notifications` - Notification system
- `npm run test:email-templates` - Email formatting

---

## 18. Monitoring & Observability

### Sentry Integration
- Error tracking for production
- Performance monitoring
- Source map uploading
- Release tracking

### Logging
- Console logs (dev only)
- Firebase Function logs
- API request logging
- Timer sync debugging

### Metrics
- Task creation/update rates
- Message throughput
- Timer accuracy
- API response times

---

## 19. Known Issues & Limitations

### Browser Compatibility
- Safari requires long polling (implemented)
- IndexedDB not available in private browsing

### Performance Limits
- Firestore reads/writes are metered
- File upload size limits
- Message pagination for large conversations

### Feature Limitations
- Timer sync has device ID scope
- Real-time updates depend on internet
- Email delivery not guaranteed

---

## 20. Future Architecture Considerations

### Potential Improvements
1. **State Optimization**: Consider RTK Query for server state
2. **Database**: Evaluate Supabase for alternatives
3. **Backend**: Migrate to dedicated API (Node/Python)
4. **Caching**: Implement Redis for session caching
5. **Search**: Add Algolia or Elasticsearch for full-text search
6. **Message Queue**: RabbitMQ/SQS for async processing

### Scalability
- Firestore auto-scaling handles growth
- Cloud Storage unlimited capacity
- Function scaling automatic
- Consider sharding for large datasets

---

## Summary

The Aurin Task Manager is a **modern, full-stack web application** built with:
- **React 19 + Next.js 15** for frontend
- **Zustand** for client state management
- **Firebase Firestore** for real-time database
- **Next.js API Routes** for backend
- **Clerk** for authentication
- **Gemini AI** for intelligent features

The architecture emphasizes **modularity, real-time capabilities, and user-centric design**, with clear separation between frontend, backend, and data layers. The use of Firebase enables rapid development while maintaining scalability for growing teams.

