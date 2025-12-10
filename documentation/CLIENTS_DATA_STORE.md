# ClientsDataStore - Cache Optimizado para Datos de Clients

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [API del Store](#api-del-store)
4. [Guía de Uso](#guía-de-uso)
5. [Hooks Disponibles](#hooks-disponibles)
6. [Performance](#performance)
7. [Integración con clientService](#integración-con-clientservice)

---

## Descripción General

`clientsDataStore` es una **optimización simple** del sistema de cache de clients. No usa suscripciones en tiempo real (no son necesarias), pero mejora el acceso por ID de O(n) a O(1).

### Problema que Resuelve

**Antes (con array.find()):**
```typescript
// En múltiples componentes:
const clients = useDataStore((state) => state.clients);
const client = clients.find((c) => c.id === clientId); // O(n) - Lento

// Si tienes 50 clients y 100 tasks mostrando client names:
// 100 × O(50) = 5,000 operaciones de búsqueda
```

**Después (con Map):**
```typescript
// Acceso directo O(1)
const clientName = useClientName(clientId); // O(1) - Instantáneo

// Mismo escenario:
// 100 × O(1) = 100 operaciones
// Mejora: 98% más rápido
```

### Beneficios

| Sin clientsDataStore | Con clientsDataStore |
|---------------------|---------------------|
| `array.find()` en cada render | Map.get() O(1) |
| Sin cache de acceso | SessionStorage cache |
| Re-crea objeto cada vez | Referencia estable |

### Por qué NO necesita suscripciones realtime

Los clients **cambian muy poco**:
- Se crean raramente
- Nombres/logos casi nunca cambian
- No hay estados "activos" como en users/tasks

Por eso usamos el cache existente (`clientService`) + Map optimizado, sin `onSnapshot`.

---

## Arquitectura

### Arquitectura Simple: Map + SessionStorage

```
┌─────────────────────────────────────────────────────────────┐
│              clientsDataStore (Zustand)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────┐    ┌──────────────────────┐     │
│  │   In-Memory Cache     │    │  SessionStorage      │     │
│  │   (Map<id, Client>)   │    │  (TTL: 30 min)       │     │
│  │                       │    │                      │     │
│  │  client1 → Client     │◄──►│  clients_cache_all   │     │
│  │  client2 → Client     │    │                      │     │
│  │  client3 → Client     │    │                      │     │
│  │                       │    │                      │     │
│  │  ✅ O(1) access       │    │  ✅ Persiste         │     │
│  └───────────────────────┘    └──────────────────────┘     │
│                                                             │
│  Fetching:                                                  │
│  └─ Usa clientService.getClients() (existente)              │
│     └─ globalRequestCache + IndexedDB                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │  TaskCard  │     │ClientFilter│     │  Dropdown  │
    │ (consume)  │     │ (consume)  │     │ (consume)  │
    └────────────┘     └────────────┘     └────────────┘
```

### Archivos del Sistema

```
src/
├── stores/
│   └── clientsDataStore.ts       # Map cache ← NUEVO
├── hooks/
│   └── useClientData.ts          # Hooks optimizados ← NUEVO
└── services/
    └── clientService.ts          # Mantener (fetching)
```

---

## API del Store

### State

```typescript
interface ClientsDataState {
  // Cache as Map for O(1) access
  clients: Map<string, Client>;

  // Loading state
  isLoading: boolean;

  // Error state
  error: Error | null;

  // Last fetch timestamp
  lastFetch: number;
}
```

### Actions

```typescript
interface ClientsDataActions {
  setClients: (clients: Client[]) => void;
  getClient: (clientId: string) => Client | null;
  getClientName: (clientId: string) => string;
  getAllClients: () => Client[];
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  invalidate: () => void;
  isCacheFresh: () => boolean;
}
```

---

## Guía de Uso

### ✅ Caso 1: Mostrar nombre de cliente en TaskCard

```tsx
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

**Antes:**
```tsx
const clients = useDataStore((state) => state.clients);
const client = clients.find((c) => c.id === task.clientId); // O(n)
const clientName = client?.name || 'Desconocido';
```

**Mejora**: O(n) → O(1)

### ✅ Caso 2: Logo de cliente

```tsx
import { useClientImageUrl } from '@/hooks/useClientData';

function ClientLogo({ clientId }: { clientId: string }) {
  const imageUrl = useClientImageUrl(clientId);

  return <img src={imageUrl} alt="Client logo" className="w-10 h-10" />;
}
```

### ✅ Caso 3: Dropdown de clientes

```tsx
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

### ✅ Caso 4: Con estados de loading/error

```tsx
import { useClientsState } from '@/hooks/useClientData';

function ClientsList() {
  const { clients, isLoading, error } = useClientsState();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
```

---

## Hooks Disponibles

### Hooks de Datos

```typescript
// Cliente completo
const client = useClientData(clientId);

// Solo nombre (optimizado)
const clientName = useClientName(clientId);

// Solo imagen
const imageUrl = useClientImageUrl(clientId);

// Todos los clientes
const clients = useAllClients();
```

### Hooks de Estado

```typescript
// Loading
const isLoading = useClientsLoading();

// Error
const error = useClientsError();

// Todo junto
const { clients, isLoading, error } = useClientsState();
```

### Hooks de Utilidad

```typescript
// Verificar si cache es fresco (< 30 min)
const isFresh = useIsCacheFresh();
```

---

## Performance

### Benchmark: 100 tasks mostrando client names

**Antes (array.find):**
```typescript
// Cada TaskCard:
const clients = useDataStore((state) => state.clients); // 50 clients
const client = clients.find((c) => c.id === task.clientId);
// 100 tasks × O(50) = 5,000 operaciones de búsqueda
```

**Después (Map.get):**
```typescript
// Cada TaskCard:
const clientName = useClientName(task.clientId);
// 100 tasks × O(1) = 100 operaciones
// Mejora: 98% más rápido
```

### Cache TTL

- **SessionStorage**: 30 minutos
- **Razón**: Clients cambian raramente
- **Beneficio**: UI instantánea en page reload

---

## Integración con clientService

### Cómo se integran

```typescript
// 1. clientService.ts sigue manejando el fetching
import { getClients } from '@/services/clientService';

// 2. Componente fetches y popula el store
import { useClientsDataStore } from '@/stores/clientsDataStore';

function App() {
  const setClients = useClientsDataStore((state) => state.setClients);
  const isCacheFresh = useClientsDataStore((state) => state.isCacheFresh);

  useEffect(() => {
    const fetchClients = async () => {
      // Solo fetch si cache no es fresco
      if (!isCacheFresh()) {
        const result = await getClients();
        setClients(result.data);
      }
    };

    fetchClients();
  }, []);
}
```

### Flujo completo

```
1. App mounts
   ↓
2. Check isCacheFresh()
   ↓
   ├─ Fresh (< 30 min) → Skip fetch, usa SessionStorage
   └─ Stale → Continuar
       ↓
3. clientService.getClients()
   ↓
   ├─ globalRequestCache HIT → Return cached
   ├─ IndexedDB HIT → Return IDB cached
   └─ Network fetch → Fetch from Firestore
       ↓
4. setClients(result.data)
   ↓
5. clientsDataStore actualiza Map
   ↓
6. Todos los componentes usan O(1) access
```

---

## Comparación con usersDataStore

| Feature | usersDataStore | clientsDataStore |
|---------|---------------|------------------|
| Suscripciones realtime | ✅ Sí (onSnapshot) | ❌ No (no necesario) |
| Cache por ID | ✅ Map | ✅ Map |
| SessionStorage | ✅ Sí (por usuario) | ✅ Sí (todos juntos) |
| TTL | 5 minutos | 30 minutos |
| LRU cleanup | ✅ Sí (max 50) | ❌ No (pocos clients) |
| Auto-subscribe | ✅ Sí | ❌ No |

**Razón**: Users cambian frecuentemente (status, online). Clients cambian raramente.

---

## Troubleshooting

### "Cliente desconocido" en UI

**Síntoma**: `useClientName()` retorna "Cliente desconocido".

**Causa**: Store vacío, no se hizo fetch.

**Solución**:
```tsx
// En App.tsx o layout
useEffect(() => {
  const loadClients = async () => {
    const result = await getClients();
    setClients(result.data);
  };
  loadClients();
}, []);
```

### Cache no persiste

**Síntoma**: Cada reload hace fetch.

**Causa**: SessionStorage no se está guardando.

**Solución**: Verificar que `setClients()` se llama después del fetch:
```typescript
const result = await getClients();
setClients(result.data); // ← Esto guarda en SessionStorage
```

---

## Resumen

| Necesito... | Usar... |
|-------------|---------|
| Nombre de cliente | `useClientName(clientId)` |
| Logo de cliente | `useClientImageUrl(clientId)` |
| Cliente completo | `useClientData(clientId)` |
| Todos los clientes | `useAllClients()` |
| Dropdown/filtro | `useAllClients()` |

**Regla de oro**: Usa `useClientName()` en lugar de `array.find()` para acceso O(1) instantáneo.
