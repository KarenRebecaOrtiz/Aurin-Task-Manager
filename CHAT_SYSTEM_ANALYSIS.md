# Análisis Completo del Sistema de Chat - Aurin Task Manager

## 📋 Índice
1. [Visión General](#visión-general)
2. [ChatSidebar - Componente Principal](#chatsidebar)
3. [InputChat - Sistema de Entrada](#inputchat)
4. [TimerPanel - Gestión de Tiempo](#timerpanel)
5. [Flujos de Datos Principales](#flujos-de-datos)

---

## 🎯 Visión General

### Propósito del Sistema
El sistema de chat es un **sidebar lateral completo** que permite:
- **Comunicación contextual** por tarea
- **Registro de tiempo** automático y manual
- **Asistencia IA** con Gemini y ChatGPT
- **Colaboración** con menciones, respuestas y archivos

### Arquitectura
```
ChatSidebar (Contenedor)
├── Header (Info de tarea + Resumen IA)
├── Chat Area (Mensajes paginados)
│   ├── MessageItem (Mensaje individual)
│   ├── DatePill (Separador de fecha)
│   └── LoadMoreButton (Paginación)
└── InputChat (Entrada de mensajes)
    ├── Editor Tiptap (Rich text)
    ├── Toolbar (Formato)
    └── TimerPanel (Tiempo)
```

---

## 🏗️ ChatSidebar - Componente Principal

**Ubicación:** `/src/components/ChatSidebar.tsx` (2018 líneas)

### Hooks Principales

```typescript
// Autenticación
const { user } = useUser();
const { isAdmin } = useAuth();

// Estado global
const chatSidebar = useSidebarStateStore();
const dataStore = useDataStore.getState();

// Funcionalidades
const { encryptMessage, decryptMessage } = useEncryption(taskId);
const { messages, hasMore, loadMoreMessages } = useMessagePagination();
const { sendMessage, editMessage, deleteMessage } = useMessageActions();
const { startTimer, pauseTimer, timerSeconds } = useTimerStoreHook();
const { generateSummary } = useGeminiSummary(taskId);
```

### Interfaz Message

```typescript
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;
  hours?: number;              // Tiempo registrado
  imageUrl?: string | null;    // Imagen
  fileUrl?: string | null;     // Archivo
  isPending?: boolean;         // Enviando
  hasError?: boolean;          // Error
  clientId: string;            // ID temporal
  replyTo?: { ... } | null;    // Respuesta
  isSummary?: boolean;         // Resumen IA
}
```

### Características Clave

#### 1. Paginación Inversa
- Carga 10 mensajes más recientes primero
- Botón "Cargar más" para mensajes antiguos
- Animación de entrada para nuevos chunks

#### 2. Encriptación End-to-End
- Todos los mensajes se encriptan con AES
- Clave única por tarea
- Desencriptación en cliente

#### 3. Optimistic UI
```typescript
// Agregar mensaje inmediatamente
addMessage(taskId, { ...message, isPending: true });

// Enviar a Firestore
const docRef = await addDoc(messagesRef, encrypted);

// Actualizar con ID real
updateMessage(taskId, clientId, { id: docRef.id, isPending: false });

// Si falla, marcar error
updateMessage(taskId, clientId, { hasError: true });
```

#### 4. Real-time Updates
```typescript
// Listener de Firestore
onSnapshot(messagesQuery, (snapshot) => {
  const newMessages = snapshot.docs.map(doc => doc.data());
  // Actualizar UI automáticamente
});
```

#### 5. Drag-to-Reply
- Deslizar mensaje 60px a la izquierda
- Activa modo respuesta
- Animación visual durante drag

#### 6. Resúmenes con IA
```typescript
// Generar resumen con ChatGPT
const summaryText = await generateSummary('1week');

// Crear mensaje especial
const summaryMessage = {
  senderId: 'chatgpt',
  senderName: 'ChatGPT',
  text: summaryText,
  isSummary: true,  // Renderizado con markdown
};
```

#### 7. Sistema de Permisos
```typescript
const isCreator = user.id === task.CreatedBy;
const isInvolved = task.AssignedTo.includes(user.id);
const canEdit = senderId === user.id;
const canChangeStatus = isCreator || isAdmin;
```

---

## ⌨️ InputChat - Sistema de Entrada

**Ubicación:** `/src/components/ui/InputChat.tsx` (1476 líneas)

### Editor Tiptap

```typescript
const editor = useEditor({
  extensions: [StarterKit, Underline],
  editable: !isSending && !isProcessing,
});
```

**Formatos soportados:**
- Negrita (Ctrl+B)
- Cursiva (Ctrl+I)
- Subrayado (Ctrl+U)
- Código (Ctrl+`)
- Listas (Ctrl+Shift+8/7)

### Menciones

#### Autocomplete
```typescript
// Detectar @
const lastAtIndex = text.lastIndexOf('@');
if (lastAtIndex > lastSpaceIndex) {
  // Mostrar dropdown con:
  // - @gemini (IA)
  // - @usuarios (equipo)
}
```

#### Consultas a Gemini
```typescript
// Usuario escribe: "@gemini resume la conversación"
const match = text.match(/@gemini\s*(.*)/i);
const query = match[1].trim();

// Enviar mensaje usuario
await onSendMessage({ text: query });

// Generar respuesta
const response = await generateQueryResponse(query);

// Enviar respuesta Gemini
await onSendMessage({
  senderId: 'gemini',
  text: response,
  replyTo: { id: userMessageId }
});
```

### Reformulación con OpenAI

```typescript
// Modos disponibles
const modes = [
  'correct',      // Corregir
  'rewrite',      // Reescribir
  'friendly',     // Amigable
  'professional', // Profesional
  'concise',      // Conciso
  'summarize',    // Resumir
  'keypoints',    // Puntos clave
  'list'          // Lista
];

// Uso
const reformulated = await reformulateText(mode, editor.getText());
editor.commands.setContent(reformulated);
```

### Persistencia de Drafts

```typescript
// Auto-guardado cada 2 segundos
useEffect(() => {
  const interval = setInterval(() => {
    const content = editor.getHTML();
    if (content.trim()) watchAndSave();
  }, 2000);
  return () => clearInterval(interval);
}, [editor]);

// Restaurar al abrir
if (restoredData?.content && editor.isEmpty) {
  editor.commands.setContent(restoredData.content);
}
```

### Manejo de Archivos

**Validación:**
- Tamaño máximo: 10 MB
- Extensiones: jpg, jpeg, png, gif, pdf, doc, docx

**Upload:**
```typescript
const formData = new FormData();
formData.append('file', file);
const response = await fetch('/api/upload', { 
  method: 'POST', 
  body: formData 
});
const { url } = await response.json();
```

### Atajos de Teclado

- **Enter**: Enviar mensaje
- **Shift+Enter**: Salto de línea
- **Escape**: Cancelar edición
- **Ctrl+A**: Seleccionar todo
- **Ctrl+C/V/X**: Copiar/Pegar/Cortar

---

## ⏱️ TimerPanel - Gestión de Tiempo

**Ubicación:** `/src/components/ui/TimerPanel.tsx` (469 líneas)

### Wizard de 2 Pasos

```typescript
<Wizard totalSteps={2}>
  <WizardStep step={0} validator={validateTime}>
    {/* Paso 1: Tiempo (HH:MM) */}
    <TimeInput hours={hours} minutes={minutes} />
  </WizardStep>
  
  <WizardStep step={1} validator={validateDate}>
    {/* Paso 2: Fecha */}
    <DayPicker 
      selected={date}
      disabled={(date) => date > today}
    />
  </WizardStep>
  
  <WizardActions onComplete={handleSubmit} />
</Wizard>
```

### Validación con Zod

```typescript
const schema = z.object({
  time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  date: z.date()
    .refine((date) => date <= today, {
      message: "No puedes añadir tiempo futuro"
    }),
  comment: z.string().optional(),
});
```

### Componente TimeInput

- Spinners para horas (0-23) y minutos (0-59)
- Incremento/decremento con botones
- Validación en tiempo real

### Flujo de Envío

```typescript
const handleSubmit = async () => {
  const { time, date, comment } = form.getValues();
  const [hours, minutes] = time.split(':').map(Number);
  const totalHours = hours + minutes / 60;
  
  await sendTimeMessage(
    userId,
    userName,
    totalHours,
    `${hours}h ${minutes}m`,
    date.toLocaleDateString(),
    comment
  );
  
  // Resetear y cerrar
  form.reset();
  onCancel();
};
```

---

## 🔄 Flujos de Datos Principales

### 1. Envío de Mensaje

```
Usuario escribe → Validación → Upload archivo (si existe) →
Mensaje optimista → Encriptar → Firestore → Actualizar ID →
Notificar equipo → Marcar como enviado
```

### 2. Consulta a Gemini

```
@gemini query → Detectar mención → Enviar mensaje usuario →
Cargar contexto → Generar respuesta → Enviar mensaje Gemini →
Renderizar con markdown
```

### 3. Registro de Tiempo

```
Abrir TimerPanel → Ingresar tiempo → Validar → Enviar →
Crear mensaje especial (hours) → Actualizar total → Cerrar panel
```

### 4. Paginación

```
Scroll arriba → Click "Cargar más" → Fetch 10 mensajes →
Desencriptar → Agrupar por fecha → Animar entrada →
Actualizar hasMore
```

### 5. Resumen IA

```
Click botón → Validar usuario → Fetch mensajes → Desencriptar →
Generar prompt → ChatGPT API → Formatear markdown →
Crear mensaje summary → Renderizar
```

---

## 🎨 Características Avanzadas

### Animaciones (Framer Motion)
- Entrada/salida de sidebar
- Mensajes nuevos
- Toolbar dinámico
- Modales y overlays

### Optimizaciones
- Memoización con React.memo
- useCallback para handlers
- useMemo para cálculos costosos
- Lazy loading de mensajes

### Accesibilidad
- ARIA labels
- Navegación por teclado
- Tooltips descriptivos
- Contraste de colores

### Seguridad
- Encriptación AES
- Sanitización HTML
- Validación de archivos
- Permisos granulares

---

## 📊 Métricas del Sistema

- **ChatSidebar**: 2018 líneas
- **InputChat**: 1476 líneas
- **TimerPanel**: 469 líneas
- **Total**: ~4000 líneas de código
- **Hooks personalizados**: 8+
- **Componentes**: 15+
- **Integraciones**: Firestore, Gemini, ChatGPT, Vercel Blob

---

**Fecha de análisis:** Noviembre 2025
**Versión del sistema:** Producción
