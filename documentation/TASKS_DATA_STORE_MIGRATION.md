# Guía de Migración a tasksDataStore y clientsDataStore

## 📋 Índice

1. [Introducción](#introducción)
2. [Estrategia de Migración](#estrategia-de-migración)
3. [Identificar Código a Migrar](#identificar-código-a-migrar)
4. [Patrones de Migración - Tasks](#patrones-de-migración---tasks)
5. [Patrones de Migración - Clients](#patrones-de-migración---clients)
6. [Ejemplos Reales](#ejemplos-reales)
7. [Plan de Migración Módulo por Módulo](#plan-de-migración-módulo-por-módulo)
8. [Testing y Validación](#testing-y-validación)
9. [Checklist de Migración](#checklist-de-migración)

---

## Introducción

Esta guía te ayudará a migrar tu código para usar los nuevos stores optimizados:
- **tasksDataStore**: Para tasks individuales con realtime
- **clientsDataStore**: Para acceso O(1) a clients

### Objetivos de la Migración

**Tasks:**
- ✅ Reducir reads a Firestore (60-80%)
- ✅ Obtener actualizaciones en tiempo real
- ✅ Eliminar queries duplicadas
- ✅ Cache compartido entre componentes

**Clients:**
- ✅ Acceso O(1) en lugar de array.find()
- ✅ Mejora de performance 98%
- ✅ Código más limpio

### Alcance

**✅ Migrar Tasks:**
- TaskDialog (datos individuales)
- ChatMessage (mostrar nombre de tarea)
- Cualquier componente que use `getDoc(doc(db, 'tasks', taskId))`

**❌ NO migrar Tasks:**
- TasksTable (usa `dataStore` con colecciones)
- KanbanBoard (usa `dataStore` con colecciones)
- ArchiveTable (usa `dataStore` con colecciones)

**✅ Migrar Clients:**
- Cualquier componente que use `clients.find(c => c.id === clientId)`
- Filtros/dropdowns de clientes
- TaskCard mostrando client name

---

## Estrategia de Migración

### Enfoque Incremental

```
Fase 1: Módulos de Alta Prioridad (más impacto)
  ↓
Fase 2: Módulos de Media Prioridad
  ↓
Fase 3: Limpieza y Optimización
```

### Principios

1. **Coexistencia**: `dataStore` y `tasksDataStore` coexisten
2. **No Breaking Changes**: Mantén el código anterior funcionando
3. **Testing Continuo**: Prueba cada módulo migrado
4. **Rollback Fácil**: Usa feature flags si es necesario

---

## Identificar Código a Migrar

### Buscar Patrones - Tasks

```bash
# 1. Buscar queries directas a tasks individuales
grep -r "getDoc.*tasks" src/

# 2. Buscar useEffect que fetchean tasks
grep -r "useEffect.*taskId" src/

# 3. Buscar listeners manuales
grep -r "onSnapshot.*tasks" src/
```

### Buscar Patrones - Clients

```bash
# 1. Buscar array.find() con clients
grep -r "clients.find" src/

# 2. Buscar acceso a client name
grep -r "client?.name" src/
```

### Código a Migrar - Tasks

#### ✅ SÍ migrar:

```typescript
// Query directa individual
const snap = await getDoc(doc(db, 'tasks', taskId));

// Listener manual individual
onSnapshot(doc(db, 'tasks', taskId), (snap) => { ... });

// useEffect con fetch
useEffect(() => {
  const fetchTask = async () => {
    const snap = await getDoc(doc(db, 'tasks', taskId));
    setTask(snap.data());
  };
  fetchTask();
}, [taskId]);
```

#### ❌ NO migrar:

```typescript
// Queries de colecciones (usa dataStore)
const tasksQuery = query(collection(db, 'tasks'), where(...));
const snapshot = await getDocs(tasksQuery);
```

### Código a Migrar - Clients

#### ✅ SÍ migrar:

```typescript
// array.find() - O(n)
const clients = useDataStore((state) => state.clients);
const client = clients.find((c) => c.id === clientId);
const clientName = client?.name || 'Desconocido';
```

#### ✅ Resultado:

```typescript
// Map.get() - O(1)
const clientName = useClientName(clientId);
```

---

## Patrones de Migración - Tasks

### Patrón 1: useEffect con getDoc → Hook optimizado

#### ANTES:

```typescript
function TaskDialog({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'tasks', taskId));
        if (snap.exists()) {
          setTask(snap.data() as Task);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <TaskForm task={task} />;
}
```

#### DESPUÉS:

```typescript
import { useTaskState } from '@/hooks/useTaskData';

function TaskDialog({ taskId }: { taskId: string }) {
  const { taskData, isLoading, error } = useTaskState(taskId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <TaskForm task={taskData} />;
}
```

**Beneficios:**
- 25 líneas → 8 líneas
- Sin useEffect manual
- Sin useState manual
- Auto-suscripción a Firestore
- Cache compartido con otros componentes

---

### Patrón 2: onSnapshot manual → Hook con realtime

#### ANTES:

```typescript
function TaskStatus({ taskId }: { taskId: string }) {
  const [status, setStatus] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'tasks', taskId),
      (snap) => {
        if (snap.exists()) {
          setStatus(snap.data().status || 'Por Iniciar');
        }
      }
    );

    return () => unsubscribe();
  }, [taskId]);

  return <Badge status={status} />;
}
```

#### DESPUÉS:

```typescript
import { useTaskStatus } from '@/hooks/useTaskData';

function TaskStatus({ taskId }: { taskId: string }) {
  const status = useTaskStatus(taskId);
  return <Badge status={status} />;
}
```

**Beneficios:**
- Listener compartido entre componentes
- Auto-cleanup
- Solo re-renderiza si el status cambia

---

### Patrón 3: Solo nombre en ChatMessage

#### ANTES:

```typescript
function ChatMessage({ message }: { message: Message }) {
  const [taskName, setTaskName] = useState('');

  useEffect(() => {
    if (!message.taskId) return;

    const fetchTask = async () => {
      const snap = await getDoc(doc(db, 'tasks', message.taskId));
      setTaskName(snap.data()?.name || 'Tarea');
    };
    fetchTask();
  }, [message.taskId]);

  return (
    <div>
      <p>{message.text}</p>
      {message.taskId && <span>Tarea: {taskName}</span>}
    </div>
  );
}
```

#### DESPUÉS:

```typescript
import { useTaskName } from '@/hooks/useTaskData';

function ChatMessage({ message }: { message: Message }) {
  const taskName = useTaskName(message.taskId || '', {
    autoSubscribe: Boolean(message.taskId),
  });

  return (
    <div>
      <p>{message.text}</p>
      {message.taskId && <span>Tarea: {taskName}</span>}
    </div>
  );
}
```

**Beneficios:**
- Código más simple
- Cache compartido si otros mensajes muestran la misma tarea
- Solo re-renderiza si el nombre cambia

---

### Patrón 4: Lista de mensajes con tasks

#### ANTES:

```typescript
function ChatMessages({ messages }: { messages: Message[] }) {
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());

  useEffect(() => {
    const taskIds = messages
      .map((m) => m.taskId)
      .filter((id): id is string => Boolean(id));

    const fetchTasks = async () => {
      const promises = taskIds.map((id) => getDoc(doc(db, 'tasks', id)));
      const snaps = await Promise.all(promises);

      const newTasks = new Map<string, Task>();
      snaps.forEach((snap) => {
        if (snap.exists()) {
          newTasks.set(snap.id, snap.data() as Task);
        }
      });
      setTasks(newTasks);
    };

    fetchTasks();
  }, [messages]);

  return (
    <div>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} taskName={tasks.get(message.taskId || '')?.name} />
      ))}
    </div>
  );
}
```

#### DESPUÉS:

```typescript
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

**Beneficios:**
- Una suscripción por task (no por mensaje)
- Si task123 aparece en 5 mensajes = 1 sola suscripción
- Actualizaciones en tiempo real

---

## Patrones de Migración - Clients

### Patrón 1: array.find() → useClientName()

#### ANTES:

```typescript
function TaskCard({ task }: { task: Task }) {
  const clients = useDataStore((state) => state.clients);
  const client = clients.find((c) => c.id === task.clientId);
  const clientName = client?.name || 'Desconocido';

  return (
    <div>
      <h3>{task.name}</h3>
      <span>Cliente: {clientName}</span>
    </div>
  );
}
```

#### DESPUÉS:

```typescript
import { useClientName } from '@/hooks/useClientData';

function TaskCard({ task }: { task: Task }) {
  const clientName = useClientName(task.clientId);

  return (
    <div>
      <h3>{task.name}</h3>
      <span>Cliente: {clientName}</span>
    </div>
  );
}
```

**Beneficios:**
- O(n) → O(1)
- Más limpio
- Solo re-renderiza si el client name cambia

---

### Patrón 2: Dropdown de clientes

#### ANTES:

```typescript
function ClientFilter() {
  const clients = useDataStore((state) => state.clients);

  return (
    <select>
      <option value="">Todos</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}
```

#### DESPUÉS:

```typescript
import { useAllClients } from '@/hooks/useClientData';

function ClientFilter() {
  const clients = useAllClients();

  return (
    <select>
      <option value="">Todos</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}
```

**Nota**: Este patrón es muy similar, pero `useAllClients()` es más explícito y puede optimizarse mejor.

---

## Ejemplos Reales

### Ejemplo 1: Migrar ChatMessage.tsx

**Ubicación**: `src/modules/chat/components/ChatMessage.tsx`

#### ANTES:

```typescript
function ChatMessage({ message }: { message: Message }) {
  const [taskData, setTaskData] = useState<Task | null>(null);

  useEffect(() => {
    if (!message.taskId) return;

    const fetchTask = async () => {
      const snap = await getDoc(doc(db, 'tasks', message.taskId));
      if (snap.exists()) {
        setTaskData(snap.data() as Task);
      }
    };

    fetchTask();
  }, [message.taskId]);

  return (
    <div>
      <p>{message.text}</p>
      {taskData && (
        <div className="task-reference">
          <span>{taskData.name}</span>
          <Badge status={taskData.status} />
        </div>
      )}
    </div>
  );
}
```

#### DESPUÉS:

```typescript
import { useTaskName, useTaskStatus } from '@/hooks/useTaskData';

function ChatMessage({ message }: { message: Message }) {
  const taskName = useTaskName(message.taskId || '', {
    autoSubscribe: Boolean(message.taskId),
  });
  const taskStatus = useTaskStatus(message.taskId || '', {
    autoSubscribe: false, // Ya suscrito por useTaskName
  });

  return (
    <div>
      <p>{message.text}</p>
      {message.taskId && (
        <div className="task-reference">
          <span>{taskName}</span>
          <Badge status={taskStatus} />
        </div>
      )}
    </div>
  );
}
```

---

### Ejemplo 2: Migrar TaskDialog.tsx

**Ubicación**: `src/modules/dialogs/components/variants/TaskDialog.tsx`

#### ANTES:

```typescript
function TaskDialog({ taskId, isOpen }: { taskId: string; isOpen: boolean }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !taskId) return;

    const fetchTask = async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, 'tasks', taskId));
      if (snap.exists()) {
        setTask(snap.data() as Task);
      }
      setLoading(false);
    };

    fetchTask();
  }, [taskId, isOpen]);

  return (
    <Dialog open={isOpen}>
      {loading ? <Skeleton /> : <TaskForm task={task} />}
    </Dialog>
  );
}
```

#### DESPUÉS:

```typescript
import { useTaskState } from '@/hooks/useTaskData';

function TaskDialog({ taskId, isOpen }: { taskId: string; isOpen: boolean }) {
  const { taskData, isLoading } = useTaskState(taskId, {
    autoSubscribe: isOpen, // Solo suscribe si está abierto
    unsubscribeOnUnmount: true, // Dialog temporal
  });

  return (
    <Dialog open={isOpen}>
      {isLoading ? <Skeleton /> : <TaskForm task={taskData} />}
    </Dialog>
  );
}
```

---

### Ejemplo 3: Migrar useTasksCommon.ts (getClientName)

**Ubicación**: `src/modules/data-views/tasks/hooks/useTasksCommon.ts`

#### ANTES (línea 192):

```typescript
const getClientName = useCallback((clientId: string): string => {
  const client = clients.find((c) => c.id === clientId);
  return client?.name || 'Cliente no encontrado';
}, [clients]);
```

#### DESPUÉS:

```typescript
// Eliminar esta función y usar el hook directamente en componentes
// O crear un wrapper:
const getClientName = useCallback((clientId: string): string => {
  return useClientsDataStore.getState().getClientName(clientId);
}, []);
```

**Nota**: Es mejor usar `useClientName()` directamente en componentes en lugar de pasar como prop.

---

## Plan de Migración Módulo por Módulo

### Fase 1: Alta Prioridad (Semana 1)

#### 1.1 Chat Module ⭐⭐⭐

**Archivos:**
- `src/modules/chat/components/ChatMessage.tsx`
- `src/modules/chat/components/ChatSidebar.tsx`

**Migración:**
- Usar `useTaskName()` en mensajes que referencian tasks
- Usar `useSubscribeToMultipleTasks()` en lista de mensajes

**Impacto estimado:**
- Reads reducidos: 70%
- Código eliminado: ~80 líneas

---

#### 1.2 Task Dialog Module ⭐⭐⭐

**Archivos:**
- `src/modules/dialogs/components/variants/TaskDialog.tsx`
- `src/modules/task-crud/components/forms/TaskDialog.tsx`

**Migración:**
- Usar `useTaskState()` para datos completos
- Usar `unsubscribeOnUnmount: true` (dialog temporal)

**Impacto estimado:**
- Realtime updates: ✅
- Código eliminado: ~60 líneas

---

#### 1.3 Client Names en Tables ⭐⭐

**Archivos:**
- `src/modules/data-views/tasks/components/tables/TasksTable/TasksTable.tsx`
- `src/modules/data-views/tasks/components/tables/KanbanBoard/TasksKanban.tsx`

**Migración:**
- Usar `useClientName()` en lugar de `clients.find()`
- Mantener `useTasksCommon()` pero optimizar `getClientName`

**Impacto estimado:**
- Performance: 98% más rápido
- Código simplificado

---

### Fase 2: Media Prioridad (Semana 2)

#### 2.1 Shared Task View

**Archivos:**
- `src/app/guest/[taskId]/_components/GuestTaskContent.tsx`

**Migración:**
- Usar `useTaskState()` para cargar task compartida

---

#### 2.2 Dropdowns y Filtros

**Archivos:**
- Client filters en tablas
- Task filters

**Migración:**
- Usar `useAllClients()` en dropdowns

---

### Fase 3: Limpieza (Semana 3)

#### 3.1 Integrar clientsDataStore en App

**Archivo:**
- `src/app/dashboard/layout.tsx`

**Agregar:**
```typescript
useEffect(() => {
  const loadClients = async () => {
    const result = await getClients();
    setClients(result.data);
  };
  loadClients();
}, []);
```

#### 3.2 Métricas Finales

```typescript
// Ver impacto de la migración
const stats = useTasksDataStore.getState().getStats();
console.log('=== IMPACTO DE MIGRACIÓN - TASKS ===');
console.log('Hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
console.log('Cache size:', stats.cacheSize);
console.log('Suscripciones activas:', stats.activeSubscriptions);
```

---

## Testing y Validación

### Test Plan por Módulo

#### Tests Funcionales

```typescript
describe('ChatMessage with useTaskName', () => {
  it('should display task name correctly', async () => {
    render(<ChatMessage message={mockMessage} />);

    await waitFor(() => {
      expect(screen.getByText('Test Task Name')).toBeInTheDocument();
    });
  });

  it('should update when task name changes', async () => {
    render(<ChatMessage message={mockMessage} />);

    // Actualizar task en Firestore
    await updateDoc(doc(db, 'tasks', 'task123'), {
      name: 'Updated Name',
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Name')).toBeInTheDocument();
    });
  });
});
```

#### Tests de Performance

```typescript
test('useClientName is faster than array.find', () => {
  const startFind = performance.now();
  const clients = Array.from({ length: 50 }, (_, i) => ({ id: `client${i}`, name: `Client ${i}` }));
  clients.find((c) => c.id === 'client49');
  const endFind = performance.now();

  const startMap = performance.now();
  const clientName = useClientsDataStore.getState().getClientName('client49');
  const endMap = performance.now();

  expect(endMap - startMap).toBeLessThan(endFind - startFind);
});
```

### Validación Manual

**Checklist por módulo migrado:**

- [ ] Datos se muestran correctamente
- [ ] Loading states funcionan
- [ ] Error states funcionan
- [ ] Actualizaciones realtime funcionan (tasks)
- [ ] Performance es igual o mejor
- [ ] No hay console errors
- [ ] No hay memory leaks
- [ ] Cache hit rate > 70% (tasks)

---

## Checklist de Migración

### Pre-Migración

- [ ] Leer documentación de tasksDataStore
- [ ] Leer documentación de clientsDataStore
- [ ] Identificar módulos a migrar
- [ ] Crear branch de migración

### Durante Migración (Por Módulo)

**Tasks:**
- [ ] Identificar queries directas (`getDoc`)
- [ ] Identificar listeners manuales (`onSnapshot`)
- [ ] Elegir hook apropiado (name, status, state)
- [ ] Reemplazar código
- [ ] Eliminar useEffect/useState innecesarios
- [ ] Testing
- [ ] Code review
- [ ] Merge

**Clients:**
- [ ] Identificar `array.find()` con clients
- [ ] Reemplazar con `useClientName()`
- [ ] Testing
- [ ] Verificar performance mejoró
- [ ] Merge

### Post-Migración

- [ ] Verificar en producción
- [ ] Monitorear Firestore reads (reducción esperada)
- [ ] Verificar cache hit rate > 70% (tasks)
- [ ] Documentar aprendizajes

---

## Troubleshooting de Migración

### Error: "Task data is null"

**Causa**: Componente se renderiza antes de que se complete la suscripción.

**Solución**:
```typescript
const { taskData, isLoading } = useTaskState(taskId);

if (isLoading) return <Skeleton />;
if (!taskData) return null;
```

---

### Error: "Too many re-renders"

**Causa**: Estás usando el hook completo cuando solo necesitas un campo.

**Solución**:
```typescript
// ❌ INCORRECTO
const taskData = useTaskData(taskId);
return <span>{taskData?.name}</span>;

// ✅ CORRECTO
const taskName = useTaskName(taskId);
return <span>{taskName}</span>;
```

---

### Performance no mejoró (clients)

**Causa**: No estás usando `useClientName()`, sigues usando `array.find()`.

**Solución**: Buscar todos los `.find()` y reemplazar:
```bash
grep -r "clients.find" src/
```

---

## Recursos Adicionales

- [Documentación tasksDataStore](./TASKS_DATA_STORE.md)
- [Documentación clientsDataStore](./CLIENTS_DATA_STORE.md)
- [Documentación usersDataStore](./USERS_DATA_STORE.md)

---

## Métricas de Éxito

Al completar la migración:

### Tasks

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Reads individuales | ~200/día | ~60/día | **70%** |
| Cache hit rate | N/A | > 70% | ✅ |
| Realtime updates | No | Sí | ✅ |
| Código duplicado | ~300 líneas | 0 líneas | **100%** |

### Clients

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Acceso por ID | O(n) | O(1) | **98%** |
| Re-renders | Muchos | Mínimos | ✅ |
| Código más limpio | - | ✅ | ✅ |

---

**¡Buena suerte con la migración! 🚀**
