# Guía de Migración a usersDataStore

## 📋 Índice

1. [Introducción](#introducción)
2. [Estrategia de Migración](#estrategia-de-migración)
3. [Identificar Código a Migrar](#identificar-código-a-migrar)
4. [Patrones de Migración](#patrones-de-migración)
5. [Ejemplos Reales](#ejemplos-reales)
6. [Plan de Migración Módulo por Módulo](#plan-de-migración-módulo-por-módulo)
7. [Testing y Validación](#testing-y-validación)
8. [Checklist de Migración](#checklist-de-migración)

---

## Introducción

Esta guía te ayudará a migrar tu código existente para usar el nuevo `usersDataStore` en lugar de queries directas a Firestore para datos de otros usuarios.

### Objetivos de la Migración

- ✅ Reducir reads a Firestore (60-80% de reducción)
- ✅ Eliminar código duplicado de queries
- ✅ Centralizar cache de usuarios
- ✅ Obtener actualizaciones en tiempo real
- ✅ Mejorar performance general de la app

### Alcance

**Migrar**: Queries a `/users/{userId}` para **otros usuarios**

**NO migrar**: Queries al usuario en sesión (usa `userDataStore` existente)

---

## Estrategia de Migración

### Enfoque Incremental

La migración se hará **módulo por módulo** para minimizar riesgos:

```
Fase 1: Módulos de Alta Prioridad (más usados)
  ↓
Fase 2: Módulos de Media Prioridad
  ↓
Fase 3: Módulos de Baja Prioridad
  ↓
Fase 4: Limpieza y Deprecación
```

### Principios

1. **No Breaking Changes**: Ambos sistemas coexisten durante la migración
2. **Testing Continuo**: Cada módulo migrado se prueba antes de continuar
3. **Rollback Fácil**: Mantener código anterior comentado temporalmente
4. **Métricas**: Usar `getStats()` para validar mejoras

---

## Identificar Código a Migrar

### Buscar Patrones

```bash
# 1. Buscar queries directas a users
grep -r "getDoc.*users" src/

# 2. Buscar listeners manuales
grep -r "onSnapshot.*users" src/

# 3. Buscar doc(db, 'users'
grep -r "doc(db, 'users'" src/
```

### Código a Migrar

#### ✅ SÍ migrar:

```typescript
// Queries directas a otros usuarios
const snap = await getDoc(doc(db, 'users', otherUserId));

// Listeners manuales
onSnapshot(doc(db, 'users', otherUserId), (snap) => { ... });

// Stores personalizados para usuarios
const usersCache = new Map<string, UserData>();

// Fetch en useEffect
useEffect(() => {
  const fetchUser = async () => {
    const snap = await getDoc(doc(db, 'users', userId));
    setUser(snap.data());
  };
  fetchUser();
}, [userId]);
```

#### ❌ NO migrar (usar `userDataStore`):

```typescript
// Usuario en sesión (actual)
const myUserId = user.id; // ← Es el usuario actual
const snap = await getDoc(doc(db, 'users', myUserId));
```

---

## Patrones de Migración

### Patrón 1: useEffect con getDoc → Hook optimizado

#### ANTES:

```typescript
function UserCard({ userId }: { userId: string }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{userData?.fullName}</div>;
}
```

#### DESPUÉS:

```typescript
import { useOtherUserState } from '@/hooks/useOtherUserData';

function UserCard({ userId }: { userId: string }) {
  const { userData, isLoading, error } = useOtherUserState(userId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{userData?.fullName}</div>;
}
```

**Beneficios:**
- 20 líneas → 5 líneas
- Sin useEffect manual
- Sin useState manual
- Auto-suscripción a Firestore
- Cache automático

---

### Patrón 2: onSnapshot manual → Hook con realtime

#### ANTES:

```typescript
function UserStatus({ userId }: { userId: string }) {
  const [status, setStatus] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snap) => {
        if (snap.exists()) {
          setStatus(snap.data().status || 'Disponible');
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return <Badge>{status}</Badge>;
}
```

#### DESPUÉS:

```typescript
import { useOtherUserStatus } from '@/hooks/useOtherUserData';

function UserStatus({ userId }: { userId: string }) {
  const status = useOtherUserStatus(userId);
  return <Badge>{status}</Badge>;
}
```

**Beneficios:**
- Listener compartido entre componentes
- Cache automático
- Cleanup automático

---

### Patrón 3: Mostrar solo nombre/foto → Selectores optimizados

#### ANTES:

```typescript
function TaskAssignee({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, 'users', userId));
      setUser(snap.data() as UserData);
    };
    fetchUser();
  }, [userId]);

  return (
    <div>
      <img src={user?.profilePhoto || '/default-avatar.svg'} />
      <span>{user?.fullName || 'Usuario'}</span>
    </div>
  );
}
```

#### DESPUÉS:

```typescript
import { useOtherUserDisplayName, useOtherUserProfilePhoto } from '@/hooks/useOtherUserData';

function TaskAssignee({ userId }: { userId: string }) {
  const displayName = useOtherUserDisplayName(userId);
  const profilePhoto = useOtherUserProfilePhoto(userId);

  return (
    <div>
      <img src={profilePhoto} />
      <span>{displayName}</span>
    </div>
  );
}
```

**Beneficios:**
- Solo re-renderiza si nombre o foto cambian
- No re-renderiza si cambia otro campo (ej: status)

---

### Patrón 4: Lista de usuarios → Hook múltiple

#### ANTES:

```typescript
function TeamList({ userIds }: { userIds: string[] }) {
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const promises = userIds.map((id) =>
        getDoc(doc(db, 'users', id))
      );
      const snaps = await Promise.all(promises);
      const usersData = snaps
        .filter((snap) => snap.exists())
        .map((snap) => snap.data() as UserData);
      setUsers(usersData);
    };

    fetchUsers();
  }, [userIds.join(',')]);

  return (
    <ul>
      {users.map((user) => (
        <li key={user.userId}>{user.fullName}</li>
      ))}
    </ul>
  );
}
```

#### DESPUÉS:

```typescript
import { useSubscribeToMultipleUsers, useOtherUserDisplayName } from '@/hooks/useOtherUserData';

function TeamList({ userIds }: { userIds: string[] }) {
  // Se suscribe a TODOS de una vez
  useSubscribeToMultipleUsers(userIds);

  return (
    <ul>
      {userIds.map((userId) => (
        <TeamMember key={userId} userId={userId} />
      ))}
    </ul>
  );
}

function TeamMember({ userId }: { userId: string }) {
  const displayName = useOtherUserDisplayName(userId, { autoSubscribe: false });
  return <li>{displayName}</li>;
}
```

**Beneficios:**
- Una suscripción por usuario (no por lista)
- Si user123 aparece en 3 listas = 1 sola suscripción
- Actualizaciones en tiempo real

---

### Patrón 5: Store personalizado → usersDataStore

#### ANTES (profileCardStore.ts):

```typescript
// Store personalizado con Map y onSnapshot manual
const useProfileCardStore = create<ProfileStore>((set, get) => ({
  profiles: new Map(),
  loading: new Set(),
  subscriptions: new Map(),

  fetchProfile: (userId) => {
    if (get().profiles.has(userId)) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snap) => {
        // ... actualizar state
      }
    );

    set((state) => ({
      subscriptions: new Map(state.subscriptions).set(userId, unsubscribe),
    }));
  },

  // ... más código
}));
```

#### DESPUÉS:

```typescript
// ❌ ELIMINAR store personalizado
// ✅ Usar usersDataStore + hooks

// En componentes:
import { useOtherUserData } from '@/hooks/useOtherUserData';

function ProfileCard({ userId }: { userId: string }) {
  const userData = useOtherUserData(userId);
  // ...
}
```

**Beneficios:**
- Eliminar ~100 líneas de código duplicado
- Cache compartido entre módulos
- Sin necesidad de mantener store personalizado

---

## Ejemplos Reales

### Ejemplo 1: Migrar ProfileHeader.tsx

**Ubicación**: `src/modules/profile-card/components/molecules/ProfileHeader/ProfileHeader.tsx`

**Situación actual**: Recibe `profile` por props (viene de profileCardStore)

#### ANTES:

```typescript
interface ProfileHeaderProps {
  profile: UserProfile;  // ← Props desde store personalizado
  userId: string;
  currentUserId?: string;
  onConfigClick?: () => void;
  onMessageClick: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  userId,
  // ...
}) => {
  const avatarUrl = profile.profilePhoto || '';

  return (
    <div>
      <img src={avatarUrl} alt={profile.fullName} />
      <h2>{profile.fullName}</h2>
      {profile.role && <Badge role={profile.role} />}
    </div>
  );
};
```

#### DESPUÉS (Opción 1 - Mantener props):

```typescript
// ProfileDialog.tsx (componente padre)
import { useOtherUserData } from '@/hooks/useOtherUserData';

function ProfileDialog({ userId }: { userId: string }) {
  const userData = useOtherUserData(userId);

  if (!userData) return <Skeleton />;

  return (
    <ProfileHeader
      profile={userData}
      userId={userId}
      // ...
    />
  );
}
```

#### DESPUÉS (Opción 2 - Self-contained):

```typescript
// ProfileHeader.tsx - Se encarga de sus propios datos
import { useOtherUserState } from '@/hooks/useOtherUserData';

interface ProfileHeaderProps {
  userId: string;  // ← Solo necesita userId
  currentUserId?: string;
  onConfigClick?: () => void;
  onMessageClick: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userId,
  // ...
}) => {
  const { userData, isLoading } = useOtherUserState(userId);

  if (isLoading) return <Skeleton />;
  if (!userData) return null;

  return (
    <div>
      <img src={userData.profilePhoto || ''} alt={userData.fullName} />
      <h2>{userData.fullName}</h2>
      {userData.role && <Badge role={userData.role} />}
    </div>
  );
};
```

**Recomendación**: Opción 2 (self-contained) es más desacoplado.

---

### Ejemplo 2: Migrar userService.ts

**Ubicación**: `src/services/userService.ts`

**Situación actual**: Usa `getDoc` directo con cache personalizado

#### ANTES:

```typescript
// userService.ts
export async function getUserData(userId: string): Promise<UserData> {
  // Cache personalizado...
  const cached = cache.get(userId);
  if (cached) return cached;

  // Query directo
  const snap = await getDoc(doc(db, 'users', userId));
  const data = snap.data() as UserData;

  // Guardar en cache
  cache.set(userId, data);

  return data;
}
```

#### DESPUÉS:

```typescript
// userService.ts
import { useUsersDataStore } from '@/stores/usersDataStore';

// Para uso fuera de React (funciones utilitarias)
export function getUserData(userId: string): UserData | null {
  // Intenta obtener desde cache
  const cached = useUsersDataStore.getState().getUserData(userId);

  if (cached) return cached;

  // Si no está en cache, suscribirse (carga en background)
  useUsersDataStore.getState().subscribeToUser(userId);

  return null; // Retorna null mientras carga
}

// Para uso en React (componentes)
// Usar hooks en su lugar:
// import { useOtherUserData } from '@/hooks/useOtherUserData';
```

**Mejor alternativa**: Deprecar `userService.getUserData` y usar hooks directamente en componentes.

---

### Ejemplo 3: TaskCard con múltiples colaboradores

#### ANTES:

```typescript
function TaskCard({ task }: { task: Task }) {
  const [leaders, setLeaders] = useState<UserData[]>([]);
  const [assignees, setAssignees] = useState<UserData[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch leaders
      const leadersSnaps = await Promise.all(
        task.LeadedBy.map((id) => getDoc(doc(db, 'users', id)))
      );
      setLeaders(leadersSnaps.map((s) => s.data() as UserData));

      // Fetch assignees
      const assigneesSnaps = await Promise.all(
        task.AssignedTo.map((id) => getDoc(doc(db, 'users', id)))
      );
      setAssignees(assigneesSnaps.map((s) => s.data() as UserData));
    };

    fetchUsers();
  }, [task.LeadedBy.join(','), task.AssignedTo.join(',')]);

  return (
    <div>
      <h3>Líderes</h3>
      {leaders.map((user) => (
        <UserBadge key={user.userId} user={user} />
      ))}

      <h3>Asignados</h3>
      {assignees.map((user) => (
        <UserBadge key={user.userId} user={user} />
      ))}
    </div>
  );
}
```

#### DESPUÉS:

```typescript
import { useSubscribeToMultipleUsers, useOtherUserDisplayName, useOtherUserProfilePhoto } from '@/hooks/useOtherUserData';

function TaskCard({ task }: { task: Task }) {
  const allUserIds = [...task.LeadedBy, ...task.AssignedTo];

  // Una sola llamada para todos los usuarios
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

function UserBadge({ userId }: { userId: string }) {
  const displayName = useOtherUserDisplayName(userId, { autoSubscribe: false });
  const photo = useOtherUserProfilePhoto(userId, { autoSubscribe: false });

  return (
    <div>
      <img src={photo} alt={displayName} />
      <span>{displayName}</span>
    </div>
  );
}
```

**Beneficios:**
- Antes: 10 tareas × 5 usuarios × 1 componente = **50 reads**
- Después: ~25 usuarios únicos = **25 suscripciones** (realtime)
- **50% reducción** + actualizaciones automáticas

---

## Plan de Migración Módulo por Módulo

### Fase 1: Alta Prioridad (Semana 1)

**Módulos más usados / mayor impacto**

#### 1.1 Profile Card Module ⭐⭐⭐

**Archivos:**
- `src/modules/profile-card/stores/profileCardStore.ts` ← **DEPRECAR**
- `src/modules/profile-card/components/molecules/ProfileHeader/ProfileHeader.tsx`
- `src/modules/profile-card/components/organisms/ProfileDialog.tsx`

**Migración:**
```typescript
// 1. Deprecar profileCardStore.ts (dejar comentado)
// 2. Actualizar ProfileDialog para usar useOtherUserData
// 3. Actualizar ProfileHeader (self-contained)
```

**Impacto estimado:**
- Reads reducidos: 70%
- Código eliminado: ~150 líneas

---

#### 1.2 Chat Module ⭐⭐⭐

**Archivos:**
- `src/modules/chat/components/ChatHeader.tsx`
- `src/modules/chat/components/MessageBubble.tsx` (sender info)
- `src/modules/chat/components/PublicChatView.tsx`

**Migración:**
```typescript
// MessageBubble.tsx - ANTES
function MessageBubble({ message }) {
  const [sender, setSender] = useState(null);
  useEffect(() => {
    getDoc(doc(db, 'users', message.senderId))...
  }, []);
}

// MessageBubble.tsx - DESPUÉS
function MessageBubble({ message }) {
  const senderName = useOtherUserDisplayName(message.senderId);
  const senderPhoto = useOtherUserProfilePhoto(message.senderId);
}
```

**Impacto estimado:**
- Reads reducidos: 80% (mensajes repetidos del mismo usuario)
- Código eliminado: ~100 líneas

---

#### 1.3 Tasks Module ⭐⭐⭐

**Archivos:**
- `src/modules/data-views/tasks/components/tables/TasksTable/TasksTable.tsx`
- `src/modules/data-views/tasks/components/tables/KanbanBoard/components/KanbanTaskCard.tsx`

**Migración:**
```typescript
// KanbanTaskCard.tsx - Mostrar avatares de colaboradores
function KanbanTaskCard({ task }) {
  useSubscribeToMultipleUsers([...task.LeadedBy, ...task.AssignedTo]);

  return (
    <div>
      {/* ... */}
      <AvatarGroup userIds={task.AssignedTo} />
    </div>
  );
}

function AvatarGroup({ userIds }) {
  return (
    <div className="flex -space-x-2">
      {userIds.map((userId) => (
        <UserAvatar key={userId} userId={userId} />
      ))}
    </div>
  );
}

function UserAvatar({ userId }) {
  const photo = useOtherUserProfilePhoto(userId, { autoSubscribe: false });
  const name = useOtherUserDisplayName(userId, { autoSubscribe: false });
  return <img src={photo} alt={name} title={name} />;
}
```

**Impacto estimado:**
- Reads reducidos: 60%
- Performance: Mejora significativa en tablas grandes

---

### Fase 2: Media Prioridad (Semana 2)

#### 2.1 Header Module ⭐⭐

**Archivos:**
- `src/modules/header/components/ui/AvatarDropdown/AvatarDropdown.tsx`

**Nota**: Verificar si usa `userDataStore` (usuario en sesión) o necesita otros usuarios.

---

#### 2.2 Share Task Module ⭐⭐

**Archivos:**
- `src/modules/shareTask/`
- `src/modules/dialogs/components/variants/ShareDialog.tsx`

**Migración:**
- Mostrar quien compartió la tarea
- Mostrar info de creador

---

#### 2.3 Config Module ⭐

**Archivos:**
- `src/modules/config/`

**Nota**: Principalmente usa `userDataStore` (propio usuario). Verificar si hay casos de otros usuarios.

---

### Fase 3: Baja Prioridad (Semana 3)

#### 3.1 Services Layer

**Archivos:**
- `src/services/userService.ts` ← **DEPRECAR funciones**
- `src/services/emailNotificationService.ts`

**Migración:**
- Deprecar funciones que hacen queries directas
- Documentar alternativas con hooks

---

#### 3.2 Utilities y Hooks

**Archivos:**
- `src/hooks/useDayReset.ts`
- `src/hooks/useAvailabilityStatus.ts`

**Revisar y migrar si hacen queries a otros usuarios.**

---

### Fase 4: Limpieza (Semana 4)

#### 4.1 Deprecar Código Antiguo

- Eliminar `profileCardStore.ts`
- Eliminar funciones deprecated de `userService.ts`
- Limpiar imports no usados

#### 4.2 Actualizar Documentación

- Actualizar README con nueva arquitectura
- Documentar patrones recomendados
- Agregar ejemplos en Storybook (si aplica)

#### 4.3 Métricas Finales

```typescript
// Ver impacto de la migración
const stats = useUsersDataStore.getState().getStats();
console.log('=== IMPACTO DE MIGRACIÓN ===');
console.log('Hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
console.log('Cache size:', stats.cacheSize, 'usuarios');
console.log('Suscripciones activas:', stats.activeSubscriptions);
console.log('Total queries:', stats.hits + stats.misses);
console.log('Queries evitadas:', stats.hits);
```

---

## Testing y Validación

### Test Plan por Módulo

Para cada módulo migrado:

#### 1. Tests Funcionales

```typescript
// Tests de componente
describe('UserCard', () => {
  it('should display user data correctly', async () => {
    render(<UserCard userId="user123" />);

    // Esperar a que cargue
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    render(<UserCard userId="user123" />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should handle errors', async () => {
    // Mock error
    render(<UserCard userId="invalid" />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

#### 2. Tests de Performance

```typescript
// Medir cache hit rate
test('cache hit rate should be > 80%', () => {
  // Renderizar múltiples componentes con mismo usuario
  render(
    <>
      <UserCard userId="user123" />
      <UserCard userId="user123" />
      <UserCard userId="user123" />
    </>
  );

  const stats = useUsersDataStore.getState().getStats();
  expect(stats.hitRate).toBeGreaterThan(0.8);
});
```

#### 3. Tests de Integración

```typescript
// Verificar que datos se actualizan en tiempo real
test('should update when user data changes in Firestore', async () => {
  render(<UserCard userId="user123" />);

  // Actualizar en Firestore
  await updateDoc(doc(db, 'users', 'user123'), {
    fullName: 'Jane Doe Updated',
  });

  // Verificar que se actualizó automáticamente
  await waitFor(() => {
    expect(screen.getByText('Jane Doe Updated')).toBeInTheDocument();
  });
});
```

### Validación Manual

**Checklist por módulo migrado:**

- [ ] Datos se muestran correctamente
- [ ] Loading states funcionan
- [ ] Error states funcionan
- [ ] No hay console errors
- [ ] No hay memory leaks
- [ ] Performance es igual o mejor
- [ ] Actualizaciones en tiempo real funcionan
- [ ] Cache hit rate > 70%

---

## Checklist de Migración

### Pre-Migración

- [ ] Leer documentación completa de usersDataStore
- [ ] Entender diferencia entre userDataStore (singular) y usersDataStore (plural)
- [ ] Identificar módulos a migrar
- [ ] Priorizar por impacto
- [ ] Crear branch de migración

### Durante Migración (Por Módulo)

- [ ] Identificar queries directas a Firestore
- [ ] Identificar listeners manuales
- [ ] Elegir hook apropiado (displayName, profilePhoto, estado completo, etc.)
- [ ] Reemplazar código
- [ ] Eliminar useEffect innecesarios
- [ ] Eliminar useState innecesarios
- [ ] Testing funcional
- [ ] Testing de performance
- [ ] Code review
- [ ] Merge a main

### Post-Migración (Por Módulo)

- [ ] Verificar en producción
- [ ] Monitorear métricas de Firestore (reducción de reads)
- [ ] Verificar cache hit rate (> 70%)
- [ ] Documentar aprendizajes
- [ ] Actualizar documentación si es necesario

### Finalización

- [ ] Todos los módulos migrados
- [ ] Código antiguo eliminado
- [ ] Documentación actualizada
- [ ] Métricas de impacto documentadas
- [ ] Celebrar 🎉

---

## Troubleshooting de Migración

### Error: "User data is null"

**Causa**: El componente se renderiza antes de que se complete la suscripción.

**Solución**:
```typescript
// Usar el hook compuesto que maneja loading
const { userData, isLoading } = useOtherUserState(userId);

if (isLoading) return <Skeleton />;
if (!userData) return null;
```

---

### Error: "Too many re-renders"

**Causa**: Estás usando el hook completo cuando solo necesitas un campo.

**Solución**:
```typescript
// ❌ INCORRECTO
const userData = useOtherUserData(userId);
return <span>{userData?.fullName}</span>;

// ✅ CORRECTO
const displayName = useOtherUserDisplayName(userId);
return <span>{displayName}</span>;
```

---

### Performance no mejoró

**Causa**: Cache hit rate muy bajo.

**Solución**:
```typescript
// Ver estadísticas
const stats = useUsersDataStore.getState().getStats();
console.log('Hit rate:', stats.hitRate);

// Si < 50%, verificar:
// 1. Usuarios se repiten entre componentes?
// 2. TTL es muy corto?
// 3. Invalidaciones innecesarias?
```

---

### Memory leaks en tests

**Causa**: Suscripciones no se limpian en tests.

**Solución**:
```typescript
afterEach(() => {
  // Limpiar todas las suscripciones después de cada test
  useUsersDataStore.getState().unsubscribeAll();
});
```

---

## Recursos Adicionales

- [Documentación completa de usersDataStore](./USERS_DATA_STORE.md)
- [Documentación de userDataStore (usuario en sesión)](./USER_DATA_STORE.md)
- [Arquitectura de caching](../src/shared/utils/request-cache.ts)

---

## Métricas de Éxito

Al completar la migración, deberías ver:

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Reads a Firestore | ~500/día | ~150/día | **70%** |
| Cache hit rate | N/A | > 80% | ✅ |
| Código duplicado | ~400 líneas | 0 líneas | **100%** |
| Actualizaciones realtime | No | Sí | ✅ |
| Memory leaks | Posibles | No | ✅ |

---

**¡Buena suerte con la migración! 🚀**

Si tienes dudas, consulta la documentación o revisa los ejemplos en este documento.
