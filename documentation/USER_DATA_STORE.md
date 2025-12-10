# UserDataStore - Single Source of Truth para Datos de Usuario

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Flujo de Datos](#flujo-de-datos)
4. [API del Store](#api-del-store)
5. [Guía de Uso](#guía-de-uso)
6. [ConfigModal - Módulo de Referencia](#configmodal---módulo-de-referencia)
7. [Migración de Código Existente](#migración-de-código-existente)
8. [Patrones Recomendados](#patrones-recomendados)
9. [Troubleshooting](#troubleshooting)

---

## Descripción General

`userDataStore` es un **Zustand store** que centraliza todos los datos del usuario en sesión. Actúa como **Single Source of Truth** para evitar:

- ❌ Múltiples queries a Firestore para los mismos datos
- ❌ Inconsistencias entre componentes
- ❌ Re-renders innecesarios
- ❌ Listeners duplicados de `onSnapshot`

### Beneficios

| Antes | Después |
|-------|---------|
| Cada componente hacía su propio `getDoc()` | Un solo `onSnapshot` para todos |
| Datos desincronizados entre Header y ProfileCard | Todos leen del mismo store |
| Cache manual en cada módulo | Cache centralizado con TTL |
| Context API con re-renders en cascada | Zustand con selectores optimizados |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        DashboardLayout                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           useUserDataSubscription() ← Inicializa          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      userDataStore (Zustand)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   State     │  │   Actions   │  │   Firestore Listener    │  │
│  │  userData   │  │  subscribe  │  │   onSnapshot(/users/X)  │  │
│  │  isLoading  │  │  invalidate │  │          ↓              │  │
│  │  error      │  │  updateLocal│  │   Auto-sync on change   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │   Header   │     │ ConfigModal│     │ ProfileCard│
    │ (consume)  │     │  (update)  │     │ (consume)  │
    └────────────┘     └────────────┘     └────────────┘
```

### Archivos Clave

```
src/
├── stores/
│   └── userDataStore.ts          # Store principal (Zustand)
├── hooks/
│   └── useUserDataSubscription.ts # Hook de inicialización
└── modules/
    └── header/
        └── hooks/
            └── useFirestoreUser.ts # Hook legacy (wrapper)
```

---

## Flujo de Datos

### 1. Inicialización (Login)

```
Usuario hace login
       ↓
AuthProvider sincroniza con Firebase (isSynced = true)
       ↓
DashboardLayout monta
       ↓
useUserDataSubscription() se ejecuta
       ↓
userDataStore.subscribe(userId) se llama
       ↓
onSnapshot se establece en Firestore
       ↓
Datos llegan y se guardan en store + sessionStorage cache
```

### 2. Actualización (ConfigModal guarda)

```
Usuario edita perfil en ConfigModal
       ↓
useProfileForm.handleSubmit() guarda en Firestore
       ↓
ConfigDialog.handleSuccess() se ejecuta
       ↓
userDataStore.invalidateCache() limpia sessionStorage
       ↓
onSnapshot detecta el cambio automáticamente
       ↓
Store se actualiza
       ↓
Todos los componentes suscritos re-renderizan
```

### 3. Consumo (Componentes leen datos)

```
Componente necesita nombre de usuario
       ↓
Usa useUserDisplayName() o useUserDataStore()
       ↓
Zustand retorna el valor del store
       ↓
Solo re-renderiza si ese valor específico cambió
```

---

## API del Store

### State

```typescript
interface UserDataState {
  userData: UserData | null;      // Datos completos del usuario
  isLoading: boolean;             // Cargando datos iniciales
  error: Error | null;            // Error si ocurrió
  lastFetchTime: number | null;   // Timestamp de última actualización
  isRefreshing: boolean;          // Refrescando (no es carga inicial)
  currentUserId: string | null;   // ID del usuario suscrito
  isSubscribed: boolean;          // Si hay suscripción activa
}
```

### Actions

```typescript
interface UserDataActions {
  subscribe: (userId: string) => void;              // Inicia suscripción
  unsubscribe: () => void;                          // Cancela suscripción
  invalidateCache: () => void;                      // Limpia cache
  updateLocalData: (partial: Partial<UserData>) => void; // Update optimista
  getDisplayName: () => string;                     // Helper para nombre
  getProfilePhoto: () => string;                    // Helper para foto
  reset: () => void;                                // Limpia todo
}
```

### Selector Hooks (Optimizados)

```typescript
// Hooks pre-construidos para casos comunes
import { 
  useUserDisplayName,    // Solo el nombre
  useUserProfilePhoto,   // Solo la foto
  useUserStatus,         // Solo el estado
  useUserEmail,          // Solo el email
  useUserDataLoading,    // Solo isLoading
  useUserData,           // Datos completos
} from '@/stores/userDataStore';
```

---

## Guía de Uso

### ✅ Caso 1: Mostrar nombre del usuario

```tsx
// ✅ CORRECTO - Usa selector optimizado
import { useUserDisplayName } from '@/stores/userDataStore';

function WelcomeMessage() {
  const displayName = useUserDisplayName();
  return <h1>Hola, {displayName}</h1>;
}
```

### ✅ Caso 2: Mostrar avatar del usuario

```tsx
// ✅ CORRECTO - Usa selector optimizado
import { useUserProfilePhoto } from '@/stores/userDataStore';

function UserAvatar() {
  const profilePhoto = useUserProfilePhoto();
  return <img src={profilePhoto} alt="Avatar" />;
}
```

### ✅ Caso 3: Necesitar múltiples campos

```tsx
// ✅ CORRECTO - Selector personalizado con useShallow
import { useUserDataStore } from '@/stores/userDataStore';
import { useShallow } from 'zustand/react/shallow';

function UserCard() {
  const { fullName, role, status } = useUserDataStore(
    useShallow((state) => ({
      fullName: state.userData?.fullName || 'Usuario',
      role: state.userData?.role || '',
      status: state.userData?.status || 'Disponible',
    }))
  );

  return (
    <div>
      <h2>{fullName}</h2>
      <p>{role}</p>
      <span>{status}</span>
    </div>
  );
}
```

### ✅ Caso 4: Acceder desde fuera de React

```tsx
// ✅ CORRECTO - Para funciones utilitarias o event handlers
import { useUserDataStore } from '@/stores/userDataStore';

function logUserAction(action: string) {
  const userName = useUserDataStore.getState().getDisplayName();
  console.log(`${userName} realizó: ${action}`);
}
```

### ✅ Caso 5: Invalidar cache después de actualizar

```tsx
// ✅ CORRECTO - En el callback de éxito después de guardar
import { useUserDataStore } from '@/stores/userDataStore';

function handleSaveSuccess() {
  // Después de guardar en Firestore...
  useUserDataStore.getState().invalidateCache();
}
```

### ❌ Caso INCORRECTO: Query directa a Firestore

```tsx
// ❌ INCORRECTO - No hagas esto
import { doc, getDoc } from 'firebase/firestore';

function BadComponent() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // ❌ Query directa - crea duplicación
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, 'users', userId));
      setUser(snap.data());
    };
    fetchUser();
  }, [userId]);
}
```

### ❌ Caso INCORRECTO: Suscribir selector que retorna objeto nuevo

```tsx
// ❌ INCORRECTO - Esto causa re-renders infinitos
function BadComponent() {
  // ❌ Cada render crea un nuevo objeto
  const user = useUserDataStore((state) => ({
    name: state.userData?.fullName,
    photo: state.userData?.profilePhoto,
  }));
}

// ✅ CORRECTO - Usa useShallow
import { useShallow } from 'zustand/react/shallow';

function GoodComponent() {
  const user = useUserDataStore(
    useShallow((state) => ({
      name: state.userData?.fullName,
      photo: state.userData?.profilePhoto,
    }))
  );
}
```

---

## Migración de Código Existente

### Desde `useFirestoreUser` (legacy)

```tsx
// ANTES (aún funciona por compatibilidad)
import { useFirestoreUser } from '@/modules/header/hooks';
const { firestoreUser, loading } = useFirestoreUser();
const name = firestoreUser?.fullName;

// DESPUÉS (recomendado)
import { useUserDisplayName, useUserDataLoading } from '@/stores/userDataStore';
const name = useUserDisplayName();
const loading = useUserDataLoading();
```

### Desde queries directas a Firestore

```tsx
// ANTES
useEffect(() => {
  const unsubscribe = onSnapshot(doc(db, 'users', userId), (snap) => {
    setUserData(snap.data());
  });
  return () => unsubscribe();
}, [userId]);

// DESPUÉS
// Ya no necesitas nada - el store ya tiene la suscripción activa
const userData = useUserDataStore((state) => state.userData);
```

### Desde Context personalizado

```tsx
// ANTES
const { userData } = useUserContext();

// DESPUÉS
const userData = useUserData(); // Hook de userDataStore
```

---

## Patrones Recomendados

### 1. Componentes que solo leen

```tsx
// Para componentes de presentación, usa los selector hooks
function HeaderUserInfo() {
  const name = useUserDisplayName();
  const photo = useUserProfilePhoto();
  const status = useUserStatus();
  
  return (/* UI */);
}
```

### 2. Componentes que actualizan

```tsx
// Para formularios o acciones que modifican datos
function ProfileEditor() {
  const invalidateCache = useUserDataStore((state) => state.invalidateCache);
  
  const handleSave = async (data) => {
    await updateDoc(doc(db, 'users', userId), data);
    invalidateCache(); // El onSnapshot actualiza automáticamente
  };
}
```

### 3. Optimistic Updates (opcional)

```tsx
// Para UI más responsiva, actualiza localmente primero
function QuickStatusChange() {
  const updateLocalData = useUserDataStore((state) => state.updateLocalData);
  
  const handleStatusChange = async (newStatus) => {
    // 1. Update local inmediato (optimistic)
    updateLocalData({ status: newStatus });
    
    // 2. Persistir en Firestore
    await updateDoc(doc(db, 'users', userId), { status: newStatus });
    // El onSnapshot confirmará el cambio
  };
}
```

### 4. Verificaciones de estado

```tsx
// Para mostrar loaders o estados de error
function UserDataWrapper({ children }) {
  const isLoading = useUserDataLoading();
  const error = useUserDataStore((state) => state.error);
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return children;
}
```

---

## Troubleshooting

### Los datos no se actualizan después de guardar

1. Verifica que estés llamando `invalidateCache()` después de guardar
2. El `onSnapshot` debería detectar el cambio automáticamente
3. Revisa la consola por errores de Firestore

### El store está vacío

1. Verifica que `useUserDataSubscription()` esté en `DashboardLayoutContent`
2. Verifica que `AuthContext.isSynced` sea `true`
3. Revisa si hay errores en la suscripción

### Re-renders excesivos

1. Usa `useShallow` cuando selecciones múltiples campos
2. Usa los selector hooks pre-construidos cuando sea posible
3. Evita crear objetos nuevos dentro del selector

### Datos desincronizados entre pestañas

El store usa `sessionStorage` que es por pestaña. Cada pestaña tiene su propia suscripción a Firestore, por lo que se sincronizan automáticamente.

---

## Tipos de Datos

```typescript
// Estructura completa de UserData
interface UserData {
  // Identificación
  userId: string;
  email?: string;
  
  // Información personal
  fullName?: string;
  displayName?: string; // Legacy
  role?: string;
  description?: string;
  birthDate?: string;
  phone?: string;
  city?: string;
  gender?: string;
  portfolio?: string;
  
  // Media
  profilePhoto?: string;
  coverPhoto?: string;
  
  // Profesional
  stack?: string[];
  teams?: string[];
  
  // Estado
  status?: string;
  
  // Configuraciones
  notificationsEnabled?: boolean;
  darkMode?: boolean;
  emailAlerts?: boolean;
  taskReminders?: boolean;
  highContrast?: boolean;
  grayscale?: boolean;
  soundEnabled?: boolean;
  emailPreferences?: UserEmailPreferences;
  
  // Social
  socialLinks?: UserSocialLinks;
  
  // Metadata
  lastUpdated?: string;
  createdAt?: string;
}
```

---

## Resumen

| Necesito... | Usar... |
|-------------|---------|
| Solo el nombre | `useUserDisplayName()` |
| Solo la foto | `useUserProfilePhoto()` |
| Solo el estado | `useUserStatus()` |
| Múltiples campos | `useUserDataStore()` + `useShallow` |
| Fuera de React | `useUserDataStore.getState()` |
| Invalidar cache | `invalidateCache()` |
| Update optimista | `updateLocalData()` |

**Regla de oro**: Nunca hagas `getDoc(doc(db, 'users', currentUserId))` para datos del usuario en sesión. Siempre usa el store.
