# Guía de Migración: Flujo de Datos ChatSidebar Monolítico → Modularizado

## 📊 Análisis Exhaustivo del Consumo y Actualización de Estado

### Objetivo
Documentar **todas las fuentes de datos** del ChatSidebar monolítico actual para reconectarlas correctamente al módulo modularizado en `/chatsidebarMODULARIZED`.

---

## 🔍 PARTE 1: FUENTES DE DATOS EXTERNAS

### 1. Clerk (Autenticación)
**Hook:** `useUser()`  
**Ubicación actual:** `@clerk/nextjs`

```typescript
// CONSUMO ACTUAL
const { user } = useUser();
// user.id → Identificador único
// user.firstName → Nombre para mensajes
// user.fullName → Nombre completo

// MIGRACIÓN
// Crear: src/features/chat/hooks/useAuth.ts
export function useChatAuth() {
  const { user } = useUser();
  return {
    userId: user?.id || '',
    userName: user?.firstName || user?.fullName || 'Usuario',
    userAvatar: user?.imageUrl || '',
  };
}
```

### 2. AuthContext (Permisos)
**Hook:** `useAuth()`  
**Ubicación actual:** `@/contexts/AuthContext`

```typescript
// CONSUMO ACTUAL
const { isAdmin, isLoading } = useAuth();

// MIGRACIÓN
// Integrar en el mismo hook de autenticación
export function useChatAuth() {
  const { user } = useUser();
  const { isAdmin, isLoading } = useAuthContext();
  
  return {
    userId: user?.id || '',
    userName: user?.firstName || 'Usuario',
    isAdmin,
    isAuthLoading: isLoading,
  };
}
```

---

## 🗄️ PARTE 2: STORES GLOBALES (Zustand)

### 1. useSidebarStateStore
**Ubicación:** `@/stores/sidebarStateStore`

```typescript
// ESTRUCTURA ACTUAL
interface SidebarStateStore {
  chatSidebar: {
    task: Task;
    clientName: string;
    isOpen: boolean;
  };
}

// CONSUMO ACTUAL
const chatSidebar = useSidebarStateStore(useShallow(state => state.chatSidebar));
const task = chatSidebar.task;
const clientName = chatSidebar.clientName;

// DATOS DE TASK CONSUMIDOS:
task.id              // ID único de la tarea
task.name            // Nombre de la tarea
task.description     // Descripción
task.status          // Estado: 'Por Iniciar', 'En Proceso', etc.
task.priority        // Prioridad
task.project         // Nombre del proyecto
task.AssignedTo      // Array de user IDs asignados
task.LeadedBy        // Array de user IDs responsables
task.CreatedBy       // User ID del creador
task.startDate       // Fecha de inicio
task.endDate         // Fecha de fin

// MIGRACIÓN
// Crear: src/features/chat/stores/chatSidebarStore.ts
interface ChatSidebarState {
  currentTask: Task | null;
  clientName: string;
  isOpen: boolean;
  
  setTask: (task: Task, clientName: string) => void;
  setIsOpen: (isOpen: boolean) => void;
  clear: () => void;
}
```

### 2. useDataStore (Mensajes)
**Ubicación:** `@/stores/dataStore`

```typescript
// ESTRUCTURA ACTUAL
interface DataStore {
  messages: {
    [taskId: string]: Message[];
  };
  
  addMessage: (taskId: string, message: Message) => void;
  updateMessage: (taskId: string, clientId: string, updates: Partial<Message>) => void;
  deleteMessage: (taskId: string, messageId: string) => void;
  setMessages: (taskId: string, messages: Message[]) => void;
}

// CONSUMO ACTUAL
const dataStore = useDataStore.getState();
const { addMessage, updateMessage } = dataStore;

// Agregar mensaje optimista
addMessage(task.id, optimisticMessage);

// Actualizar después de enviar
updateMessage(task.id, clientId, { id: docRef.id, isPending: false });

// MIGRACIÓN
// Ya existe: src/features/chat/stores/chatStore.ts
// PERO necesita adaptarse para multi-task:

interface ChatStore {
  messagesByTask: {
    [taskId: string]: {
      messages: Message[];
      hasMore: boolean;
      isLoading: boolean;
      lastDoc: QueryDocumentSnapshot | null;
    };
  };
  
  currentTaskId: string | null;
  editingMessageId: string | null;
  replyingTo: Message | null;
  
  // Acciones
  setCurrentTask: (taskId: string) => void;
  addMessage: (taskId: string, message: Message) => void;
  updateMessage: (taskId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (taskId: string, messageId: string) => void;
  setMessages: (taskId: string, messages: Message[]) => void;
  prependMessages: (taskId: string, messages: Message[]) => void;
  
  // Paginación
  setHasMore: (taskId: string, hasMore: boolean) => void;
  setIsLoading: (taskId: string, isLoading: boolean) => void;
  setLastDoc: (taskId: string, lastDoc: QueryDocumentSnapshot | null) => void;
  
  // Acciones UI
  setEditingId: (id: string | null) => void;
  setReplyingTo: (message: Message | null) => void;
  clearActions: () => void;
}
```

---

## 🔌 PARTE 3: HOOKS PERSONALIZADOS

### 1. useEncryption
**Ubicación:** `@/hooks/useEncryption`

```typescript
// CONSUMO ACTUAL
const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

// Al enviar
const encrypted = await encryptMessage(plainText);

// Al recibir
const decrypted = await decryptMessage(encryptedText);

// MIGRACIÓN
// Crear: src/features/chat/hooks/useEncryption.ts
export function useEncryption(taskId: string) {
  const encryptMessage = useCallback(async (text: string): Promise<string> => {
    // AES encryption con taskId como parte de la clave
    return encryptedText;
  }, [taskId]);
  
  const decryptMessage = useCallback(async (text: string): Promise<string> => {
    // AES decryption
    return decryptedText;
  }, [taskId]);
  
  return { encryptMessage, decryptMessage };
}
```

### 2. useMessagePagination
**Ubicación:** `@/hooks/useMessagePagination`

```typescript
// CONSUMO ACTUAL
const {
  messages,           // Message[]
  groupedMessages,    // { date: Date; messages: Message[] }[]
  isLoading,          // boolean
  isLoadingMore,      // boolean
  hasMore,            // boolean
  loadMoreMessages,   // () => Promise<void>
} = useMessagePagination({
  taskId: task?.id || '',
  pageSize: 10,
  decryptMessage,
  onNewMessage: handleNewMessage,
});

// IMPLEMENTACIÓN ACTUAL:
// 1. onSnapshot para real-time updates
// 2. Carga inicial de 10 mensajes más recientes
// 3. Desencriptación automática
// 4. Agrupación por fecha
// 5. Paginación inversa (más antiguos al cargar más)

// MIGRACIÓN
// Actualizar: src/features/chat/hooks/useMessagePagination.ts
export function useMessagePagination(taskId: string, pageSize = 10) {
  const { decryptMessage } = useEncryption(taskId);
  const chatStore = useChatStore();
  
  const taskData = chatStore.messagesByTask[taskId];
  const messages = taskData?.messages || [];
  const hasMore = taskData?.hasMore ?? true;
  const isLoadingMore = taskData?.isLoading ?? false;
  
  // Real-time listener
  useEffect(() => {
    if (!taskId) return;
    
    const messagesRef = collection(db, 'tasks', taskId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(pageSize));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Desencriptar en batch
      const decrypted = await Promise.all(
        docs.map(async (msg) => ({
          ...msg,
          text: msg.text ? await decryptMessage(msg.text) : null
        }))
      );
      
      chatStore.setMessages(taskId, decrypted.reverse());
      chatStore.setLastDoc(taskId, snapshot.docs[snapshot.docs.length - 1]);
    });
    
    return () => unsubscribe();
  }, [taskId, pageSize]);
  
  const loadMoreMessages = useCallback(async () => {
    const lastDoc = taskData?.lastDoc;
    if (!hasMore || isLoadingMore || !lastDoc) return;
    
    chatStore.setIsLoading(taskId, true);
    
    const messagesRef = collection(db, 'tasks', taskId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );
    
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const decrypted = await Promise.all(
      docs.map(async (msg) => ({
        ...msg,
        text: msg.text ? await decryptMessage(msg.text) : null
      }))
    );
    
    chatStore.prependMessages(taskId, decrypted.reverse());
    chatStore.setLastDoc(taskId, snapshot.docs[snapshot.docs.length - 1]);
    chatStore.setHasMore(taskId, docs.length === pageSize);
    chatStore.setIsLoading(taskId, false);
  }, [taskId, pageSize, hasMore, isLoadingMore, taskData]);
  
  return {
    messages,
    loadMoreMessages,
    hasMore,
    isLoadingMore,
  };
}
```

### 3. useMessageActions
**Ubicación:** `@/hooks/useMessageActions`

```typescript
// CONSUMO ACTUAL
const {
  isSending,
  sendMessage,
  editMessage,
  deleteMessage,
  sendTimeMessage,
} = useMessageActions({
  task,
  encryptMessage,
  addOptimisticMessage: (message) => addMessage(task.id, message),
  updateOptimisticMessage: (clientId, updates) => updateMessage(task.id, clientId, updates),
});

// MIGRACIÓN
// Crear: src/features/chat/hooks/useMessageActions.ts
export function useMessageActions(taskId: string) {
  const { encryptMessage } = useEncryption(taskId);
  const chatStore = useChatStore();
  const [isSending, setIsSending] = useState(false);
  
  const sendMessage = useCallback(async (messageData: Partial<Message>) => {
    setIsSending(true);
    const clientId = crypto.randomUUID();
    
    // Optimistic update
    const optimisticMessage: Message = {
      ...messageData as Message,
      id: `temp-${clientId}`,
      isPending: true,
      hasError: false,
      timestamp: Timestamp.now(),
    };
    chatStore.addMessage(taskId, optimisticMessage);
    
    try {
      const encrypted = messageData.text 
        ? await encryptMessage(messageData.text) 
        : null;
      
      const messagesRef = collection(db, 'tasks', taskId, 'messages');
      const docRef = await addDoc(messagesRef, {
        ...messageData,
        text: encrypted,
        timestamp: serverTimestamp(),
        read: false,
      });
      
      chatStore.updateMessage(taskId, `temp-${clientId}`, {
        id: docRef.id,
        isPending: false,
      });
      
    } catch (error) {
      chatStore.updateMessage(taskId, `temp-${clientId}`, {
        hasError: true,
        isPending: false,
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [taskId, encryptMessage, chatStore]);
  
  return {
    isSending,
    sendMessage,
    editMessage: async (id, text) => { /* ... */ },
    deleteMessage: async (id) => { /* ... */ },
    sendTimeMessage: async (...args) => { /* ... */ },
  };
}
```

### 4. useTimerStoreHook
**Ubicación:** `@/hooks/useTimerStore`

```typescript
// CONSUMO ACTUAL
const {
  startTimer,
  pauseTimer,
  resetTimer,
  finalizeTimer,
  isTimerRunning,
  timerSeconds,
  isRestoringTimer,
  isInitializing,
} = useTimerStoreHook(task?.id || '', user?.id || '');

// MIGRACIÓN
// Crear: src/features/chat/hooks/useTimer.ts
export function useTimer(taskId: string, userId: string) {
  const timerStore = useTimerStore();
  const timerKey = `${taskId}_${userId}`;
  const timer = timerStore.timers.get(timerKey);
  
  // Persistencia en localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`timer_${timerKey}`);
    if (saved) {
      timerStore.restoreTimer(taskId, userId, JSON.parse(saved));
    }
  }, [taskId, userId]);
  
  // Auto-save
  useEffect(() => {
    if (timer) {
      localStorage.setItem(`timer_${timerKey}`, JSON.stringify(timer));
    }
  }, [timer, timerKey]);
  
  // Tick cada segundo
  useEffect(() => {
    if (!timer?.isRunning) return;
    
    const interval = setInterval(() => {
      timerStore.tick(taskId, userId);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timer?.isRunning, taskId, userId]);
  
  return {
    startTimer: () => timerStore.startTimer(taskId, userId),
    pauseTimer: () => timerStore.pauseTimer(taskId, userId),
    resetTimer: () => timerStore.resetTimer(taskId, userId),
    finalizeTimer: () => timerStore.finalizeTimer(taskId, userId),
    isTimerRunning: timer?.isRunning ?? false,
    timerSeconds: timer?.seconds ?? 0,
  };
}
```

---

## 🔄 PARTE 4: FLUJOS DE ACTUALIZACIÓN DE ESTADO

### Flujo 1: Envío de Mensaje

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario escribe mensaje y presiona Enter                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. InputChat.handleSend()                                   │
│    - Validar texto/archivo                                  │
│    - Generar clientId único                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. OPTIMISTIC UPDATE                                        │
│    chatStore.addMessage(taskId, {                           │
│      id: `temp-${clientId}`,                                │
│      isPending: true,                                       │
│      hasError: false,                                       │
│      ...messageData                                         │
│    })                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. UI se actualiza INMEDIATAMENTE                           │
│    - Mensaje aparece con spinner "Enviando..."             │
│    - Input se limpia                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Encriptar mensaje                                        │
│    const encrypted = await encryptMessage(text)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Enviar a Firestore                                       │
│    const docRef = await addDoc(messagesRef, {               │
│      text: encrypted,                                       │
│      timestamp: serverTimestamp(),                          │
│      ...                                                    │
│    })                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Actualizar mensaje con ID real                          │
│    chatStore.updateMessage(taskId, `temp-${clientId}`, {    │
│      id: docRef.id,                                         │
│      isPending: false                                       │
│    })                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. UI se actualiza                                          │
│    - Spinner desaparece                                     │
│    - Checkmark aparece                                      │
└─────────────────────────────────────────────────────────────┘

SI HAY ERROR:
┌─────────────────────────────────────────────────────────────┐
│ chatStore.updateMessage(taskId, `temp-${clientId}`, {       │
│   hasError: true,                                           │
│   isPending: false                                          │
│ })                                                          │
│ → UI muestra ícono de error + botón "Reintentar"           │
└─────────────────────────────────────────────────────────────┘
```

### Flujo 2: Real-time Updates (Nuevo Mensaje)

```
┌─────────────────────────────────────────────────────────────┐
│ Otro usuario envía mensaje en Firestore                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ onSnapshot listener detecta cambio                          │
│ (en useMessagePagination)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Desencriptar mensaje                                        │
│ const decrypted = await decryptMessage(msg.text)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Actualizar store                                            │
│ chatStore.setMessages(taskId, [...messages, newMessage])    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ UI se actualiza automáticamente                             │
│ - Nuevo mensaje aparece con animación                      │
│ - Scroll automático al final                               │
└─────────────────────────────────────────────────────────────┘
```

### Flujo 3: Paginación (Cargar Más)

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario hace scroll arriba y click "Cargar más"            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ loadMoreMessages()                                          │
│ - Verificar hasMore y !isLoadingMore                       │
│ - chatStore.setIsLoading(taskId, true)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Query Firestore con startAfter(lastDoc)                    │
│ - Obtener siguiente página (10 mensajes)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Desencriptar batch                                          │
│ const decrypted = await Promise.all(...)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Prepend mensajes (agregar al inicio)                       │
│ chatStore.prependMessages(taskId, decrypted.reverse())      │
│ chatStore.setLastDoc(taskId, newLastDoc)                   │
│ chatStore.setHasMore(taskId, docs.length === pageSize)     │
│ chatStore.setIsLoading(taskId, false)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ UI se actualiza                                             │
│ - Mensajes antiguos aparecen con animación                 │
│ - Scroll se mantiene en posición relativa                  │
│ - Botón "Cargar más" desaparece si !hasMore                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 PARTE 5: CHECKLIST DE MIGRACIÓN

### Store Principal (chatStore.ts)

```typescript
// ACTUALIZAR: src/features/chat/stores/chatStore.ts

interface ChatStore {
  // ✅ Estado multi-task
  messagesByTask: {
    [taskId: string]: {
      messages: Message[];
      hasMore: boolean;
      isLoading: boolean;
      lastDoc: QueryDocumentSnapshot | null;
    };
  };
  
  currentTaskId: string | null;
  editingMessageId: string | null;
  replyingTo: Message | null;
  
  // ✅ Acciones de mensajes
  setCurrentTask: (taskId: string) => void;
  addMessage: (taskId: string, message: Message) => void;
  updateMessage: (taskId: string, messageId: string, updates) => void;
  deleteMessage: (taskId: string, messageId: string) => void;
  setMessages: (taskId: string, messages: Message[]) => void;
  prependMessages: (taskId: string, messages: Message[]) => void;
  
  // ✅ Acciones de paginación
  setHasMore: (taskId: string, hasMore: boolean) => void;
  setIsLoading: (taskId: string, isLoading: boolean) => void;
  setLastDoc: (taskId: string, lastDoc: QueryDocumentSnapshot | null) => void;
  
  // ✅ Acciones UI
  setEditingId: (id: string | null) => void;
  setReplyingTo: (message: Message | null) => void;
  clearActions: () => void;
  
  // ✅ Getters
  getCurrentMessages: () => Message[];
  getCurrentHasMore: () => boolean;
  getCurrentIsLoading: () => boolean;
}
```

### Hooks a Crear/Actualizar

- [ ] `src/features/chat/hooks/useAuth.ts` - Wrapper de Clerk + AuthContext
- [ ] `src/features/chat/hooks/useEncryption.ts` - Encriptación AES
- [ ] `src/features/chat/hooks/useMessagePagination.ts` - Actualizar para usar nuevo store
- [ ] `src/features/chat/hooks/useMessageActions.ts` - CRUD con optimistic UI
- [ ] `src/features/chat/hooks/useTimer.ts` - Cronómetro con persistencia
- [ ] `src/features/chat/hooks/useMessageDrag.ts` - Drag-to-reply
- [ ] `src/features/chat/hooks/useGeminiSummary.ts` - Resúmenes IA

### Stores Adicionales

- [ ] `src/features/chat/stores/chatSidebarStore.ts` - Estado del sidebar (task, clientName, isOpen)
- [ ] `src/features/chat/stores/timerStore.ts` - Estado del cronómetro

### Services

- [ ] `src/features/chat/services/firebaseService.ts` - Actualizar con db real
- [ ] `src/features/chat/services/encryptionService.ts` - Lógica de encriptación
- [ ] `src/features/chat/services/geminiService.ts` - Integración con Gemini AI

---

## 🎯 RESUMEN EJECUTIVO

### Datos que ENTRAN al ChatSidebar:
1. **Usuario actual** (Clerk) → userId, userName, userAvatar
2. **Permisos** (AuthContext) → isAdmin
3. **Tarea actual** (sidebarStateStore) → Task object completo
4. **Mensajes** (Firestore real-time) → Array de mensajes encriptados
5. **Estado del timer** (localStorage + timerStore) → segundos, isRunning

### Datos que SALEN del ChatSidebar:
1. **Mensajes nuevos** → Firestore (encriptados)
2. **Mensajes editados** → Firestore (encriptados)
3. **Mensajes eliminados** → Firestore (deleted)
4. **Tiempo registrado** → Firestore (mensaje especial con hours)
5. **Estado del timer** → localStorage (persistencia)

### Flujo de Estado:
```
Firestore → onSnapshot → Desencriptar → chatStore → UI
UI → Optimistic Update → chatStore → Encriptar → Firestore → Update chatStore
```

### Prioridad de Migración:
1. **Alta**: chatStore multi-task, useMessagePagination, useMessageActions
2. **Media**: useEncryption, useAuth, chatSidebarStore
3. **Baja**: useTimer, useMessageDrag, useGeminiSummary
