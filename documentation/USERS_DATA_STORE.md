# UsersDataStore - Single Source of Truth para Datos de Otros Usuarios

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Diferencias con userDataStore](#diferencias-con-userdatastore)
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

`usersDataStore` es un **Zustand store** que centraliza los datos de **OTROS usuarios** (no el usuario en sesión). Actúa como **Single Source of Truth** para evitar:

- ❌ Múltiples queries a Firestore para los mismos usuarios
- ❌ Inconsistencias entre componentes que muestran el mismo usuario
- ❌ Re-renders innecesarios
- ❌ Listeners duplicados de `onSnapshot`
- ❌ Memory leaks por suscripciones no limpiadas

### Beneficios

| Sin usersDataStore | Con usersDataStore |
|-------------------|-------------------|
| Cada componente hace su propio `getDoc()` | Un solo `onSnapshot` por usuario |
| 3 componentes muestran user123 = 3 reads | 3 componentes muestran user123 = 1 suscripción |
| Datos desincronizados entre componentes | Todos leen del mismo cache |
| Sin cache, requests repetidos | Cache híbrido (In-Memory + SessionStorage) |
| Memory leaks por listeners no limpiados | Auto-cleanup con LRU y TTL |

### Métricas de Impacto

**Ejemplo real**: Una tarea con 5 colaboradores mostrada en 3 componentes diferentes

- **Antes**: 5 usuarios × 3 componentes = **15 reads a Firestore**
- **Después**: 5 suscripciones (1 por usuario) = **5 onSnapshot** (realtime)
- **Reducción**: **67% menos requests** + actualizaciones en tiempo real

---

## Diferencias con userDataStore

| Característica | `userDataStore` (singular) | `usersDataStore` (plural) |
|----------------|---------------------------|--------------------------|
| **Propósito** | Usuario en sesión | Otros usuarios |
| **Alcance** | 1 usuario fijo | N usuarios dinámicos |
| **Suscripción** | Al login (permanente) | On-demand (cuando se necesita) |
| **Estructura** | `userData: UserData \| null` | `users: Map<userId, UserData>` |
| **Cleanup** | No necesario | **CRÍTICO** - LRU + TTL |
| **Memoria** | ~2KB fijo | Variable (max 50 usuarios) |
| **Cache** | SessionStorage + State | **Híbrido**: LRU + SessionStorage |

### ¿Cuándo usar cada uno?

```typescript
// ✅ userDataStore - Para el usuario en sesión
const myName = useUserDisplayName(); // Mi propio nombre
const myPhoto = useUserProfilePhoto(); // Mi propia foto

// ✅ usersDataStore - Para otros usuarios
const collaboratorName = useOtherUserDisplayName(collaboratorId);
const assigneeName = useOtherUserDisplayName(assigneeId);
```

---

## Arquitectura

### Arquitectura Híbrida: In-Memory LRU + SessionStorage

```
┌─────────────────────────────────────────────────────────────────┐
│                    usersDataStore (Zustand)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────┐    ┌──────────────────────────┐     │
│  │   In-Memory Cache     │    │   SessionStorage Cache   │     │
│  │   (LruMap - Max 50)   │    │   (TTL: 5 minutos)       │     │
│  │                       │    │                          │     │
│  │  user123 → UserData   │◄──►│  users_cache_user123     │     │
│  │  user456 → UserData   │    │  users_cache_user456     │     │
│  │  user789 → UserData   │    │  users_cache_user789     │     │
│  │                       │    │                          │     │
│  │  ✅ Ultra rápido      │    │  ✅ Persiste re-renders  │     │
│  │  ✅ Auto-limita 50    │    │  ✅ TTL automático       │     │
│  └───────────────────────┘    └──────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │          Firestore Subscriptions (onSnapshot)         │     │
│  │                                                       │     │
│  │  user123 → onSnapshot('/users/user123')              │     │
│  │  user456 → onSnapshot('/users/user456')              │     │
│  │  user789 → onSnapshot('/users/user789')              │     │
│  │                                                       │     │
│  │  ✅ Realtime updates                                  │     │
│  │  ✅ Auto cleanup on unmount (opcional)                │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                  Auto Cleanup                         │     │
│  │                                                       │     │
│  │  • Interval: cada 5 minutos                           │     │
│  │  • LRU: elimina automáticamente cuando > 50 usuarios  │     │
│  │  • TTL: elimina entradas > 5 minutos                  │     │
│  │  • beforeunload: unsubscribe all                      │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │  TaskCard  │     │   Header   │     │  TeamList  │
    │ (consume)  │     │ (consume)  │     │ (consume)  │
    └────────────┘     └────────────┘     └────────────┘
```

### Archivos del Sistema

```
src/
├── stores/
│   ├── userDataStore.ts              # Usuario EN SESIÓN (singular)
│   └── usersDataStore.ts             # OTROS usuarios (plural) ← NUEVO
├── hooks/
│   ├── useUserDataSubscription.ts    # Para usuario en sesión
│   └── useOtherUserData.ts           # Para otros usuarios ← NUEVO
└── shared/
    └── utils/
        └── lru-map.ts                # LRU Map reutilizado
```

---

## Flujo de Datos

### 1. Suscripción (Primera vez que se necesita un usuario)

```
Componente A necesita datos de user123
       ↓
useOtherUserDisplayName(user123) se ejecuta
       ↓
Hook llama a subscribeToUser(user123)
       ↓
Store verifica si ya existe suscripción (evita duplicados)
       ↓
NO existe → Continuar
       ↓
1. Intenta cargar desde SessionStorage (UI instantánea)
       ↓
   ┌─ Si existe en session → Retornar inmediatamente (cache HIT)
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
Componente A re-renderiza con datos frescos
```

### 2. Cache Hit (Otros componentes necesitan el mismo usuario)

```
Componente B necesita datos de user123
       ↓
useOtherUserDisplayName(user123) se ejecuta
       ↓
Hook llama a subscribeToUser(user123)
       ↓
Store verifica si ya existe suscripción
       ↓
SÍ existe → Skip (evita duplicados)
       ↓
getUserData(user123) retorna desde cache
       ↓
   ┌─ Verificar In-Memory cache → ✅ HIT
   │  └─ Retornar inmediatamente (0ms)
   │
   └─ Si no está en memoria:
      └─ Verificar SessionStorage → ✅ HIT
         └─ Copiar a In-Memory y retornar
       ↓
Componente B re-renderiza con datos (cache HIT)
       ↓
Stats: hits++
```

### 3. Actualización Realtime (Usuario edita su perfil)

```
user123 edita su perfil en Firestore
       ↓
onSnapshot detecta el cambio automáticamente
       ↓
Callback se ejecuta con nuevos datos
       ↓
Actualiza In-Memory cache
       ↓
Actualiza SessionStorage cache
       ↓
TODOS los componentes suscritos se actualizan automáticamente
       ↓
Componente A re-renderiza
Componente B re-renderiza
Componente C re-renderiza
```

### 4. Auto-Cleanup (TTL expira)

```
Cada 5 minutos, setInterval se ejecuta
       ↓
cleanupExpired() verifica todas las entradas
       ↓
Para cada entrada en cache:
   ┌─ age = now - timestamp
   └─ if (age > 5 minutos) → Eliminar
       ↓
Entradas expiradas eliminadas de:
   • In-Memory cache
   • SessionStorage
       ↓
Si se vuelve a necesitar el usuario:
   → Se suscribe nuevamente (fresh data)
```

### 5. LRU Cleanup (Excede 50 usuarios)

```
Se intenta agregar user51 al cache
       ↓
LruMap.set(user51, data)
       ↓
LruMap verifica: size > 50?
       ↓
SÍ → Eliminar el usuario MENOS recientemente usado
       ↓
user1 (el más antiguo) se elimina automáticamente
       ↓
user51 se agrega exitosamente
       ↓
Cache size = 50 (constante)
```

---

## API del Store

### State

```typescript
interface UsersDataState {
  // In-memory cache con LRU automático
  users: LruMap<string, CachedUserEntry>;

  // Suscripciones activas (Firestore listeners)
  subscriptions: Map<string, Unsubscribe>;

  // Estado de carga por usuario
  loadingUsers: Set<string>;

  // Errores por usuario
  errors: Map<string, Error>;

  // Métricas
  stats: {
    hits: number;              // Cache hits
    misses: number;            // Cache misses
    subscriptions: number;     // Suscripciones activas
  };
}

interface CachedUserEntry {
  data: UserData;
  timestamp: number;
  source: 'cache' | 'network';
}
```

### Actions

```typescript
interface UsersDataActions {
  // Suscribirse a un usuario (crea listener de Firestore)
  subscribeToUser: (userId: string) => void;

  // Desuscribirse de un usuario (elimina listener)
  unsubscribeFromUser: (userId: string) => void;

  // Obtener datos (cache-first strategy)
  getUserData: (userId: string) => UserData | null;

  // Invalidar cache de un usuario específico
  invalidateUser: (userId: string) => void;

  // Invalidar cache de TODOS los usuarios
  invalidateAll: () => void;

  // Cleanup manual de expirados
  cleanupExpired: () => number;

  // Estadísticas del store
  getStats: () => {
    hits: number;
    misses: number;
    hitRate: number;
    cacheSize: number;
    activeSubscriptions: number;
  };

  // Desuscribirse de todos
  unsubscribeAll: () => void;
}
```

---

## Guía de Uso

### ✅ Caso 1: Mostrar nombre de un colaborador

```tsx
// ✅ CORRECTO - Hook optimizado con auto-suscripción
import { useOtherUserDisplayName } from '@/hooks/useOtherUserData';

function CollaboratorBadge({ userId }: { userId: string }) {
  const displayName = useOtherUserDisplayName(userId);
  return <span>{displayName}</span>;
}
```

### ✅ Caso 2: Mostrar avatar de un asignado

```tsx
// ✅ CORRECTO - Hook optimizado
import { useOtherUserProfilePhoto } from '@/hooks/useOtherUserData';

function AssigneeAvatar({ userId }: { userId: string }) {
  const profilePhoto = useOtherUserProfilePhoto(userId);
  return <img src={profilePhoto} alt="Avatar" className="w-10 h-10 rounded-full" />;
}
```

### ✅ Caso 3: Card completo con loading y error

```tsx
// ✅ CORRECTO - Hook compuesto con todos los estados
import { useOtherUserState } from '@/hooks/useOtherUserData';

function UserCard({ userId }: { userId: string }) {
  const { userData, isLoading, error } = useOtherUserState(userId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!userData) return null;

  return (
    <div>
      <img src={userData.profilePhoto} alt={userData.fullName} />
      <h2>{userData.fullName}</h2>
      <p>{userData.role}</p>
      <span>{userData.status}</span>
    </div>
  );
}
```

### ✅ Caso 4: Lista de múltiples usuarios (Team)

```tsx
// ✅ CORRECTO - Hook de múltiples usuarios
import { useSubscribeToMultipleUsers, useOtherUserDisplayName } from '@/hooks/useOtherUserData';

function TeamMembers({ userIds }: { userIds: string[] }) {
  // Se suscribe a TODOS los usuarios de una vez
  useSubscribeToMultipleUsers(userIds);

  return (
    <div className="flex gap-2">
      {userIds.map((userId) => (
        <MemberAvatar key={userId} userId={userId} />
      ))}
    </div>
  );
}

function MemberAvatar({ userId }: { userId: string }) {
  const displayName = useOtherUserDisplayName(userId, { autoSubscribe: false });
  const photo = useOtherUserProfilePhoto(userId, { autoSubscribe: false });

  return <img src={photo} alt={displayName} title={displayName} />;
}
```

### ✅ Caso 5: Desuscribirse al desmontar (Opcional)

```tsx
// ✅ CORRECTO - Cleanup automático
import { useOtherUserData } from '@/hooks/useOtherUserData';

function TemporaryUserCard({ userId }: { userId: string }) {
  // Se desuscribirá automáticamente al desmontar
  const userData = useOtherUserData(userId, { unsubscribeOnUnmount: true });

  return userData ? <div>{userData.fullName}</div> : <Skeleton />;
}
```

**Nota**: En la mayoría de casos NO necesitas `unsubscribeOnUnmount: true` porque el cache es beneficioso para otros componentes.

### ✅ Caso 6: Invalidar cache después de actualizar

```tsx
// ✅ CORRECTO - Invalidar cache de un usuario específico
import { useUsersDataStore } from '@/stores/usersDataStore';

function AdminPanel() {
  const invalidateUser = useUsersDataStore((state) => state.invalidateUser);

  const handleUpdateUser = async (userId: string, updates: Partial<UserData>) => {
    // 1. Actualizar en Firestore
    await updateDoc(doc(db, 'users', userId), updates);

    // 2. Invalidar cache (opcional - onSnapshot lo hará automáticamente)
    invalidateUser(userId);
  };

  return (/* UI */);
}
```

### ❌ Caso INCORRECTO: Query directa a Firestore

```tsx
// ❌ INCORRECTO - No hagas esto
import { doc, getDoc } from 'firebase/firestore';

function BadUserCard({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // ❌ Query directa - ignora el cache centralizado
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, 'users', userId));
      setUser(snap.data());
    };
    fetchUser();
  }, [userId]);

  // ❌ Otros componentes no se benefician de este fetch
  // ❌ No hay actualizaciones en tiempo real
  // ❌ Duplica requests si hay múltiples componentes
}
```

### ❌ Caso INCORRECTO: Listener manual

```tsx
// ❌ INCORRECTO - No hagas esto
import { doc, onSnapshot } from 'firebase/firestore';

function BadUserCard({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // ❌ Listener manual - duplica el del store
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (snap) => {
      setUser(snap.data());
    });

    return () => unsubscribe();
  }, [userId]);

  // ❌ Si 5 componentes usan este patrón = 5 listeners a Firestore
  // ✅ Con usersDataStore = 1 solo listener compartido
}
```

---

## Hooks Disponibles

### Hooks de Datos Específicos (Optimizados)

```typescript
// Solo nombre
const displayName = useOtherUserDisplayName(userId);

// Solo foto
const profilePhoto = useOtherUserProfilePhoto(userId);

// Solo estado
const status = useOtherUserStatus(userId);

// Solo rol
const role = useOtherUserRole(userId);

// Solo email
const email = useOtherUserEmail(userId);
```

**Ventaja**: Solo re-renderizan cuando ESE campo específico cambia.

### Hooks de Estado

```typescript
// Verificar si está cargando
const isLoading = useIsOtherUserLoading(userId);

// Obtener error si ocurrió
const error = useOtherUserError(userId);
```

### Hook Completo

```typescript
// Datos completos + estados
const { userData, isLoading, error } = useOtherUserState(userId);
```

### Hook de Múltiples Usuarios

```typescript
// Suscribirse a múltiples usuarios
useSubscribeToMultipleUsers(userIds);

// Obtener datos de múltiples usuarios
const usersData = useMultipleUsersData(userIds);
```

### Hook de Bajo Nivel (Control Manual)

```typescript
// Solo suscribirse (sin obtener datos)
useSubscribeToUser(userId, { unsubscribeOnUnmount: true });

// Luego usar el store directamente
const userData = useUsersDataStore((state) => state.getUserData(userId));
```

---

## Patrones Recomendados

### 1. Componentes de Presentación (Solo Lectura)

```tsx
// Para componentes que solo muestran datos
function UserBadge({ userId }: { userId: string }) {
  const displayName = useOtherUserDisplayName(userId);
  const photo = useOtherUserProfilePhoto(userId);

  return (
    <div className="flex items-center gap-2">
      <img src={photo} alt={displayName} className="w-8 h-8 rounded-full" />
      <span>{displayName}</span>
    </div>
  );
}
```

### 2. Listas de Usuarios (Múltiples Suscripciones)

```tsx
// Para listas de usuarios (ej: equipo de tarea)
function TaskTeam({ task }: { task: Task }) {
  const allUserIds = [...task.LeadedBy, ...task.AssignedTo];

  // Una sola llamada para suscribirse a todos
  useSubscribeToMultipleUsers(allUserIds);

  return (
    <div>
      <h3>Líderes</h3>
      {task.LeadedBy.map((userId) => (
        <UserBadge key={userId} userId={userId} />
      ))}

      <h3>Asignados</h3>
      {task.AssignedTo.map((userId) => (
        <UserBadge key={userId} userId={userId} />
      ))}
    </div>
  );
}
```

### 3. Manejo de Estados (Loading, Error)

```tsx
// Para componentes que necesitan manejar todos los estados
function UserProfileCard({ userId }: { userId: string }) {
  const { userData, isLoading, error } = useOtherUserState(userId);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error al cargar usuario: {error.message}
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div>
      <img src={userData.profilePhoto} alt={userData.fullName} />
      <h2>{userData.fullName}</h2>
      <p>{userData.role}</p>
      <p>{userData.description}</p>
    </div>
  );
}
```

### 4. Cleanup Condicional

```tsx
// Para componentes temporales (modals, popovers)
function UserQuickView({ userId, isOpen }: { userId: string; isOpen: boolean }) {
  const { userData, isLoading } = useOtherUserState(userId, {
    // Solo suscribirse si el modal está abierto
    autoSubscribe: isOpen,
    // Desuscribirse al cerrar
    unsubscribeOnUnmount: true,
  });

  if (!isOpen) return null;
  if (isLoading) return <Spinner />;

  return <div>{userData?.fullName}</div>;
}
```

---

## Performance y Optimización

### Reducción de Requests a Firestore

#### Escenario: TasksTable con 10 tareas, cada una con 3 colaboradores

**Sin usersDataStore:**
```
10 tareas × 3 colaboradores × 1 componente = 30 getDoc()
Si hay 3 componentes mostrando la misma tabla = 90 reads
```

**Con usersDataStore:**
```
Usuarios únicos en 10 tareas = ~15 usuarios
15 suscripciones onSnapshot (realtime)
Cache hits para usuarios repetidos
```

**Resultado: 83% de reducción** + actualizaciones en tiempo real

### Métricas del Store

```typescript
// Obtener estadísticas en cualquier momento
const stats = useUsersDataStore.getState().getStats();

console.log(stats);
// {
//   hits: 127,              // Veces que se encontró en cache
//   misses: 15,             // Veces que se tuvo que cargar
//   hitRate: 0.894,         // 89.4% hit rate
//   cacheSize: 18,          // 18 usuarios en memoria
//   activeSubscriptions: 18 // 18 suscripciones activas a Firestore
// }
```

**Hit rate objetivo: > 80%** significa que el cache está funcionando bien.

### Límites de Memoria

| Mecanismo | Límite | Comportamiento |
|-----------|--------|----------------|
| In-Memory LRU | 50 usuarios | Auto-elimina el menos usado |
| SessionStorage | ~5MB total | Try/catch silencioso si falla |
| Suscripciones | Ilimitado* | Cleanup manual recomendado |

*Aunque no hay límite técnico, se recomienda < 100 suscripciones simultáneas.

### Optimizaciones Aplicadas

1. **LRU Cache**: Automáticamente elimina usuarios menos usados
2. **SessionStorage TTL**: Expira entradas después de 5 minutos
3. **Auto-cleanup**: Ejecuta cada 5 minutos para limpiar expirados
4. **Selector Hooks**: Solo re-renderizan cuando el campo específico cambia
5. **Evita Duplicados**: No crea suscripciones duplicadas automáticamente
6. **beforeunload**: Limpia todas las suscripciones al cerrar pestaña

---

## Troubleshooting

### Los datos no se actualizan en tiempo real

**Síntoma**: Los datos de un usuario no se actualizan cuando cambian en Firestore.

**Posibles causas:**
1. No te suscribiste al usuario (usaste `getUserData` directamente sin hook)
2. La suscripción falló silenciosamente

**Solución:**
```tsx
// ❌ INCORRECTO - No se suscribe
const userData = useUsersDataStore((state) => state.getUserData(userId));

// ✅ CORRECTO - Se suscribe automáticamente
const userData = useOtherUserData(userId);
```

---

### El cache está vacío

**Síntoma**: `getUserData(userId)` retorna `null` aunque el usuario existe.

**Posibles causas:**
1. No te suscribiste al usuario primero
2. El usuario no existe en Firestore
3. Error en la suscripción

**Solución:**
```tsx
// Verificar errores
const error = useOtherUserError(userId);
if (error) console.error('Error:', error);

// Verificar loading
const isLoading = useIsOtherUserLoading(userId);
if (isLoading) console.log('Aún cargando...');

// O usar el hook compuesto
const { userData, isLoading, error } = useOtherUserState(userId);
```

---

### Re-renders excesivos

**Síntoma**: El componente se re-renderiza más de lo esperado.

**Posibles causas:**
1. Estás usando `useOtherUserData` (datos completos) cuando solo necesitas un campo
2. Estás creando objetos nuevos en el selector

**Solución:**
```tsx
// ❌ INCORRECTO - Re-renderiza con cualquier cambio
const userData = useOtherUserData(userId);
return <span>{userData?.fullName}</span>;

// ✅ CORRECTO - Solo re-renderiza si el nombre cambia
const displayName = useOtherUserDisplayName(userId);
return <span>{displayName}</span>;
```

---

### Memory leak warnings

**Síntoma**: React muestra warnings de memory leaks.

**Posibles causas:**
1. Componentes se desmontan pero las suscripciones siguen activas
2. Muchas suscripciones acumuladas

**Solución:**
```tsx
// Para componentes temporales, usa unsubscribeOnUnmount
const userData = useOtherUserData(userId, { unsubscribeOnUnmount: true });

// O limpia manualmente al desmontar la app
useEffect(() => {
  return () => {
    useUsersDataStore.getState().unsubscribeAll();
  };
}, []);
```

---

### Cache hit rate muy bajo (< 50%)

**Síntoma**: `getStats()` muestra un hit rate bajo.

**Posibles causas:**
1. Usuarios muy diversos sin repetición
2. TTL muy corto para tu caso de uso
3. Componentes constantemente invalidando cache

**Solución:**
```tsx
// Ver estadísticas
const stats = useUsersDataStore.getState().getStats();
console.log('Hit rate:', stats.hitRate);

// Si es bajo, considera:
// 1. Aumentar TTL (edita CACHE_TTL en usersDataStore.ts)
// 2. Aumentar MAX_USERS_IN_MEMORY (más usuarios en cache)
// 3. Evitar invalidaciones innecesarias
```

---

## Resumen de Migración

| Necesito... | Usar... |
|-------------|---------|
| Nombre de otro usuario | `useOtherUserDisplayName(userId)` |
| Foto de otro usuario | `useOtherUserProfilePhoto(userId)` |
| Estado de otro usuario | `useOtherUserStatus(userId)` |
| Rol de otro usuario | `useOtherUserRole(userId)` |
| Datos completos + estados | `useOtherUserState(userId)` |
| Lista de usuarios | `useSubscribeToMultipleUsers(userIds)` |
| Invalidar cache | `invalidateUser(userId)` |
| Ver estadísticas | `getStats()` |

---

## Próximos Pasos

1. **Leer la guía de migración**: `/documentation/USERS_DATA_STORE_MIGRATION.md`
2. **Identificar módulos a migrar**: Buscar queries directas a `/users/{userId}`
3. **Migrar módulo por módulo**: Empezar por componentes más usados
4. **Medir impacto**: Usar `getStats()` para verificar hit rate
5. **Optimizar**: Ajustar TTL, límites según tus necesidades

---

**Regla de oro**: Nunca hagas `getDoc(doc(db, 'users', userId))` para datos de otros usuarios. Siempre usa `usersDataStore` + hooks optimizados.
