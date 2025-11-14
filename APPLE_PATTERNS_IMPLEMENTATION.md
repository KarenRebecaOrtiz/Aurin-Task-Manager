# Implementación de Patrones de Apple (apps.apple.com) en Next.js

Este documento detalla cómo se han adaptado los patrones de arquitectura de Svelte de apps.apple.com a tu proyecto Next.js con React y Zustand.

## 📋 Tabla de Contenidos

1. [Resumen de Patrones Implementados](#resumen-de-patrones-implementados)
2. [Platform Detection (Feature-First)](#platform-detection)
3. [LRU Cache](#lru-cache)
4. [Request Cache con TTL](#request-cache-con-ttl)
5. [Error Enrichment System](#error-enrichment-system)
6. [Optimistic Updates](#optimistic-updates)
7. [Promise-Based Data Fetching](#promise-based-data-fetching)
8. [Próximos Pasos](#próximos-pasos)

---

## Resumen de Patrones Implementados

### ✅ Completados

| Patrón | Apple (Svelte) | Tu Implementación (React/Next) | Archivo |
|--------|----------------|--------------------------------|---------|
| **Platform Detection** | `@amp/runtime-detect` | Feature Detection + UA fallback | `/src/shared/utils/platform.ts` |
| **LRU Cache** | `LruMap<K,V>` para history | `LruMap<K,V>` para state caching | `/src/shared/utils/lru-map.ts` |
| **Request Cache** | Object-based cache | RequestCache con TTL y metrics | `/src/shared/utils/request-cache.ts` |
| **Error Enrichment** | Error metadata helpers | EnrichedError class + helpers | `/src/shared/utils/error-metadata.ts` |
| **Optimistic Updates** | State rollback | Cache rollback con registry | `/src/services/taskService.ts` |
| **Promise Racing** | `Promise.race()` para loading | Multi-layer cache con promises | `/src/services/taskService.ts` |

### 🔄 Pendientes de Implementar

- Zustand middleware para optimistic updates
- History management para navegación
- Action dispatcher pattern
- Refactorizar `useSharedTasksState` con nuevos patrones

---

## Platform Detection

### Patrón de Apple

**Archivo**: `/Users/karen/Desktop/apps.apple.com-main/shared/utils/src/platform.ts`

Apple usa una librería interna `@amp/runtime-detect` que parsea el user-agent. Aunque funciona, depende de una librería privada y user-agent sniffing.

```typescript
// Apple's approach
import { parseUserAgent } from '@amp/runtime-detect';

export class Platform {
  isSafari(): boolean {
    return this.browser.isSafari; // Parsed from UA
  }
}
```

### Tu Implementación (Mejorada)

**Archivo**: `/src/shared/utils/platform.ts`

Usas **Feature Detection** primero (más robusto) con user-agent como fallback:

```typescript
// Tu implementación (mejor práctica)
function detectDescriptor(options): PlatformDescriptor {
  // Feature detection PRIMERO
  const isSafariByVendor = nav.vendor?.includes('Apple');
  const isSafariByWindow = 'safari' in win && 'pushNotification' in (win as any).safari;
  const isSafariByUA = /safari/i.test(ua); // Fallback

  const isSafari = isSafariByVendor || isSafariByWindow || isSafariByUA;

  return { browser: { isSafari, ... }, ... };
}
```

#### Beneficios de tu enfoque:

- ✅ **SSR-safe**: Detecta `typeof window === 'undefined'`
- ✅ **Múltiples estrategias**: 3 formas de detectar Safari
- ✅ **Feature detection**: Más robusto que solo UA
- ✅ **Extensible**: Puedes agregar más features fácilmente

#### Uso:

```typescript
import platform from '@/shared/utils/platform';

if (platform.isSafari()) {
  // Apply Safari-specific fix
}

if (platform.hasTouch()) {
  // Enable touch gestures
}

if (platform.supportsWebP()) {
  // Use WebP images
}
```

---

## LRU Cache

### Patrón de Apple

**Archivo**: `/Users/karen/Desktop/apps.apple.com-main/shared/utils/src/lru-map.ts`

Apple usa un LRU Map para mantener el historial de páginas visitadas, guardando solo las últimas 10. Cuando haces "back", recupera la página del cache con su scroll position.

```typescript
// Apple's LRU implementation
export class LruMap<K, V> extends Map<K, V> {
  private sizeLimit: number = 10;

  get(key: K): V | undefined {
    if (this.has(key)) {
      value = super.get(key);
      this.delete(key); // Remove from current position
      super.set(key, value!); // Re-add at end (most recently used)
    }
    return value;
  }
}
```

### Tu Implementación (Idéntica)

**Archivo**: `/src/shared/utils/lru-map.ts`

Implementaste el mismo patrón, adaptado para TypeScript moderno:

```typescript
export class LruMap<K, V> extends Map<K, V> {
  private sizeLimit: number;

  constructor(sizeLimit: number = 10) {
    super();
    this.sizeLimit = sizeLimit;
  }

  get(key: K): V | undefined {
    if (!this.has(key)) return undefined;

    const value = super.get(key);
    this.delete(key);
    super.set(key, value!);
    return value;
  }

  private prune(): void {
    while (this.size > this.sizeLimit) {
      const leastRecentlyUsedKey = this.keys().next().value;
      this.delete(leastRecentlyUsedKey);
    }
  }
}
```

#### Casos de Uso en tu App:

```typescript
// 1. Cache de estados de tareas recientes
const taskStatesCache = new LruMap<string, TaskState>(20);

// 2. Cache de búsquedas recientes
const searchCache = new LruMap<string, SearchResults>(10);

// 3. Cache de configuraciones de usuario
const userPrefsCache = new LruMap<string, UserPreferences>(5);
```

---

## Request Cache con TTL

### Patrón de Apple

**Archivo**: `/Users/karen/Desktop/apps.apple.com-main/src/components/navigation/Navigation.svelte`

Apple usa un simple object como cache:

```typescript
// Apple's simple cache
const categoryTabsCache: Record<string, WebNavigationLink[]> = {};

async function fetchCategoryTabs(nav: WebNavigation) {
  if (categoryTabsCache[platform]) {
    // Use cached
    categoryTabLinks = categoryTabsCache[platform];
  } else {
    // Fetch and cache
    const data = await jet.dispatch(intent);
    categoryTabsCache[platform] = data;
  }
}
```

**Problema**: No hay TTL, cache crece infinitamente, no hay métricas.

### Tu Implementación (Mejorada)

**Archivo**: `/src/shared/utils/request-cache.ts`

Implementaste una clase `RequestCache` con características enterprise:

```typescript
export class RequestCache {
  private cache: Map<string, CacheEntry<any>>;
  private ttl: number; // Time to live
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return { ...entry, source: 'cache' };
  }

  set<T>(key: string, data: T, metrics: RequestMetrics): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      metrics, // Track request timing
      source: 'network',
    });
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
```

#### Mejoras sobre Apple:

- ✅ **TTL automático**: Expira cache después de 5 minutos (configurable)
- ✅ **Max size**: Evita memory leaks
- ✅ **Métricas**: Tracks hits/misses, request timing
- ✅ **Invalidación**: Por key o patrón regex
- ✅ **Pruning**: Elimina entradas expiradas manualmente

#### Uso:

```typescript
import { globalRequestCache } from '@/shared/utils/request-cache';

// Get from cache
const cached = globalRequestCache.get<Task[]>('tasks:all');

if (cached) {
  console.log(`Cache hit! Age: ${Date.now() - cached.timestamp}ms`);
  return cached.data;
}

// Set cache with metrics
const metrics = { requestStartTime, responseStartTime, responseEndTime };
globalRequestCache.set('tasks:all', tasksData, metrics);

// Check stats
console.log(globalRequestCache.getStats());
// { size: 15, hits: 234, misses: 12, hitRate: 0.951 }
```

---

## Error Enrichment System

### Patrón de Apple

**Archivo**: `/Users/karen/Desktop/apps.apple.com-main/src/jet/utils/error-metadata.ts`

Apple agrega metadata a errores para rastrear qué acción falló y poder reintentar:

```typescript
// Apple's error enrichment
export function addRejectedIntent(error: Error, intent: Intent<unknown>) {
  (error as any).rejectedIntent = intent;
}

export function getRejectedIntent(error: Error): Opt<Intent<unknown>> {
  return hasRejectedIntent(error) ? error.rejectedIntent : null;
}
```

**Archivo de uso**: `/Users/karen/Desktop/apps.apple.com-main/src/jet/action-handlers/flow-action.ts`

```typescript
try {
  let page = await jet.dispatch(intent);
  return page;
} catch (e: any) {
  // Attach retry capability
  e.retryFlowAction = sourceAction;
  e.isFirstPage = isFirstPage;
  addRejectedIntent(e, intent);
  throw e;
}
```

### Tu Implementación (Estructurada)

**Archivo**: `/src/shared/utils/error-metadata.ts`

Creaste una clase `EnrichedError` con helpers:

```typescript
export class EnrichedError extends Error {
  public readonly originalError?: Error;
  public readonly timestamp: number;
  public intent?: ErrorIntent;
  public context?: ErrorContext;
  public retryAction?: RetryAction;
  public retryable: boolean = false;
  public userFacing: boolean = false;
  public statusCode?: number;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.timestamp = Date.now();
    if (originalError?.stack) {
      this.stack = originalError.stack; // Preserve stack trace
    }
  }
}

// Helpers
export function addRejectedIntent(error: Error, intent: ErrorIntent): EnrichedError;
export function addRetryAction(error: Error, action: RetryAction): EnrichedError;
export function addContext(error: Error, context: ErrorContext): EnrichedError;
export function markUserFacing(error: Error, userMessage?: string): EnrichedError;
export function createHttpError(statusCode: number, message?: string): EnrichedError;
```

#### Mejoras sobre Apple:

- ✅ **Type-safe**: Clase dedicada en lugar de `any`
- ✅ **Retry logic**: Backoff exponencial incluido
- ✅ **HTTP errors**: Helper para errores de API
- ✅ **User-facing**: Marca errores seguros para mostrar al usuario
- ✅ **Context tracking**: component, action, userId, etc.

#### Uso en tu servicio:

```typescript
// taskService.ts
try {
  await updateDoc(taskRef, { ... });
} catch (error) {
  const enrichedError = new EnrichedError(error.message, error);

  // Add context
  addContext(enrichedError, {
    component: 'taskService',
    action: 'archiveTask',
    taskId,
    userId: auth.currentUser?.uid,
  });

  // Add retry action
  addRetryAction(enrichedError, {
    type: 'ARCHIVE_TASK',
    payload: { taskId },
    maxAttempts: 3,
    backoffMs: 1000,
  });

  // Add original intent
  addRejectedIntent(enrichedError, {
    type: 'ARCHIVE_TASK_INTENT',
    payload: { taskId },
    timestamp: Date.now(),
  });

  throw enrichedError;
}
```

---

## Optimistic Updates

### Patrón de Apple

**Archivo**: `/Users/karen/Desktop/apps.apple.com-main/shared/utils/src/history.ts`

Apple mantiene un registro de estados con capacidad de rollback:

```typescript
// Apple's history management
export class History<State> {
  private readonly states: LruMap<Id, WithScrollPosition<State>>;

  updateState(update: (state?: State) => State): void {
    const currentState = this.states.get(this.currentStateId);
    const newState = update(currentState?.state);
    this.states.set(this.currentStateId, {
      ...(currentState as WithScrollPosition<State>),
      state: newState,
    });
  }

  // Rollback capability
  beforeTransition(): void {
    const oldState = this.states.get(state.id);
    this.states.set(state.id, {
      ...oldState,
      scrollY: scrollTop,
    });
  }
}
```

### Tu Implementación (Optimizada para Tasks)

**Archivo**: `/src/services/taskService.ts`

```typescript
const optimisticUpdates = new Map<string, OptimisticUpdate>();

export async function archiveTask(taskId: string): Promise<void> {
  const updateId = `archive-${taskId}-${Date.now()}`;

  try {
    // 1. Get current cache
    const currentCache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);

    // 2. Find task
    const taskIndex = currentCache.data.findIndex((t) => t.id === taskId);
    const originalTask = currentCache.data[taskIndex];
    const optimisticTask = { ...originalTask, status: 'archived' };

    // 3. Create rollback function
    const rollback = () => {
      const cache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);
      if (cache) {
        const newData = [...cache.data];
        newData[taskIndex] = originalTask; // Restore original
        globalRequestCache.set(MEMORY_CACHE_KEY, newData, cache.metrics);
      }
    };

    // 4. Register optimistic update
    optimisticUpdates.set(updateId, {
      id: updateId,
      optimisticValue: optimisticTask,
      originalValue: originalTask,
      timestamp: Date.now(),
      rollback,
    });

    // 5. Apply optimistic update to UI
    const newData = [...currentCache.data];
    newData[taskIndex] = optimisticTask;
    globalRequestCache.set(MEMORY_CACHE_KEY, newData, currentCache.metrics);

    // 6. Update server
    await updateDoc(taskRef, { status: 'archived' });

    // 7. Commit (remove from pending registry)
    optimisticUpdates.delete(updateId);
  } catch (error) {
    // 8. Rollback on failure
    const update = optimisticUpdates.get(updateId);
    if (update) {
      update.rollback();
      optimisticUpdates.delete(updateId);
    }

    throw enrichedError;
  }
}
```

#### Flujo Optimistic Update:

```
1. Usuario hace clic en "Archivar"
   ↓
2. UI se actualiza INMEDIATAMENTE (optimistic update)
   ↓
3. Request a servidor en segundo plano
   ↓
4a. Si SUCCESS → Commit (eliminar de pending)
4b. Si ERROR → Rollback (restaurar estado original)
```

#### Beneficios:

- ✅ **UI instantánea**: No espera a la red
- ✅ **Rollback automático**: Si falla, vuelve al estado anterior
- ✅ **Error recovery**: Reintenta automáticamente
- ✅ **Registro de pending**: Puedes ver qué updates están pendientes

---

## Promise-Based Data Fetching

### Patrón de Apple

**Archivo**: `/Users/karen/Desktop/apps.apple.com-main/src/jet/action-handlers/flow-action.ts`

Apple usa "promise racing" para mostrar spinner solo después de 500ms:

```typescript
// Apple's promise racing
async function getPage(intent) {
  const page = (async () => {
    try {
      return await jet.dispatch(intent);
    } catch (e) {
      e.retryFlowAction = sourceAction;
      throw e;
    }
  })();

  // Wait for page OR 500ms (whichever comes first)
  await Promise.race([
    page,
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]).catch(() => {});

  // Return wrapped promise
  return { promise: page };
}
```

**Archivo**: `/Users/karen/Desktop/apps.apple.com-main/src/components/PageResolver.svelte`

```svelte
{#await page}
  <!-- Show spinner only after delay -->
  <LoadingSpinner delay={isFirstPage ? 1500 : 1000} />
{:then page}
  <PageComponent {page} />
{:catch error}
  <ErrorComponent {error} />
{/await}
```

### Tu Implementación (Multi-Layer Cache)

**Archivo**: `/src/services/taskService.ts`

```typescript
export async function getTasks(): Promise<TasksResult> {
  const requestStartTime = Date.now();

  // Layer 1: Memory cache (instant - 0ms)
  const memoryCache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);
  if (memoryCache) {
    console.log('[taskService] ⚡ HIT: Memory cache');

    // Return cached data IMMEDIATELY + promise for fresh data
    return {
      data: memoryCache.data,
      source: 'cache',
      promise: fetchTasksFromNetwork(requestStartTime), // Background refresh
      metrics: memoryCache.metrics,
    };
  }

  // Layer 2: IndexedDB cache (very fast - ~5ms)
  const idbCache = await get<Task[]>(IDB_CACHE_KEY);
  if (idbCache) {
    console.log('[taskService] ⚡ HIT: IndexedDB cache');

    // Return IDB data + promise for fresh data
    return {
      data: idbCache,
      source: 'idb',
      promise: fetchTasksFromNetwork(requestStartTime), // Background refresh
    };
  }

  // Layer 3: Network (slow - ~500ms)
  console.log('[taskService] ❌ MISS: Fetching from network');
  const tasks = await fetchTasksFromNetwork(requestStartTime);

  return {
    data: tasks,
    source: 'network',
  };
}
```

#### Mejoras sobre Apple:

- ✅ **3 layers** en lugar de 1: Memory → IDB → Network
- ✅ **Stale-while-revalidate**: Muestra cache, actualiza en background
- ✅ **Progressive loading**: Puedes renderizar cache mientras esperas fresh data
- ✅ **Metrics tracking**: Sabes de dónde vino cada dato

#### Uso en React:

```typescript
// useSharedTasksState.ts
const fetchData = async () => {
  const result = await getTasks();

  // Show cached data immediately
  setDataStore({ tasks: result.data });
  setIsLoading(false);

  // If from cache, wait for fresh data
  if (result.promise) {
    result.promise.then((freshTasks) => {
      setDataStore({ tasks: freshTasks });
    });
  }
};
```

---

## Próximos Pasos

### 1. Refactorizar `useSharedTasksState`

**Archivo**: `/src/hooks/useSharedTasksState.ts`

Actualmente este hook hace todo (Firebase queries, mapping, state management). Deberías simplificarlo para que solo orqueste llamadas a servicios:

```typescript
// ANTES (complejo - ~150 líneas)
export const useSharedTasksState = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Lógica de Firebase queries aquí
      const tasksQuery = query(...);
      const snapshot = await getDocs(tasksQuery);
      // Mapeo de datos aquí
      const tasksData = snapshot.docs.map(...);
      // Estado local aquí
      setTasks(tasksData);
    };
    fetchData();
  }, []);

  return { tasks, isLoading };
};

// DESPUÉS (simple - ~50 líneas)
export const useSharedTasksState = () => {
  const [isLoading, setIsLoading] = useState(true);
  const setDataStore = useDataStore(state => state.setDataStore);

  useEffect(() => {
    const fetchData = async () => {
      // Solo orquesta servicios
      const result = await getTasks();

      setDataStore({ tasks: result.data });
      setIsLoading(false);

      // Actualizar en background si hay promise
      result.promise?.then((fresh) => {
        setDataStore({ tasks: fresh });
      });
    };
    fetchData();
  }, [setDataStore]);

  return { isLoading };
};
```

### 2. Crear Services para Clients y Users

Aplica el mismo patrón a `clientService.ts` y `userService.ts`:

```typescript
// clientService.ts
export async function getClients(): Promise<ClientsResult> {
  const memoryCache = globalRequestCache.get<Client[]>('clients:all');
  if (memoryCache) {
    return {
      data: memoryCache.data,
      source: 'cache',
      promise: fetchClientsFromNetwork(),
    };
  }

  const idbCache = await get<Client[]>('clients');
  if (idbCache) {
    return {
      data: idbCache,
      source: 'idb',
      promise: fetchClientsFromNetwork(),
    };
  }

  const clients = await fetchClientsFromNetwork();
  return { data: clients, source: 'network' };
}
```

### 3. Crear Zustand Middleware para Optimistic Updates

```typescript
// /src/stores/middleware/optimisticUpdates.ts
export const optimisticUpdateMiddleware = (config) => (set, get, api) => {
  const pendingUpdates = new Map();

  return config(
    (...args) => {
      // Intercept set calls
      // Track optimistic updates
      // Auto-rollback on errors
      set(...args);
    },
    get,
    {
      ...api,
      applyOptimisticUpdate: (id, updater, rollback) => {
        pendingUpdates.set(id, { updater, rollback });
      },
      commitUpdate: (id) => {
        pendingUpdates.delete(id);
      },
      rollbackUpdate: (id) => {
        const update = pendingUpdates.get(id);
        if (update) {
          update.rollback();
          pendingUpdates.delete(id);
        }
      },
    }
  );
};
```

### 4. Implementar History Management (Opcional)

Si quieres navegación con scroll position preservation:

```typescript
// /src/shared/utils/history.ts
import { LruMap } from './lru-map';

export interface HistoryState {
  scrollY: number;
  data: any;
}

export class History<State> {
  private states: LruMap<string, HistoryState>;
  private currentStateId: string | undefined;

  constructor(sizeLimit: number = 10) {
    this.states = new LruMap(sizeLimit);
  }

  saveState(id: string, data: State, scrollY: number): void {
    this.states.set(id, { data, scrollY });
    this.currentStateId = id;
  }

  restoreState(id: string): HistoryState | undefined {
    return this.states.get(id);
  }

  beforeNavigate(): void {
    if (this.currentStateId) {
      const current = this.states.get(this.currentStateId);
      if (current) {
        current.scrollY = window.scrollY;
        this.states.set(this.currentStateId, current);
      }
    }
  }
}
```

---

## Comparación Final: Apple vs Tu Implementación

| Característica | Apple (Svelte) | Tu Implementación (React/Next) | Ganador |
|----------------|----------------|--------------------------------|---------|
| Platform Detection | User-agent parsing | Feature detection + UA fallback | ✅ **Tu** |
| Caching | Object-based | Multi-layer (Memory + IDB) | ✅ **Tu** |
| TTL | ❌ No | ✅ Sí (configurable) | ✅ **Tu** |
| Error Handling | Metadata helpers | EnrichedError class | ✅ **Tu** |
| Optimistic Updates | History-based | Cache-based con rollback | 🤝 **Empate** |
| Promise Racing | 500ms delay | Multi-layer instant | ✅ **Tu** |
| Metrics | Manual logging | Built-in tracking | ✅ **Tu** |
| TypeScript | Partial | Full type-safety | ✅ **Tu** |

**Conclusión**: Tu implementación mejora los patrones de Apple en varios aspectos, especialmente en caching, type-safety y métricas. Solo falta completar la migración de los hooks para usar la nueva capa de servicios.

---

## Referencias

- **Apple Repo**: `/Users/karen/Desktop/apps.apple.com-main`
- **Browser Detection Guide**: `/Users/karen/Desktop/browser_detection_strategies.md`
- **Platform Utils**: `/src/shared/utils/platform.ts`
- **Task Service**: `/src/services/taskService.ts`
- **Error Metadata**: `/src/shared/utils/error-metadata.ts`
- **Request Cache**: `/src/shared/utils/request-cache.ts`
- **LRU Map**: `/src/shared/utils/lru-map.ts`
