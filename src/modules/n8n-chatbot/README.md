# Módulo N8N Chatbot

Chatbot de IA integrado con n8n para gestión de tareas mediante lenguaje natural.

## 🎯 Características

- ✨ Interfaz de chat moderna con animaciones (Framer Motion)
- 🤖 Integración con n8n para procesamiento con ChatGPT
- 🔥 Conexión directa con Firebase/Firestore
- 📝 Crear, editar y consultar tareas mediante chat
- 📎 Soporte para adjuntar archivos (imágenes, PDFs, texto)
- 💾 Persistencia de sesiones en localStorage
- 🌐 Multiidioma (español por defecto)
- 📱 Diseño responsive (mobile y desktop)

## 📦 Estructura del Módulo

```
src/modules/n8n-chatbot/
├── components/
│   ├── ChatbotWidget.tsx      # Componente principal del chatbot
│   └── MarkdownRenderer.tsx   # Renderizador de markdown
├── styles/
│   └── chatbot.module.scss    # Estilos del chatbot
├── types/
│   └── index.ts               # Definiciones de tipos TypeScript
├── utils/
│   └── index.ts               # Utilidades (validación, sesiones, etc)
├── constants/
│   └── index.ts               # Constantes y traducciones
├── index.ts                   # Exportaciones del módulo
└── README.md                  # Este archivo
```

## 🚀 Instalación

### 1. Dependencias

El módulo requiere las siguientes dependencias (ya instaladas):

```bash
npm install react-markdown nanoid framer-motion lucide-react
```

### 2. Configurar Variables de Entorno

Agrega la URL del webhook de n8n en `.env.local`:

```env
# N8N Chatbot Configuration
N8N_WEBHOOK_URL=https://tu-instancia-n8n.com/webhook/chatbot-tasks
```

### 3. Agregar al Layout

El chatbot ya está integrado en `/app/dashboard/layout.tsx`:

```tsx
import { ChatbotWidget } from '@/modules/n8n-chatbot';

// ...dentro del return
<ChatbotWidget />
```

## 🔧 Configuración de n8n

### Estructura del Flujo de n8n

El webhook de n8n debe recibir el siguiente payload:

```json
{
  "userId": "user_xxxxx",
  "message": "Crea una tarea para revisar código",
  "sessionId": "unique-session-id",
  "fileUrl": "https://storage.googleapis.com/.../file.jpg",  // opcional - URL de GCS
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Respuesta Esperada de n8n

```json
{
  "output": "He creado la tarea 'Revisar código' exitosamente.",
  "response": "Respuesta alternativa"  // fallback
}
```

### Ejemplo de Flujo n8n

1. **Webhook** - Recibe el mensaje del usuario
2. **ChatGPT** - Procesa el mensaje y extrae la intención
3. **Function Node** - Determina si es crear/editar/consultar tarea/cliente
4. **Firestore** - Lee/escribe en la base de datos
5. **ChatGPT** - Genera respuesta natural
6. **Response** - Retorna respuesta al frontend

### Flujo con Archivos (Casos de Uso Avanzados)

```
┌─────────────┐
│   Webhook   │ <- Recibe mensaje + fileUrl
└──────┬──────┘
       │
       v
┌─────────────┐
│  ChatGPT    │ <- Analiza intención y archivo (si aplica)
│  Vision     │    Puede procesar imágenes directamente
└──────┬──────┘
       │
       v
┌─────────────┐
│  Function   │ <- Determina acción según intención
│  Node       │    - crear_tarea_con_archivo
│             │    - crear_cliente_con_foto
│             │    - analizar_imagen
│             │    - extraer_datos_pdf
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       v                 v                 v
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Firestore  │   │ Cloud       │   │  ChatGPT    │
│  Create/    │   │ Storage     │   │  Vision API │
│  Update     │   │ (opcional)  │   │  Analyze    │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                        │
                        v
                ┌─────────────┐
                │  ChatGPT    │ <- Genera respuesta natural
                │  Response   │
                └──────┬──────┘
                       │
                       v
                ┌─────────────┐
                │  Response   │ -> Frontend
                └─────────────┘
```

## 📂 Gestión de Archivos

### Tipos de Archivos Soportados

```typescript
// Formatos permitidos:
- Imágenes: .jpg, .jpeg, .png, .gif, .webp
- Documentos: .pdf, .txt
// Límite: 10MB por archivo
```

### Ubicación en Google Cloud Storage

Los archivos se guardan en:
```
gs://aurin-plattform.firebasestorage.app/chatbot/{userId}/{timestamp}.{ext}
```

### Casos de Uso con Archivos

#### 1. Crear Cliente con Foto de Perfil

**Usuario dice:** "Crea un nuevo cliente con estos datos: Nombre: Acme Corp, Email: contact@acme.com" + adjunta imagen

**n8n procesa:**
```javascript
// 1. ChatGPT identifica intención: crear_cliente
// 2. Extrae datos del mensaje
const clientData = {
  nombre: "Acme Corp",
  email: "contact@acme.com",
  profilePhoto: fileUrl // URL de GCS ya subida
}

// 3. Firestore: Crea documento en colección 'clients'
await db.collection('clients').add({
  ...clientData,
  createdBy: userId,
  createdAt: new Date()
})

// 4. ChatGPT genera respuesta
"✅ Cliente 'Acme Corp' creado exitosamente con foto de perfil."
```

#### 2. Analizar Screenshot de Error

**Usuario dice:** "Analiza este screenshot y dime qué error hay" + adjunta imagen

**n8n procesa:**
```javascript
// 1. ChatGPT Vision analiza la imagen
const analysis = await chatgpt.vision({
  image: fileUrl,
  prompt: "Analiza esta captura de pantalla y describe cualquier error visible"
})

// 2. Genera respuesta con análisis
"🔍 Análisis del screenshot:
- Error detectado: 'TypeError: Cannot read property X'
- Ubicación: Línea 42, archivo main.js
- Solución sugerida: Verificar que el objeto esté inicializado antes de usarlo"
```

#### 3. Extraer Tareas de Documento

**Usuario dice:** "Lee este PDF y crea tareas para cada punto" + adjunta PDF

**n8n procesa:**
```javascript
// 1. Extrae texto del PDF (usando PDF parser node)
const pdfText = await parsePDF(fileUrl)

// 2. ChatGPT identifica tareas en el texto
const tasks = await chatgpt.extractTasks(pdfText)
// Resultado: ["Diseñar mockups", "Implementar API", "Testing"]

// 3. Crea documentos en Firestore
for (const task of tasks) {
  await db.collection('tasks').add({
    title: task,
    status: 'pending',
    createdBy: userId,
    createdAt: new Date()
  })
}

// 4. Responde al usuario
"✅ He creado 3 tareas desde el documento:
1. Diseñar mockups
2. Implementar API
3. Testing"
```

#### 4. Actualizar Tarea con Evidencia

**Usuario dice:** "Esta es la captura del bug resuelto" + adjunta imagen (contexto: editando tarea)

**n8n procesa:**
```javascript
// 1. Identifica contexto de la conversación (tarea actual)
// 2. Actualiza documento de la tarea en Firestore
await db.collection('tasks').doc(taskId).update({
  evidenceUrl: fileUrl,
  status: 'completed',
  completedAt: new Date()
})

// 3. Responde
"✅ Tarea marcada como completada con evidencia adjunta."
```

## 🔒 Acceso Administrativo

**IMPORTANTE**: El chatbot solo es visible para usuarios con acceso de administrador.

- El acceso se valida mediante `AuthContext` (`isAdmin`)
- Los administradores se configuran en Clerk (metadata: `access: 'admin'`)
- El chatbot no se renderiza si el usuario no es admin

## 💡 Uso

### Comandos Soportados

El chatbot puede entender comandos como:

#### 📝 Gestión de Tareas
- **Crear tareas**: "Crea una tarea para revisar el código mañana"
- **Editar tareas**: "Cambia la fecha de la tarea de revisión a la próxima semana"
- **Consultar tareas**: "¿Qué tareas tengo pendientes?"
- **Ver detalles**: "Muéstrame los detalles de la tarea X"
- **Filtrar**: "Muéstrame las tareas de alta prioridad"
- **Asignar**: "Asigna la tarea de testing a Juan"

#### 👥 Gestión de Clientes (con archivos)
- **Crear cliente con foto**: "Crea un nuevo cliente llamado 'Acme Corp' con esta foto de perfil" + archivo adjunto
- **Actualizar datos**: "Actualiza el cliente 'Acme Corp' con este contrato" + PDF adjunto
- **Consultar**: "Muéstrame todos los clientes activos"

#### 📸 Análisis con IA (ChatGPT Vision)
- **Analizar screenshots**: "Analiza este screenshot y dime qué error hay" + imagen
- **Extraer información**: "Lee esta factura y extrae los datos principales" + PDF
- **Comparar imágenes**: "Compara este diseño con el mockup anterior" + 2 imágenes

#### 📄 Procesamiento de Documentos
- **Extraer tareas de PDF**: "Lee este documento y crea tareas para cada ítem de la lista" + PDF
- **Resumir**: "Resume este documento técnico en 3 puntos" + archivo
- **Buscar info**: "Busca la fecha de entrega en este contrato" + PDF

### Personalización

#### Cambiar Traducciones

```tsx
import { ChatbotWidget } from '@/modules/n8n-chatbot';

const customTranslations = {
  welcome: "Custom welcome message",
  title: "AI Assistant",
  // ... más traducciones
};

<ChatbotWidget lang="en" translations={customTranslations} />
```

#### Estilos

Los estilos están en `/styles/chatbot.module.scss` y usan variables SCSS:

```scss
$chatbot-primary: #d0df00;  // Color principal (amarillo Aurin)
$chatbot-bg-dark: #0f0f0f;  // Fondo oscuro
// ... más variables
```

## 🔌 API Route

La ruta API está en `/app/api/n8n-chatbot/route.ts`:

- **Endpoint**: `POST /api/n8n-chatbot`
- **Autenticación**: Requiere Clerk authentication
- **Payload**: `{ message, sessionId, fileUrl? }`
- **Response**: `{ output, sessionId, timestamp }`

## 🎨 Características Visuales

- **Animaciones suaves** con Framer Motion
- **Scroll automático** al último mensaje
- **Indicador de escritura** animado
- **Drag & drop** para archivos
- **Preview de archivos** antes de enviar
- **Markdown rendering** en respuestas del bot
- **Timestamps** en cada mensaje

## 📱 Responsive

- **Desktop**: Widget flotante de 400x650px
- **Mobile**: Pantalla completa
- **Auto-cierre**: Click fuera del chat para cerrar

## 🔒 Seguridad

- ✅ Autenticación obligatoria (Clerk)
- ✅ Validación de tipos de archivo
- ✅ Límite de tamaño (10MB)
- ✅ Sanitización de inputs
- ✅ Session management seguro

## 🐛 Debugging

### Logs

El módulo incluye logs en consola:

```javascript
console.log('💾 Session saved:', session)
console.error('Error en /api/n8n-chatbot:', error)
```

### Verificar Configuración

1. ¿N8N_WEBHOOK_URL está configurada?
2. ¿El webhook de n8n está activo?
3. ¿Firestore tiene los permisos correctos?
4. ¿El usuario está autenticado?

## 📄 Licencia

Parte del proyecto Aurin Task Manager.

---

Desarrollado con ❤️ para Aurin
