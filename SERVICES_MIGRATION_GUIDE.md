# Guía de Migración - Capa de Servicios

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Paso 1: Verificar Tipos](#paso-1-verificar-tipos)
3. [Paso 2: Migrar Lógica a Servicios](#paso-2-migrar-lógica-a-servicios)
4. [Paso 3: Refactorizar useSharedTasksState](#paso-3-refactorizar-usesharedtasksstate)
5. [Paso 4: Actualizar Stores](#paso-4-actualizar-stores)
6. [Paso 5: Probar la Migración](#paso-5-probar-la-migración)
7. [Mejoras Opcionales Futuras](#mejoras-opcionales-futuras)

---

## Arquitectura General

### Flujo de Datos ANTES (Estado Actual)
```
┌─────────────────────────────────────────────────┐
│ useSharedTasksState Hook                        │
│ ├─ Lógica de Firebase (queries)                 │
│ ├─ Mapeo de datos                               │
│ ├─ Estado de carga                              │
│ └─ Sincronización con stores                    │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│ Zustand Stores (useDataStore)                   │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│ Componentes (TasksTable, etc.)                  │
└─────────────────────────────────────────────────┘
```

### Flujo de Datos DESPUÉS (Nueva Arquitectura)
```
┌─────────────────────────────────────────────────┐
│ useSharedTasksState Hook (SIMPLIFICADO)         │
│ └─ Solo orquesta llamadas a servicios           │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│ Services Layer (taskService, clientService...)  │
│ ├─ Lógica de Firebase                           │
│ ├─ Cacheo con IndexedDB (idb-keyval)            │
│ ├─ Mapeo de datos                               │
│ └─ Estrategia stale-while-revalidate            │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│ Zustand Stores (useDataStore)                   │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│ Componentes (TasksTable, etc.)                  │
└─────────────────────────────────────────────────┘
```

---

## Paso 1: Verificar Tipos

### 1.1 Verificar que existan los tipos en `/src/types`

Los servicios necesitan importar:
- `Task`
- `Client`
- `User`

**Acción:** Abre `/src/types/index.ts` (o donde tengas tus tipos) y verifica que estos tipos existan y estén exportados.

Si no existen, créalos basándote en la estructura de datos que recibes de Firebase.

### 1.2 Ejemplo de tipos mínimos necesarios

```typescript
// src/types/index.ts

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
  assignedTo?: string[];
  clientId?: string;
  // ... otros campos que uses
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  // ... otros campos que uses
}

export interface User {
  id: string;
  fullName: string;
  imageUrl?: string;
  role: string;
  description?: string;
  status?: string;
  // ... otros campos que uses
}
```

---

## Paso 2: Migrar Lógica a Servicios

### 2.1 Migrar taskService.ts

**Desde:** `src/hooks/useSharedTasksState.ts` (líneas 50-70 aprox.)
**Hacia:** `src/services/taskService.ts`

#### En tu hook actual tienes algo como:
```typescript
const tasksQuery = query(
  collection(db, 'tasks'),
  limit(100),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(tasksQuery);
const tasksData = snapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
}));
```

#### Lo que debes hacer:
1. **Copia** la lógica del query de Firebase
2. **Pega** en `fetchTasksFromNetwork()` en `taskService.ts`
3. **Ajusta** el mapeo de datos si es necesario (por ejemplo, convertir timestamps)

#### Ejemplo de mapeo con conversión de fechas:
```typescript
const tasksData: Task[] = snapshot.docs.map((doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || null,
  } as Task;
});
```

### 2.2 Migrar clientService.ts

**Similar al anterior, pero para clients.**

Busca en `useSharedTasksState.ts` donde haces la query de clients y migra esa lógica a `getClients()` en `clientService.ts`.

### 2.3 Migrar userService.ts

Este es especial porque hace **dos cosas**:
1. Llama a `/api/users` (Clerk)
2. Enriquece con datos de Firestore

**La lógica ya está en la plantilla que creé.** Solo necesitas:
- Revisar que el mapeo de datos coincida con tu estructura actual
- Ajustar los campos según tu base de datos

---

## Paso 3: Refactorizar useSharedTasksState

### 3.1 Estado Actual (Complejo)

Tu hook actual hace mucho:
```typescript
// useSharedTasksState.ts (ANTES)
export const useSharedTasksState = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Query de Firebase para tasks
      const tasksQuery = query(collection(db, 'tasks'), ...);
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(...);

      // Query de Firebase para clients
      const clientsQuery = query(collection(db, 'clients'), ...);
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData = clientsSnapshot.docs.map(...);

      // Fetch de users (API + Firestore)
      const response = await fetch('/api/users');
      const clerkUsers = await response.json();
      // ... lógica compleja de enriquecimiento

      setTasks(tasksData);
      setClients(clientsData);
      setUsers(usersData);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return { tasks, clients, users, isLoading };
};
```

### 3.2 Nuevo Estado (SIMPLIFICADO con Servicios)

```typescript
// useSharedTasksState.ts (DESPUÉS)
import { getTasks, getClients, getUsers } from '@/services';
import { useDataStore } from '@/stores/useDataStore';
import { useEffect, useState } from 'react';

export const useSharedTasksState = () => {
  const [isLoading, setIsLoading] = useState(true);
  const setDataStore = useDataStore(state => state.setDataStore);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Intentar obtener datos del cache (instantáneo)
        const tasksResult = await getTasks();
        const clients = await getClients();
        const users = await getUsers();

        // 2. Actualizar store con los datos (cache o red)
        setDataStore({
          tasks: tasksResult.data,
          clients,
          users,
        });

        // 3. Si venían del cache, obtener datos frescos en segundo plano
        if (tasksResult.source === 'cache') {
          console.log('[useSharedTasksState] Loaded from cache, fetching fresh data...');

          // Fetch en segundo plano
          fetchTasksFromNetwork().then(freshResult => {
            setDataStore({
              tasks: freshResult.data,
              clients,
              users,
            });
          });
        }

      } catch (error) {
        console.error('[useSharedTasksState] Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [setDataStore]);

  return { isLoading };
};
```

### 3.3 Beneficios de la Refactorización

✅ **Separación de responsabilidades**: El hook no sabe nada de Firebase
✅ **Cacheo automático**: Los servicios manejan el cache transparentemente
✅ **Código más limpio**: De ~150 líneas a ~40 líneas
✅ **Reutilizable**: Otros hooks pueden usar los mismos servicios
✅ **Testeable**: Puedes mockear los servicios fácilmente

---

## Paso 4: Actualizar Stores

### 4.1 Verificar que useDataStore acepte estos datos

Tu store actual (probablemente en `/src/stores/useDataStore.ts`) debería tener algo como:

```typescript
interface DataStore {
  tasks: Task[];
  clients: Client[];
  users: User[];
  setDataStore: (data: Partial<DataStore>) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  tasks: [],
  clients: [],
  users: [],
  setDataStore: (data) => set(data),
}));
```

**No necesitas cambiar nada si ya tienes esta estructura.**

### 4.2 Opcional: Agregar estado de sincronización

Si quieres mostrar al usuario cuando estás re-validando datos en segundo plano:

```typescript
interface DataStore {
  tasks: Task[];
  clients: Client[];
  users: User[];
  isRevalidating: boolean; // NUEVO
  setDataStore: (data: Partial<DataStore>) => void;
}
```

Y en el hook:
```typescript
setDataStore({ isRevalidating: true });
// ... fetch fresh data ...
setDataStore({ tasks: freshData, isRevalidating: false });
```

---

## Paso 5: Probar la Migración

### 5.1 Checklist de Pruebas

- [ ] **Primera carga**: Los datos se cargan correctamente desde Firebase
- [ ] **Cache funciona**: Al recargar la página, los datos aparecen instantáneamente
- [ ] **Revalidación funciona**: Después de mostrar el cache, se obtienen datos frescos
- [ ] **Sin errores en consola**: No hay errores de tipos o imports
- [ ] **Skeleton loader**: Se oculta después de la carga inicial

### 5.2 Cómo Probar el Cache

1. **Primera carga**: Abre la app en incógnito, verás el loader normal
2. **Segunda carga**: Recarga la página (F5), deberías ver los datos INSTANTÁNEAMENTE
3. **Verifica la consola**: Deberías ver logs como:
   ```
   [taskService] Fetching fresh tasks from Firebase...
   [useSharedTasksState] Loaded from cache, fetching fresh data...
   ```

### 5.3 Debugging del Cache

Para ver qué hay en el cache de IndexedDB:

1. Abre DevTools → Application tab
2. Ve a IndexedDB → `keyval-store` → `keyval`
3. Busca la key `tasks`
4. Deberías ver el array de tareas cacheadas

---

## Mejoras Opcionales Futuras

### 6.1 Agregar Cache a Clients y Users

Actualmente solo `taskService.ts` tiene cache. Puedes aplicar el mismo patrón a:
- `clientService.ts` (cache key: `'clients'`)
- `userService.ts` (cache key: `'users'`)

### 6.2 Implementar Listeners en Tiempo Real

Para una experiencia colaborativa, puedes reemplazar `getDocs` con `onSnapshot` en tus servicios:

```typescript
// Ejemplo para taskService.ts
export function subscribeToTasks(callback: (tasks: Task[]) => void) {
  const tasksQuery = query(collection(db, 'tasks'), limit(100));

  return onSnapshot(tasksQuery, (snapshot) => {
    const tasksData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Task));

    callback(tasksData);
    set(CACHE_KEY, tasksData); // Actualizar cache también
  });
}
```

### 6.3 Agregar Expiración de Cache

Puedes agregar un timestamp al cache para invalidarlo después de cierto tiempo:

```typescript
interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getTasks() {
  const cached = await get<CachedData<Task[]>>(CACHE_KEY);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { data: cached.data, source: 'cache' };
  }

  return fetchTasksFromNetwork();
}
```

### 6.4 Agregar Actualización Optimista

Para operaciones como archivar/desarchivar, puedes actualizar la UI inmediatamente:

```typescript
// En taskService.ts
export async function archiveTask(taskId: string) {
  // 1. Obtener cache actual
  const cached = await get<Task[]>(CACHE_KEY);

  // 2. Actualizar optimísticamente
  const optimisticData = cached.map(task =>
    task.id === taskId ? { ...task, archived: true } : task
  );
  await set(CACHE_KEY, optimisticData);

  // 3. Actualizar en el servidor
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, { archived: true, archivedAt: new Date() });
  } catch (error) {
    // 4. Rollback si falla
    await set(CACHE_KEY, cached);
    throw error;
  }
}
```

---

## 📚 Resumen

### Lo que hiciste:
✅ Creaste una capa de servicios separada
✅ Implementaste cacheo persistente con IndexedDB
✅ Simplificaste el hook `useSharedTasksState`
✅ Separaste las responsabilidades (UI vs Datos)

### Beneficios inmediatos:
🚀 **Carga instantánea** en visitas posteriores
🔌 **Soporte offline** básico
🧹 **Código más limpio** y mantenible
🧪 **Más fácil de testear**
📦 **Reutilizable** en otros hooks/componentes

### Próximos pasos recomendados:
1. Migrar la lógica de los queries a los servicios (siguiendo esta guía)
2. Refactorizar `useSharedTasksState` usando la plantilla de arriba
3. Probar en desarrollo
4. Opcional: Agregar cache a clients y users
5. Opcional: Implementar listeners en tiempo real

---

¿Tienes alguna pregunta sobre algún paso específico? ¡Estoy aquí para ayudarte!
