# Aurin Task Manager - Architecture Diagrams & Visual Overview

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AURIN TASK MANAGER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              CLIENT (Browser - React)                │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Pages (Next.js App Router)                 │    │  │
│  │  │  ├─ /dashboard/tasks                        │    │  │
│  │  │  ├─ /dashboard/accounts                     │    │  │
│  │  │  ├─ /dashboard/members                      │    │  │
│  │  │  └─ /dashboard/task/[taskId]/update        │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Components (Modular + UI Library)          │    │  │
│  │  │  ├─ modules/tasks/                          │    │  │
│  │  │  ├─ modules/chat/                           │    │  │
│  │  │  ├─ modules/data-views/                     │    │  │
│  │  │  ├─ modules/task-crud/                      │    │  │
│  │  │  └─ components/ui/ (45+ components)        │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  State Management (Zustand Stores)          │    │  │
│  │  │  ├─ dataStore (tasks, messages, clients)   │    │  │
│  │  │  ├─ timerStore (time tracking)             │    │  │
│  │  │  ├─ tasksPageStore (UI state)              │    │  │
│  │  │  ├─ formStore (form state)                 │    │  │
│  │  │  ├─ geminiStore (AI state)                 │    │  │
│  │  │  └─ 13+ more stores                        │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Custom Hooks (40+ hooks)                   │    │  │
│  │  │  ├─ useSharedTasksState                     │    │  │
│  │  │  ├─ useMessageActions                       │    │  │
│  │  │  ├─ useGeminiSummary                        │    │  │
│  │  │  ├─ useTimer                                │    │  │
│  │  │  └─ + more utility hooks                    │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Web Worker (Timer)                         │    │  │
│  │  │  └─ /public/timerWorker.js                 │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Authentication (Clerk)                     │    │  │
│  │  │  └─ Session Management                      │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Local Storage                              │    │  │
│  │  │  ├─ IndexedDB (messagePersistence)         │    │  │
│  │  │  └─ localStorage (cache)                    │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         NETWORK / REQUESTS                           │  │
│  │  ├─ HTTP/HTTPS API Calls                            │  │
│  │  ├─ Firestore Real-time Listeners (WebSocket)      │  │
│  │  └─ Long Polling (Safari fallback)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            SERVER (Next.js + Node.js)                │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Middleware (Clerk Auth)                    │    │  │
│  │  │  └─ Protects /dashboard/* and /api/*       │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  API Routes (Next.js Route Handlers)        │    │  │
│  │  │  ├─ POST /api/tasks (create)                │    │  │
│  │  │  ├─ GET /api/tasks (list)                   │    │  │
│  │  │  ├─ PUT/PATCH /api/tasks/[id] (update)    │    │  │
│  │  │  ├─ DELETE /api/tasks/[id] (delete)        │    │  │
│  │  │  ├─ /api/users/                            │    │  │
│  │  │  ├─ /api/upload/                           │    │  │
│  │  │  ├─ /api/generate-summary/                 │    │  │
│  │  │  └─ /api/send-notification-emails/         │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  API Utilities                              │    │  │
│  │  │  ├─ auth.ts (requireAuth, withAuth)        │    │  │
│  │  │  ├─ response.ts (apiSuccess, apiError)     │    │  │
│  │  │  └─ validations/ (Zod schemas)             │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Services (Business Logic)                  │    │  │
│  │  │  ├─ taskService.ts                         │    │  │
│  │  │  ├─ userService.ts                         │    │  │
│  │  │  ├─ clientService.ts                       │    │  │
│  │  │  ├─ emailNotificationService.ts            │    │  │
│  │  │  └─ emailTemplates.ts                      │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Utilities & Libraries                      │    │  │
│  │  │  ├─ taskUtils.ts                           │    │  │
│  │  │  ├─ userUtils.ts                           │    │  │
│  │  │  ├─ encryption.ts                          │    │  │
│  │  │  ├─ messagePersistence.ts                  │    │  │
│  │  │  └─ upload.ts                              │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                       ↑↓                             │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Firebase Admin SDK                         │    │  │
│  │  │  ├─ Firestore Operations                    │    │  │
│  │  │  ├─ Storage Operations                      │    │  │
│  │  │  └─ Authentication (User Creation)         │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  EXTERNAL SERVICES                                   │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │  Clerk (Authentication)                    │     │  │
│  │  │  └─ User Management, Sessions             │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │  Firebase (Google Cloud)                   │     │  │
│  │  │  ├─ Firestore (Database)                  │     │  │
│  │  │  ├─ Storage (File Upload)                 │     │  │
│  │  │  ├─ Functions (Serverless Backend)        │     │  │
│  │  │  ├─ Messaging (Push Notifications)        │     │  │
│  │  │  └─ AI (Gemini)                           │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │  Sentry (Error Tracking)                   │     │  │
│  │  │  └─ Production Error Monitoring            │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │  Email Service (Nodemailer)                │     │  │
│  │  │  └─ SMTP Sending                           │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │  Vercel (Deployment)                       │     │  │
│  │  │  └─ Hosting, Serverless Functions          │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. State Management Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              ZUSTAND STATE MANAGEMENT LAYER                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           dataStore.ts                              │    │
│  │  (Central Data State)                               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  State:                                             │    │
│  │  ├─ tasks: Task[]                                  │    │
│  │  ├─ messages: { [key: string]: Message[] }        │    │
│  │  ├─ clients: Client[]                              │    │
│  │  ├─ users: User[]                                  │    │
│  │  └─ isLoadingTasks: boolean                        │    │
│  │                                                     │    │
│  │  Methods:                                           │    │
│  │  ├─ setTasks(), addTask(), updateTask()           │    │
│  │  ├─ setMessages(), addMessage()                    │    │
│  │  ├─ setClients(), updateClient()                   │    │
│  │  └─ setUsers(), updateUser()                       │    │
│  └─────────────────────────────────────────────────────┘    │
│           ↑                 ↑                ↑                │
│           │                 │                │                │
│  ┌────────┴────┐    ┌──────┴──────┐   ┌────┴───────┐       │
│  │             │    │             │   │            │       │
│  ▼             ▼    ▼             ▼   ▼            ▼       │
│  
│  timerStore    tasksPageStore   formStore   geminiStore   │
│  ┌──────────┐  ┌──────────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Timer    │  │ Tasks Page   │ │  Form   │ │  Gemini  │  │
│  │ State    │  │ UI State     │ │ Values  │ │   AI     │  │
│  │          │  │              │ │         │ │ State    │  │
│  │• running │  │• container   │ │• form   │ │• loading │  │
│  │• seconds │  │• taskView    │ │• errors │ │• summary │  │
│  │• taskId  │  │• isOpen      │ │• values │ │• mode    │  │
│  │• userId  │  │• editTaskId  │ │         │ │          │  │
│  │• syncing │  │• showLoader  │ │         │ │          │  │
│  └──────────┘  └──────────────┘ └─────────┘ └──────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        13+ MORE STORES FOR SPECIFIC FEATURES        │   │
│  │  tasksKanbanStore, createTaskStore, sidebarStore,  │   │
│  │  userSwiperStore, chunkStore, clientsTableStore... │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                        ↓ (Subscribed by)
                        
         ┌──────────────────────────────────────────┐
         │    COMPONENTS & CUSTOM HOOKS             │
         │                                          │
         │  useDataStore()                          │
         │  useTimerStore()                         │
         │  useTasksPageStore()                     │
         │  useSharedTasksState() - Composite Hook  │
         │  useMessageActions()                     │
         │  useGeminiSummary()                      │
         └──────────────────────────────────────────┘
```

---

## 3. API Architecture

```
┌─────────────────────────────────────────────────────────┐
│           NEXT.JS API ROUTES (Route Handlers)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  REQUEST ──┐                                            │
│            ▼                                            │
│       ┌──────────────────────────────────┐             │
│       │  middleware.ts                   │             │
│       │  (Clerk Auth Protection)         │             │
│       │  ├─ Protected: /dashboard/*, /api/*│          │
│       │  ├─ Public: /api/sendFeedback   │             │
│       │  └─ Allow: Others                │             │
│       └──────────────────────────────────┘             │
│            ▼                                            │
│       ┌──────────────────────────────────┐             │
│       │  withAuth(handler)                │             │
│       │  ├─ Extracts userId from Clerk   │             │
│       │  ├─ Returns error if unauthorized│             │
│       │  └─ Calls handler(userId, req)  │             │
│       └──────────────────────────────────┘             │
│            ▼                                            │
│       ┌──────────────────────────────────┐             │
│       │  Validation Layer                 │             │
│       │  (Zod Schemas)                    │             │
│       │  ├─ Parse request body            │             │
│       │  ├─ Validate schema               │             │
│       │  └─ Return apiBadRequest if fail │             │
│       └──────────────────────────────────┘             │
│            ▼                                            │
│       ┌──────────────────────────────────┐             │
│       │  Business Logic (Services)        │             │
│       │  ├─ taskService                  │             │
│       │  ├─ userService                  │             │
│       │  ├─ clientService                │             │
│       │  └─ emailNotificationService     │             │
│       └──────────────────────────────────┘             │
│            ▼                                            │
│       ┌──────────────────────────────────┐             │
│       │  Database Operations              │             │
│       │  (Firebase Admin SDK)             │             │
│       │  ├─ setDoc() - Write              │             │
│       │  ├─ updateDoc() - Update          │             │
│       │  ├─ deleteDoc() - Delete          │             │
│       │  └─ getDocs() - Read              │             │
│       └──────────────────────────────────┘             │
│            ▼                                            │
│       ┌──────────────────────────────────┐             │
│       │  Response Formatting              │             │
│       │  (apiSuccess, apiError, etc.)     │             │
│       │  ├─ Success: {success: true, data}│           │
│       │  └─ Error: {success: false, error}│           │
│       └──────────────────────────────────┘             │
│            ▼                                            │
│       RESPONSE ──────────────────────────────────┐     │
│                                                  │     │
│  ┌──────────────────────────────────────────────┘     │
│  │                                                     │
│  │  API Routes:                                       │
│  │                                                     │
│  │  POST   /api/tasks                ─┐              │
│  │  GET    /api/tasks                 │              │
│  │  GET    /api/tasks/[id]            │ Task CRUD   │
│  │  PUT    /api/tasks/[id]            │              │
│  │  PATCH  /api/tasks/[id]            │              │
│  │  DELETE /api/tasks/[id]           ─┘              │
│  │                                                     │
│  │  GET    /api/users                ─┐              │
│  │  GET    /api/users/[id]            │ User Ops    │
│  │  PATCH  /api/users/[id]           ─┘              │
│  │                                                     │
│  │  POST   /api/upload                ─ File Ops   │
│  │  DELETE /api/delete-image                        │
│  │                                                     │
│  │  POST   /api/generate-summary      ─ AI Ops     │
│  │  POST   /api/send-notification-emails ─ Email   │
│  │                                                     │
│  └─────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────┘
```

---

## 4. Component & Module Organization

```
┌──────────────────────────────────────────────────────────────┐
│                  MODULAR ARCHITECTURE                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /modules (Feature Modules - Self-contained)       │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                     │    │
│  │  tasks/                                             │    │
│  │  ├─ components/                                     │    │
│  │  ├─ hooks/                                          │    │
│  │  └─ index.ts (exports)                              │    │
│  │                                                     │    │
│  │  task-crud/                                         │    │
│  │  ├─ components/                                     │    │
│  │  ├─ hooks/                                          │    │
│  │  └─ utils/                                          │    │
│  │                                                     │    │
│  │  data-views/                                        │    │
│  │  ├─ tasks/                                          │    │
│  │  │  ├─ components/TasksTable.tsx                   │    │
│  │  │  ├─ components/KanbanBoard.tsx                  │    │
│  │  │  ├─ hooks/                                      │    │
│  │  │  └─ stores/                                      │    │
│  │  └─ clients/                                        │    │
│  │     ├─ components/ClientsTable.tsx                 │    │
│  │     └─ hooks/                                      │    │
│  │                                                     │    │
│  │  chat/                                              │    │
│  │  ├─ components/ChatWindow.tsx                      │    │
│  │  ├─ components/MessageList.tsx                     │    │
│  │  ├─ hooks/useMessageActions.ts                     │    │
│  │  └─ utils/                                          │    │
│  │                                                     │    │
│  │  header/ ─────┐                                     │    │
│  │  modal/       │                                     │    │
│  │  footer/      │─── LAYOUT MODULES                  │    │
│  │  sidebar/     │                                     │    │
│  │  loader/    ──┘                                     │    │
│  │                                                     │    │
│  │  profile-card/                                      │    │
│  │  profile-config/ ──── USER MODULES                │    │
│  │  config/                                            │    │
│  │                                                     │    │
│  │  toast/                                             │    │
│  │  sonner/ ────────── NOTIFICATION MODULES          │    │
│  │  advices/                                           │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /components (Global Components)                   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                     │    │
│  │  ui/                                                │    │
│  │  ├─ Button.tsx                                      │    │
│  │  ├─ Modal.tsx                                       │    │
│  │  ├─ Input.tsx                                       │    │
│  │  ├─ Select.tsx                                      │    │
│  │  ├─ Table.tsx                                       │    │
│  │  ├─ Card.tsx                                        │    │
│  │  ├─ Dialog.tsx                                      │    │
│  │  └─ ... 40+ more components                        │    │
│  │                                                     │    │
│  │  animate-ui/                                        │    │
│  │  ├─ AnimatedCard.tsx                               │    │
│  │  ├─ FadeIn.tsx                                      │    │
│  │  └─ Slide.tsx                                       │    │
│  │                                                     │    │
│  │  ChatSidebar.tsx                                    │    │
│  │  MessageSidebar.tsx                                 │    │
│  │  TimerDisplay.tsx                                   │    │
│  │  UsersSyncProvider.tsx                              │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /hooks (Custom Hooks - Reusable Logic)            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                     │    │
│  │  Data & State:                                      │    │
│  │  ├─ useSharedTasksState() ─┐                       │    │
│  │  ├─ useDataStore()         │ Data Access           │    │
│  │  ├─ useTimer()             │                       │    │
│  │  └─ useTimerStore()       ─┘                       │    │
│  │                                                     │    │
│  │  Forms & Input:                                     │    │
│  │  ├─ useFormOptimizations() ──┐                     │    │
│  │  ├─ useOptimizedForm()       │ Form Logic          │    │
│  │  └─ useCreateTaskOptimizations() ─┘                │    │
│  │                                                     │    │
│  │  Messages:                                          │    │
│  │  ├─ useMessageActions() ────┐                      │    │
│  │  ├─ useMessagePagination()  │ Message Ops         │    │
│  │  └─ useReadStatus()        ─┘                      │    │
│  │                                                     │    │
│  │  AI & Automation:                                   │    │
│  │  ├─ useGeminiSummary()    ──┐                      │    │
│  │  ├─ useGeminiIntegration()  │ AI Features         │    │
│  │  └─ useChatGPTIntegration() ─┘                     │    │
│  │                                                     │    │
│  │  Files & Media:                                     │    │
│  │  ├─ useImageUpload() ───────┐                      │    │
│  │  └─ useImageWithRetry()    ─┘ Media Ops           │    │
│  │                                                     │    │
│  │  Misc:                                              │    │
│  │  ├─ useOnlineStatus()                              │    │
│  │  ├─ useInactivityDetection()                       │    │
│  │  ├─ useAvailabilityStatus()                        │    │
│  │  └─ ... and 20+ more hooks                         │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow: Task Creation

```
┌──────────────────────────────────────────────────────────────┐
│              TASK CREATION DATA FLOW                          │
└──────────────────────────────────────────────────────────────┘

USER INTERFACE
│
├─ Task Creation Form (module/task-crud/components/CreateTaskForm.tsx)
│  └─ User fills form with:
│     ├─ Client ID
│     ├─ Project name
│     ├─ Task name & description
│     ├─ Dates, priority, status
│     └─ Leaders & assignees
│
▼
VALIDATION (Client-side)
│
├─ React Hook Form validation
├─ Zod schema parsing
└─ Display errors if validation fails

▼
STATE MANAGEMENT (Zustand)
│
├─ formStore.setFormValues()
├─ createTaskStore.setCreatingState()
└─ Temporary UI state update

▼
API REQUEST
│
├─ POST /api/tasks
│  └─ Request body:
│     {
│       clientId: string,
│       project: string,
│       name: string,
│       description: string,
│       startDate: ISO string,
│       endDate: ISO string,
│       status: enum,
│       priority: enum,
│       LeadedBy: string[],
│       AssignedTo: string[]
│     }

▼
SERVER PROCESSING (Next.js API Route)
│
├─ middleware.ts checks Clerk auth
├─ withAuth() extracts userId
├─ Request body parsing & Zod validation
├─ taskSchema.safeParse(body)
│
├─ If validation fails:
│  └─ Return apiBadRequest(errors)
│
├─ If validation passes:
│  └─ Business logic execution:
│     ├─ Create Firestore document ID
│     ├─ Add CreatedBy: userId
│     ├─ Set createdAt: serverTimestamp()
│     ├─ Convert dates to Timestamps
│     └─ Prepare task document

▼
DATABASE WRITE
│
├─ Firestore: setDoc(taskDocRef, taskData)
├─ updateTaskActivity(taskId, 'edit')
├─ Real-time listeners pick up change
└─ Return apiCreated(task, location)

▼
SIDE EFFECTS
│
├─ emailNotificationService.send()
│  └─ Send notification emails to:
│     ├─ Assigned team members
│     └─ Task leaders
│
└─ Firestore listener triggers

▼
CLIENT STATE UPDATE
│
├─ Firestore onSnapshot() listener
├─ dataStore.addTask(newTask)
├─ formStore.resetForm()
├─ UI re-renders with new task
└─ Toast notification: "Task created"

▼
UI FEEDBACK
│
├─ New task appears in list
├─ Success toast message
├─ Form closes (modal)
└─ Navigation to task detail (optional)
```

---

## 6. Real-Time Message Flow

```
┌──────────────────────────────────────────────────────────────┐
│         REAL-TIME MESSAGE SENDING FLOW                        │
└──────────────────────────────────────────────────────────────┘

USER TYPES & SENDS MESSAGE
│
▼
LOCAL STATE UPDATE
│
├─ dataStore.addMessage()
├─ Set isPending: true
├─ Set timestamp: now()
└─ UI optimistically shows message

▼
FIRESTORE WRITE
│
├─ setDoc(docRef, {
│    senderId: userId,
│    senderName: currentUser.fullName,
│    text: messageText,
│    timestamp: serverTimestamp(),
│    read: false,
│    clientId: currentClientId,
│    isPending: true
│  })

▼
FIRESTORE LISTENER (onSnapshot)
│
├─ Server timestamp replaces client timestamp
├─ Listener fires with server document
├─ isPending: false (message confirmed)
├─ Message ID updated if needed
└─ dataStore.updateMessage()

▼
UI UPDATE
│
├─ Message appears confirmed
├─ Timestamp shows server time
└─ Other users also see message via listener

▼
MULTI-USER SYNC
│
├─ Every client has onSnapshot listener
├─ New message arrives for all users
├─ Data stored in IndexedDB cache
├─ Firestore pagination for history

▼
READ STATUS TRACKING
│
├─ Other users see new message
├─ markMessageAsRead() is triggered
├─ updateDoc() updates read: true
├─ Listener notifies all users
└─ UI shows "read" indicator
```

---

## 7. Timer Synchronization Flow

```
┌──────────────────────────────────────────────────────────────┐
│        TIMER SYNCHRONIZATION WITH FIRESTORE                   │
└──────────────────────────────────────────────────────────────┘

USER CLICKS "START TIMER"
│
▼
LOCAL STATE
│
├─ timerStore.setIsRunning(true)
├─ timerStore.setTaskId(taskId)
├─ timerStore.setUserId(userId)
└─ timerStore.setStartTime(now())

▼
WEB WORKER INITIALIZATION
│
├─ new Worker('/timerWorker.js')
├─ Send: { type: 'start' }
├─ Worker: setInterval(tick, 1000)
└─ Worker: postMessage({ type: 'tick' })

▼
TICK EVERY 1 SECOND
│
├─ Worker increments counter
├─ Main thread receives tick
├─ timerStore.accumulatedSeconds++
└─ UI displays: "0:00:01", "0:00:02"...

▼
PERIODIC SYNC TO FIRESTORE (every 30 seconds)
│
├─ syncToFirestore():
│  ├─ Get current state
│  ├─ Calculate elapsed time
│  ├─ Write to Firestore:
│  │  {
│  │    taskId: taskId,
│  │    userId: userId,
│  │    accumulatedSeconds: 180,
│  │    lastSyncTime: performance.now(),
│  │    deviceId: crypto.randomUUID(),
│  │    timestamp: serverTimestamp()
│  │  }
│  └─ Set syncStatus: 'idle'
│
└─ If sync fails: syncStatus: 'error'

▼
PAUSE/RESUME
│
├─ User clicks "Pause"
├─ timerStore.setIsRunning(false)
├─ Worker: clearInterval()
├─ Accumulated seconds preserved
│
├─ User clicks "Resume"
├─ timerStore.setIsRunning(true)
├─ Worker: setInterval() again
└─ Continue from accumulated seconds

▼
PAGE RELOAD/CLOSE
│
├─ beforeunload event
├─ timerStore.finalizeTimer():
│  ├─ Calculate total hours
│  ├─ POST /api/tasks/[id]/finalize
│  ├─ Save to timeTracking collection
│  └─ Return: { totalHours: 2.5 }
│
└─ localStorage or Firestore sync

▼
ON PAGE REOPEN
│
├─ timerStore.initializeTimer(taskId, userId)
├─ Query Firestore for last timer record
├─ Restore: accumulatedSeconds, lastSyncTime
├─ Compare with server: check for drift
├─ Adjust if device time differs
└─ Ready to resume

▼
MULTI-DEVICE SYNC
│
├─ Device A: Working on Task 1
├─ Device B: Opens same task
├─ Firestore listener on Device B
├─ Receives latest timerState
├─ Device ID allows tracking per-device
└─ Both sync independently
```

---

## 8. Authentication & Authorization Flow

```
┌──────────────────────────────────────────────────────────────┐
│         CLERK AUTHENTICATION FLOW                             │
└──────────────────────────────────────────────────────────────┘

USER VISITS APP
│
▼
ROOT LAYOUT (src/app/layout.tsx)
│
├─ <ClerkProvider>
│  └─ Loads Clerk session
│     ├─ Checks for session token
│     ├─ Validates with Clerk backend
│     └─ Initializes user context
│
▼
MIDDLEWARE (src/middleware.ts)
│
├─ clerkMiddleware() runs on every request
├─ Matches route against patterns:
│  ├─ Protected: /dashboard/*, /api/*
│  └─ Public: /sign-in, /sign-up, /api/sendFeedback
│
├─ For protected routes:
│  └─ auth.protect()
│     ├─ Checks if user authenticated
│     ├─ If not: redirect to /sign-in
│     └─ If yes: allow request
│
▼
DASHBOARD LAYOUT (src/app/dashboard/layout.tsx)
│
├─ Server-side: await auth()
├─ If !userId: redirect('/sign-in')
├─ Pass userId to child pages
└─ Render protected content

▼
API ROUTE PROTECTION (All /api/* routes)
│
├─ withAuth() wrapper
├─ Extracts userId from Clerk
├─ If no userId: return apiUnauthorized()
├─ If authenticated: call handler(userId, req)
└─ Handler processes with user context

▼
CLIENT STATE
│
├─ <ClerkProvider> provides useAuth()
├─ Components can access:
│  ├─ const { userId, user } = useAuth()
│  └─ user.fullName, user.imageUrl, etc.
│
▼
SESSION PERSISTENCE
│
├─ Session token stored securely
├─ Automatic refresh before expiry
├─ Survives page reload
└─ Survives browser restart

▼
SIGN OUT
│
├─ User clicks logout
├─ Clerk.signOut()
├─ Clear session
├─ Redirect to /
└─ All API calls fail with 401
```

---

## Summary Comparison: Before & After Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              ARCHITECTURE EVOLUTION                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ASPECT              │  CURRENT SETUP                           │
│  ─────────────────────┼────────────────────────────────────────│
│                      │                                          │
│  State Management    │  18+ Zustand stores (distributed)       │
│                      │  - Simple, flexible, minimal overhead    │
│                      │                                          │
│  Data Fetching       │  Firebase Firestore (real-time)         │
│                      │  - Automatic sync across clients        │
│                      │  - Offline support built-in             │
│                      │                                          │
│  Backend             │  Next.js API Routes + Firebase          │
│                      │  - Serverless, scalable                 │
│                      │  - Minimal infrastructure needed        │
│                      │                                          │
│  Authentication      │  Clerk + Firebase Auth                  │
│                      │  - Modern, user-friendly                │
│                      │  - Social login, MFA support            │
│                      │                                          │
│  Code Organization   │  Modular feature-based (/modules)      │
│                      │  - Clear separation of concerns          │
│                      │  - Easy to scale and maintain            │
│                      │                                          │
│  Component Pattern   │  React Hooks + Custom Hooks             │
│                      │  - Logic extraction into hooks           │
│                      │  - 40+ custom hooks for reuse           │
│                      │                                          │
│  Styling             │  Tailwind CSS + SCSS Modules            │
│                      │  - Utility-first + component scoping     │
│                      │  - Performance optimized                │
│                      │                                          │
│  Error Handling      │  Standardized API responses + Sentry    │
│                      │  - Consistent error format               │
│                      │  - Production monitoring                │
│                      │                                          │
│  Testing            │  Unit + Integration (framework ready)    │
│                      │  - Manual testing scripts available      │
│                      │  - E2E testing possible with Playwright │
│                      │                                          │
│  Deployment         │  Vercel (Next.js optimized)             │
│                      │  - Zero-config deployment               │
│                      │  - Automatic scaling                    │
│                      │                                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Principles

### 1. **Modularity**
- Features organized in `/modules` with clear boundaries
- Each module self-contained with components, hooks, utils
- Easy to develop, test, and scale independently

### 2. **Separation of Concerns**
- **Presentation**: Components and modules
- **State**: Zustand stores
- **Logic**: Custom hooks and services
- **Data**: Firebase (Firestore, Storage)
- **API**: Next.js route handlers

### 3. **Real-Time First**
- Firebase Firestore for real-time data sync
- Multi-client consistency automatic
- Offline support via persistent cache
- Pub/sub pattern via listeners

### 4. **Type Safety**
- TypeScript throughout
- Zod schemas for validation
- Branded types for entity IDs
- Strong IDE support

### 5. **Performance**
- Zustand shallow selectors prevent re-renders
- Web Worker for non-blocking timer
- Firestore indexes for fast queries
- Code splitting via Next.js

### 6. **Security**
- Clerk for authentication
- Middleware protects routes
- API validation with Zod
- Firestore rules enforcement
- Sensitive data encryption

---

## Next.js 15 + React 19 Features Utilized

- **Server Components** by default in App Router
- **Streaming & Suspense** for progressive rendering
- **Route Groups** for organization (e.g., `(auth)`)
- **Dynamic Routes** with `[paramName]`
- **Middleware** for cross-cutting concerns
- **API Routes** (not Pages API)
- **Image Optimization** with next/image
- **Built-in TypeScript** support
- **React 19 features**: use client, Server Actions potential

