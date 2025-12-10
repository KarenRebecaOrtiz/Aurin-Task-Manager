# TasksDataStore - Single Source of Truth para Datos de Tasks

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Diferencias con dataStore](#diferencias-con-datastore)
3. [Arquitectura](#arquitectura)
4. [Flujo de Datos](#flujo-de-datos)
5. [API del Store](#api-del-store)
6. [Guía de Uso](#guía-de-uso)
7. [Hooks Disponibles](#hooks-disponibles)
8. [Patrones Recomendados](#patrones-recomendados)
9. [Performance y Optimización](#performance-y-optimización)
10. [Troubleshooting](#troubleshooting)

---

## Descripción General

`tasksDataStore` es un **Zustand store** que centraliza los datos de **tasks individuales** con suscripciones en tiempo real. Complementa (no reemplaza) el sistema de cache existente (`dataStore` + `taskService`).

### Problema que Resuelve

**Antes (sin tasksDataStore):**
```typescript
// Componente A - TaskDialog
const [task, setTask] = useState(null);
useEffect(() => {
  const fetchTask = async () => {
    const snap = await getDoc(doc(db, 'tasks', taskId));
    setTask(snap.data());
  };
  fetchTask();
}, [taskId]);

// Componente B - ChatMessage mostrando la misma tarea
const [task, setTask] = useState(null);
useEffect(() => {
  const fetchTask = async () => {
    const snap = await getDoc(doc(db, 'tasks', taskId)); // ❌ Duplicado
    setTask(snap.data());
  };
  fetchTask();
}, [taskId]);

// Resultado: 2 queries a Firestore para la misma tarea
// ❌ Sin actualizaciones en tiempo real
// ❌ Datos potencialmente desincronizados
```

**Después (con tasksDataStore):**
```typescript
// Componente A - TaskDialog
const { taskData } = useTaskState(taskId);

// Componente B - ChatMessage
const taskName = useTaskName(taskId); // ✅ Usa el mismo cache

// Resultado: 1 suscripción onSnapshot compartida
// ✅ Actualizaciones en tiempo real automáticas
// ✅ Datos siempre sincronizados
```

### Beneficios

| Sin tasksDataStore | Con tasksDataStore |
|-------------------|-------------------|
| Cada componente hace `getDoc(taskId)` | Un `onSnapshot` compartido por task |
| 3 componentes muestran task123 = 3 reads | 3 componentes = 1 suscripción |
| Sin actualizaciones en tiempo real | Realtime automático |
| Datos desincronizados | Cache compartido |

### Métricas de Impacto

**Ejemplo real**: Una tarea mostrada en TaskDialog + Chat + Sidebar

- **Antes**: 3 componentes × 1 tarea = **3 getDoc()**
- **Después**: 1 suscripción `onSnapshot` = **1 listener** (realtime)
- **Reducción**: **67% menos requests** + actualizaciones automáticas

---

## Diferencias con dataStore

| Característica | `dataStore` (existente) | `tasksDataStore` (nuevo) |
|----------------|------------------------|--------------------------|
| **Propósito** | Colecciones completas (tablas, kanban) | Tasks individuales (dialogs, chat) |
| **Estructura** | `tasks: Task[]` | `tasks: Map<taskId, Task>` |
| **Query** | `getDocs()` con filtros | `onSnapshot()` por task ID |
| **Actualización** | Manual (refetch completo) | Automática (realtime) |
| **Caso de uso** | TasksTable, KanbanBoard | TaskDialog, ChatMessage |
| **Cache** | globalRequestCache + IDB | LRU Map + SessionStorage |
| **Realtime** | No | Sí |

### ¿Cuándo usar cada uno?

```typescript
// ✅ dataStore - Para vistas de colección
const tasks = useDataStore((state) => state.tasks); // Todas las tareas
<TasksTable tasks={tasks} />
<KanbanBoard tasks={tasks} />

// ✅ tasksDataStore - Para tasks individuales
const { taskData } = useTaskState(taskId); // Una tarea específica
<TaskDialog task={taskData} />
const taskName = useTaskName(messageTaskId); // Solo el nombre
<ChatMessage taskName={taskName} />
```

**Nota importante**: Ambos stores **coexisten**. No necesitas migrar TasksTable/Kanban, solo agrega `tasksDataStore` donde necesites datos de tasks individuales.

---

## Arquitectura

### Arquitectura Híbrida: In-Memory LRU + SessionStorage

```
┌─────────────────────────────────────────────────────────────────┐
│                    tasksDataStore (Zustand)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────┐    ┌──────────────────────────┐     │
│  │   In-Memory Cache     │    │   SessionStorage Cache   │     │
│  │   (LruMap - Max 100)  │    │   (TTL: 5 minutos)       │     │
│  │                       │    │                          │     │
│  │  task123 → Task       │◄──►│  tasks_cache_task123     │     │
│  │  task456 → Task       │    │  tasks_cache_task456     │     │
│  │  task789 → Task       │    │  tasks_cache_task789     │     │
│  │                       │    │                          │     │
│  │  ✅ Ultra rápido      │    │  ✅ Persiste re-renders  │     │
│  │  ✅ Auto-limita 100   │    │  ✅ TTL automático       │     │
│  └───────────────────────┘    └──────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │          Firestore Subscriptions (onSnapshot)         │     │
│  │                                                       │     │
│  │  task123 → onSnapshot('/tasks/task123')              │     │
│  │  task456 → onSnapshot('/tasks/task456')              │     │
│  │  task789 → onSnapshot('/tasks/task789')              │     │
│  │                                                       │     │
│  │  ✅ Realtime updates                                  │     │
│  │  ✅ Auto cleanup on unmount (opcional)                │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                  Auto Cleanup                         │     │
│  │                                                       │     │
│  │  • Interval: cada 5 minutos                           │     │
│  │  • LRU: elimina automáticamente cuando > 100 tasks    │     │
│  │  • TTL: elimina entradas > 5 minutos                  │     │
│  │  • beforeunload: unsubscribe all                      │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │ TaskDialog │     │ ChatMessage│     │  Sidebar   │
    │ (consume)  │     │ (consume)  │     │ (consume)  │
    └────────────┘     └────────────┘     └────────────┘
```

### Archivos del Sistema

```
src/
├── stores/
│   ├── dataStore.ts              # Colecciones completas (tablas)
│   └── tasksDataStore.ts         # Tasks individuales ← NUEVO
├── hooks/
│   └── useTaskData.ts            # Hooks optimizados ← NUEVO
└── services/
    └── taskService.ts            # Mantener para colecciones
```

---

## Flujo de Datos

### 1. Primera Suscripción (TaskDialog se abre)

```
Usuario abre TaskDialog con task123
       ↓
useTaskState(task123) se ejecuta
       ↓
Hook llama a subscribeToTask(task123)
       ↓
Store verifica si ya existe suscripción
       ↓
NO existe → Continuar
       ↓
1. Intenta cargar desde SessionStorage (UI instantánea)
       ↓
   ┌─ Si existe → Retornar inmediatamente (cache HIT)
   └─ Si NO existe → Marcar como "loading"
       ↓
2. Establece onSnapshot en Firestore
       ↓
Datos llegan desde Firestore
       ↓
Actualiza In-Memory cache (LRU)
       ↓
Actualiza SessionStorage cache
       ↓
TaskDialog re-renderiza con datos frescos
```

### 2. Cache Hit (ChatMessage necesita la misma tarea)

```
ChatMessage necesita task123
       ↓
useTaskName(task123) se ejecuta
       ↓
Hook llama a subscribeToTask(task123)
       ↓
Store verifica si ya existe suscripción
       ↓
SÍ existe → Skip (evita duplicados)
       ↓
getTask(task123) retorna desde cache
       ↓
   ✅ In-Memory cache → HIT (0ms)
       ↓
ChatMessage muestra el nombre (cache HIT)
       ↓
Stats: hits++
```

### 3. Actualización Realtime (Usuario edita la tarea)

```
Usuario edita task123 en Firestore
       ↓
onSnapshot detecta el cambio automáticamente
       ↓
Callback se ejecuta con nuevos datos
       ↓
Actualiza In-Memory cache
       ↓
Actualiza SessionStorage cache
       ↓
TODOS los componentes suscritos se actualizan
       ↓
TaskDialog re-renderiza
ChatMessage re-renderiza
Sidebar re-renderiza
```

---

## API del Store

### State

```typescript
interface TasksDataState {
  // In-memory cache con LRU automático
  tasks: LruMap<string, CachedTaskEntry>;

  // Suscripciones activas
  subscriptions: Map<string, Unsubscribe>;

  // Estado de carga por task
  loadingTasks: Set<string>;

  // Errores por task
  errors: Map<string, Error>;

  // Métricas
  stats: {
    hits: number;
    misses: number;
    subscriptions: number;
  };
}
```

### Actions

```typescript
interface TasksDataActions {
  subscribeToTask: (taskId: string) => void;
  unsubscribeFromTask: (taskId: string) => void;
  getTask: (taskId: string) => Task | null;
  getTaskName: (taskId: string) => string;
  getTaskStatus: (taskId: string) => string;
  isTaskLoading: (taskId: string) => boolean;
  getTaskError: (taskId: string) => Error | null;
  invalidateTask: (taskId: string) => void;
  invalidateAll: () => void;
  cleanupExpired: () => number;
  getStats: () => StoreStats;
  unsubscribeAll: () => void;
}
```

---

## Guía de Uso

### ✅ Caso 1: TaskDialog - Datos completos con estados

```tsx
import { useTaskState } from '@/hooks/useTaskData';

function TaskDialog({ taskId }: { taskId: string }) {
  const { taskData, isLoading, error } = useTaskState(taskId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!taskData) return null;

  return (
    <div>
      <h1>{taskData.name}</h1>
      <p>{taskData.description}</p>
      <StatusBadge status={taskData.status} />
      <PriorityBadge priority={taskData.priority} />
    </div>
  );
}
```

### ✅ Caso 2: ChatMessage - Solo nombre de tarea

```tsx
import { useTaskName } from '@/hooks/useTaskData';

function ChatMessage({ message }: { message: Message }) {
  const taskName = useTaskName(message.taskId);

  return (
    <div>
      <p>{message.text}</p>
      {message.taskId && <span>Tarea: {taskName}</span>}
    </div>
  );
}
```

### ✅ Caso 3: TaskStatusBadge - Solo status

```tsx
import { useTaskStatus } from '@/hooks/useTaskData';

function TaskStatusBadge({ taskId }: { taskId: string }) {
  const status = useTaskStatus(taskId);

  return <Badge status={status} />;
}
```

### ✅ Caso 4: Multiple tasks en Chat

```tsx
import { useSubscribeToMultipleTasks, useTaskName } from '@/hooks/useTaskData';

function ChatMessages({ messages }: { messages: Message[] }) {
  const taskIds = messages
    .map((m) => m.taskId)
    .filter((id): id is string => Boolean(id));

  // Se suscribe a TODOS de una vez
  useSubscribeToMultipleTasks(taskIds);

  return (
    <div>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const taskName = useTaskName(message.taskId || '', { autoSubscribe: false });

  return (
    <div>
      <p>{message.text}</p>
      {message.taskId && <span>Tarea: {taskName}</span>}
    </div>
  );
}
```

---

## Hooks Disponibles

### Hooks de Datos Específicos (Optimizados)

```typescript
// Solo nombre
const taskName = useTaskName(taskId);

// Solo status
const taskStatus = useTaskStatus(taskId);

// Solo prioridad
const taskPriority = useTaskPriority(taskId);

// Solo clientId
const clientId = useTaskClientId(taskId);

// Datos completos
const taskData = useTaskData(taskId);
```

**Ventaja**: Solo re-renderizan cuando ESE campo cambia.

### Hooks de Estado

```typescript
// Verificar si está cargando
const isLoading = useIsTaskLoading(taskId);

// Obtener error
const error = useTaskError(taskId);

// Todo junto
const { taskData, isLoading, error } = useTaskState(taskId);
```

### Hook de Múltiples Tasks

```typescript
// Suscribirse a múltiples
useSubscribeToMultipleTasks(taskIds);

// Obtener múltiples
const tasksData = useMultipleTasksData(taskIds);
```

---

## Patrones Recomendados

### 1. TaskDialog / Modal (Datos completos)

```tsx
function TaskDialog({ taskId }: { taskId: string }) {
  const { taskData, isLoading, error } = useTaskState(taskId, {
    unsubscribeOnUnmount: true, // Modal temporal
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <TaskForm task={taskData} />;
}
```

### 2. ChatMessage / List Item (Solo nombre)

```tsx
function ChatMessage({ message }: { message: Message }) {
  const taskName = useTaskName(message.taskId);

  return <div>Tarea: {taskName}</div>;
}
```

### 3. Conditional Rendering

```tsx
function OptionalTaskInfo({ taskId }: { taskId: string | null }) {
  const taskData = useTaskData(taskId || '', {
    autoSubscribe: Boolean(taskId), // Solo suscribe si existe taskId
  });

  if (!taskId || !taskData) return null;

  return <div>{taskData.name}</div>;
}
```

---

## Performance y Optimización

### Reducción de Requests

**Escenario**: Task123 se muestra en TaskDialog + 3 mensajes de chat

**Sin tasksDataStore:**
```
TaskDialog: getDoc(task123) = 1 read
ChatMessage 1: getDoc(task123) = 1 read
ChatMessage 2: getDoc(task123) = 1 read
ChatMessage 3: getDoc(task123) = 1 read
Total: 4 reads
```

**Con tasksDataStore:**
```
TaskDialog: onSnapshot(task123) = 1 suscripción
ChatMessage 1: cache HIT
ChatMessage 2: cache HIT
ChatMessage 3: cache HIT
Total: 1 suscripción (realtime)
```

**Reducción: 75%** + actualizaciones automáticas

### Métricas

```typescript
const stats = useTasksDataStore.getState().getStats();
console.log(stats);
// {
//   hits: 45,
//   misses: 12,
//   hitRate: 0.789, // 78.9%
//   cacheSize: 15,
//   activeSubscriptions: 8
// }
```

**Hit rate objetivo: > 70%**

---

## Troubleshooting

### Los datos no se actualizan

**Síntoma**: Cambios en Firestore no se reflejan.

**Solución**:
```tsx
// ❌ INCORRECTO - No se suscribe
const taskData = useTasksDataStore((state) => state.getTask(taskId));

// ✅ CORRECTO - Se suscribe automáticamente
const taskData = useTaskData(taskId);
```

### Cache vacío

**Síntoma**: `getTask(taskId)` retorna `null`.

**Solución**:
```tsx
const { taskData, isLoading, error } = useTaskState(taskId);

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;
if (!taskData) return null;
```

### Re-renders excesivos

**Síntoma**: Componente re-renderiza mucho.

**Solución**:
```tsx
// ❌ INCORRECTO - Re-renderiza con cualquier cambio
const taskData = useTaskData(taskId);
return <span>{taskData?.name}</span>;

// ✅ CORRECTO - Solo re-renderiza si el nombre cambia
const taskName = useTaskName(taskId);
return <span>{taskName}</span>;
```

---

## Resumen de Migración

| Necesito... | Usar... |
|-------------|---------|
| Nombre de tarea | `useTaskName(taskId)` |
| Status de tarea | `useTaskStatus(taskId)` |
| Prioridad de tarea | `useTaskPriority(taskId)` |
| Datos completos + estados | `useTaskState(taskId)` |
| Múltiples tasks | `useSubscribeToMultipleTasks(taskIds)` |
| Invalidar cache | `invalidateTask(taskId)` |
| Estadísticas | `getStats()` |

---

**Regla de oro**: Para tasks individuales en TaskDialog, ChatMessage, Sidebar → usa `tasksDataStore`. Para vistas de colección (TasksTable, Kanban) → mantén `dataStore`.
