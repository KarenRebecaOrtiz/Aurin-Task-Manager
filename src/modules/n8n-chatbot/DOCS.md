# n8n-chatbot Module Documentation

> **Estado actual**: En desarrollo activo
> **Proyecto**: Aurin Task Manager
> **Firebase Project**: `aurin-plattform`

---

## Resumen del Sistema

El módulo `n8n-chatbot` implementa un asistente de IA llamado **"El Orquestador"** que permite a los usuarios interactuar con el Task Manager de SODIO/Aurin mediante lenguaje natural. El sistema utiliza:

- **Frontend**: React/Next.js con widget de chat flotante
- **Backend AI**: OpenAI GPT-4o con function calling
- **Orquestación**: n8n workflows para operaciones complejas
- **Base de datos**: Firebase Firestore

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        ChatbotWidget                             │
│                    (React Component)                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ POST /api/ai-chat
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OpenAI Client                                │
│              (openai-client.ts)                                  │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │System Prompt│ -> │  GPT-4o      │ -> │ Tool Executor    │   │
│  │   Context   │    │Function Call │    │(tool-executor.ts)│   │
│  └─────────────┘    └──────────────┘    └────────┬─────────┘   │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │
                      ┌────────────────────────────┼────────────────┐
                      │                            │                │
                      ▼                            ▼                ▼
          ┌──────────────────┐      ┌──────────────────┐   ┌──────────────┐
          │  Local Functions │      │  n8n Webhooks    │   │   Firestore  │
          │  (lib/tasks,     │      │  (Vision, Notion)│   │   (Direct)   │
          │   lib/analytics) │      │                  │   │              │
          └──────────────────┘      └──────────────────┘   └──────────────┘
```

---

## Estructura del Modulo

```
src/modules/n8n-chatbot/
├── ai/
│   ├── openai-client.ts      # Cliente OpenAI con function calling
│   ├── system-prompt.ts      # Prompt del sistema "El Orquestador"
│   ├── tool-executor.ts      # Router de ejecucion de herramientas
│   ├── aurin-firestore-schemas.json  # Schemas de Firestore
│   └── tools/
│       ├── index.ts          # Export de todas las tools
│       ├── tasks.ts          # Tools: search, create, update, archive
│       ├── analytics.ts      # Tools: workload, project hours, user tasks
│       ├── users.ts          # Tool: get_users_info
│       └── n8n-integrations.ts  # Tools: analyze_document, create_notion_plan
├── components/
│   ├── ChatbotWidget.tsx     # Widget principal del chat
│   └── MarkdownRenderer.tsx  # Renderizado de respuestas markdown
├── hooks/
│   └── useChatbotControl.ts  # Control externo del chat (abrir/cerrar)
├── lib/
│   ├── tasks/
│   │   ├── search.ts         # Busqueda de tareas en Firestore
│   │   ├── create.ts         # Creacion de tareas
│   │   ├── update.ts         # Actualizacion de tareas
│   │   ├── archive.ts        # Archivado de tareas
│   │   └── types.ts          # Tipos TypeScript
│   ├── analytics/
│   │   ├── workload.ts       # Carga de trabajo del equipo
│   │   ├── project-hours.ts  # Horas por proyecto
│   │   └── user-tasks.ts     # Tareas por usuario
│   └── users/
│       └── get-users.ts      # Obtener info de usuarios
├── types/
│   └── index.ts              # Tipos del chatbot (Message, ChatSession, etc.)
├── constants/
│   └── index.ts              # Traducciones y constantes
├── utils/
│   └── index.ts              # Utilidades (validacion, formato, sesion)
└── styles/
    └── chatbot.module.scss   # Estilos del widget
```

---

## Herramientas de IA (Tools)

### Gestion de Tareas

| Tool | Descripcion | Campos requeridos |
|------|-------------|-------------------|
| `search_tasks` | Busca tareas con filtros | Ninguno (todos opcionales) |
| `create_task` | Crea nueva tarea | `name`, `project`, `clientId` |
| `update_task` | Actualiza tarea existente | `taskId` |
| `archive_task` | Archiva una tarea | `taskId` |

### Analytics

| Tool | Descripcion |
|------|-------------|
| `get_team_workload` | Carga de trabajo por usuario |
| `get_project_hours` | Horas registradas por proyecto |
| `get_user_tasks` | Tareas de un usuario especifico |

### Integraciones

| Tool | Descripcion | Webhook n8n |
|------|-------------|-------------|
| `get_users_info` | Obtiene info de usuarios por IDs | Local (Firestore) |
| `analyze_document` | Analiza PDF/imagen con Vision AI | `N8N_VISION_WEBHOOK_URL` |
| `create_notion_plan` | Crea documento en Notion | `N8N_NOTION_WEBHOOK_URL` |
| `transcribe_audio` | Transcribe audio a texto con Whisper | `N8N_AUDIO_WEBHOOK_URL` |

---

## Workflows n8n

### Activos

| Workflow | ID | Estado | Descripcion |
|----------|-----|--------|-------------|
| **El Orquestador - Main AI Agent** | `fPF3DICndwB5fa9i` | Activo | Agente principal de chat |
| **Company Website Chatbot Agent** | `WFX6r8v58WSuBw1P` | Activo | Chatbot del sitio web |
| **Auto-Cancel Unconfirmed Appointments** | `XbktF6QM4jTfhmo0` | Activo | Cron job |

### Webhook Bridges (Activos)

| Workflow | ID | Path | Descripcion |
|----------|-----|------|-------------|
| **Webhook - Vision Analyzer Bridge** | `brDTPjtoGeUYW7wV` | `/webhook/vision-analyzer` | Bridge para analisis de documentos |
| **Webhook - Notion Creator Bridge** | `xpmCTi28oyCfVQRD` | `/webhook/notion-creator` | Bridge para creacion en Notion |
| **Webhook - Audio Transcriber Bridge** | `ceXoOGYC0vj8J8VZ` | `/webhook/audio-transcriber` | Bridge para transcripcion de audio |

### Tools (Sub-workflows)

| Workflow | ID | Funcion |
|----------|-----|---------|
| **Tool - Firestore Task Manager** | `QqLXjUQ611zrZMmY` | CRUD de tareas via Firestore |
| **Tool - Timer and Time Logs Manager** | `3AzTlFqV0ug9RO2Q` | Gestion de timers y logs |
| **Tool - Document Vision Analyzer** | `TpLUSbfJ7wtZsHeG` | Analisis de documentos con Vision |
| **Tool - Audio Transcriber** | `CZvdrRZOhZSx9OGv` | Transcripcion de audio con Whisper |
| **Tool - User Search** | `lzg7eynYCbx2Rx2T` | Busqueda de usuarios |
| **Tool - Notion Plan Creator** | `jSyb1zbXjnjsYpDm` | Creacion de planes en Notion |

### Arquitectura de El Orquestador (n8n)

```
Webhook Chat
     │
     ▼
  AI Agent (GPT-4o)
     │
     ├── OpenAI GPT-4o (LLM)
     ├── Window Buffer Memory
     └── Tools conectados:
         ├── Tool: Manage Tasks
         ├── Tool: Manage Timer
         ├── Tool: Analyze Document
         ├── Tool: Create Notion Plan
         └── Tool: Search Users
     │
     ▼
Respond to Webhook
```

---

## Schemas de Firestore

### Colecciones Principales

| Coleccion | Path | Descripcion |
|-----------|------|-------------|
| `tasks` | `tasks/{taskId}` | Tareas del proyecto |
| `users` | `users/{userId}` | Usuarios del sistema |
| `clients` | `clients/{clientId}` | Clientes |
| `notifications` | `notifications/{id}` | Notificaciones |
| `conversations` | `conversations/{id}` | Chats entre usuarios |
| `ai_conversations` | `ai_conversations/{id}` | Conversaciones con IA |

### Estructura de Task

```typescript
interface Task {
  // Identificacion
  id: string                  // Document ID
  name: string                // Titulo (requerido)
  description?: string        // Descripcion

  // Usuarios
  CreatedBy: string           // ID del creador (requerido)
  AssignedTo?: string[]       // IDs de asignados
  LeadedBy?: string[]         // IDs de lideres

  // Estado
  status: 'por iniciar' | 'en proceso' | 'backlog' | 'por finalizar' | 'finalizado' | 'cancelado'
  priority?: 'Alta' | 'Media' | 'Baja'

  // Proyecto
  project?: string            // Nombre del proyecto
  clientId?: string           // ID del cliente

  // Fechas
  startDate?: Timestamp
  endDate?: Timestamp
  createdAt: Timestamp        // (requerido)
  updatedAt: Timestamp        // (requerido)

  // Tracking
  lastViewedBy?: Map<userId, Timestamp>
  unreadCountByUser?: Map<userId, number>
  hasUnreadUpdates?: boolean
}
```

### Subcolecciones de Task

| Subcoleccion | Path | Proposito |
|--------------|------|-----------|
| `messages` | `tasks/{taskId}/messages/{msgId}` | Mensajes del contexto de tarea |
| `timers` | `tasks/{taskId}/timers/{userId}` | Timers activos por usuario |
| `time_logs` | `tasks/{taskId}/time_logs/{logId}` | Registros de tiempo trabajado |
| `typing` | `tasks/{taskId}/typing/{userId}` | Indicadores de escritura |

---

## Variables de Entorno Requeridas

```env
# OpenAI
OPENAI_API_KEY=sk-...

# n8n Webhooks
N8N_VISION_WEBHOOK_URL=https://n8nsystems.info/webhook/vision-analyzer
N8N_NOTION_WEBHOOK_URL=https://n8nsystems.info/webhook/notion-creator
N8N_AUDIO_WEBHOOK_URL=https://n8nsystems.info/webhook/audio-transcriber

# Firebase Admin (ya configurado en el proyecto)
FIREBASE_PROJECT_ID=aurin-plattform
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## Flujo de Conversacion

1. **Usuario envia mensaje** -> ChatbotWidget
2. **Upload de archivo** (opcional) -> `/api/upload` -> GCS
3. **Request a AI** -> `/api/ai-chat` con mensaje + sessionId + fileUrl
4. **OpenAI procesa** -> GPT-4o con system prompt + tools
5. **Tool calls** (si necesario):
   - Tools locales: Ejecutan en Node.js contra Firestore
   - Tools n8n: Llaman webhooks externos
6. **Respuesta** -> Se devuelve al widget y se guarda en sesion

---

## Reglas de Seguridad del Asistente

Definidas en `system-prompt.ts`:

1. **No eliminar datos**: Archivar en lugar de eliminar
2. **Confirmacion explicita**: Siempre confirmar antes de crear/modificar
3. **Datos completos**: Preguntar si falta informacion obligatoria
4. **Uso obligatorio de tools**: NUNCA inventar datos, siempre consultar

---

## Structured Processes (NUEVO)

Sistema de procesos estructurados que reduce la dependencia del LLM para flujos comunes, ahorrando ~70-90% de tokens en operaciones frecuentes.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mensaje del Usuario                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Intent Detector                                │
│         (Pattern matching, keywords, intents)                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────────────────────────────┐
│ Proceso Match?  │ NO  │           OpenAI GPT-4o                 │
│     SÍ ↓        │────▶│      (Function Calling)                 │
└────────┬────────┘     │    Maneja casos complejos               │
         │              └─────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Process Executor                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Collect  │→ │ Validate │→ │ Confirm  │→ │ Execute  │       │
│  │  Slots   │  │   Data   │  │   User   │  │   Tools  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Procesos Disponibles

| Proceso | ID | Descripción | Tokens Ahorrados |
|---------|-----|-------------|------------------|
| Crear Tarea | `task-creation` | Flujo completo de creación con búsqueda de cliente | ~3000 |
| Consultar Tareas | `task-query` | Listar y filtrar tareas | ~2500 |
| Carga de Trabajo | `workload-query` | Ver distribución del equipo | ~2500 |
| Actualizar Tarea | `task-update` | Cambiar estado/prioridad/asignación | ~2800 |
| Archivar Tarea | `task-archive` | Solo admins | ~2500 |

### Uso

```typescript
import { enhancedChat } from '@/modules/n8n-chatbot/ai'

// Chat mejorado - usa procesos primero, luego LLM
const response = await enhancedChat({
  userId: 'user123',
  sessionId: 'session456',
  message: 'Crear tarea de revisión para aurin',
  isAdmin: false
})

if (response.handledBy === 'process') {
  console.log('Manejado por proceso:', response.processId)
  console.log('Tokens ahorrados:', response.metrics?.estimatedTokensSaved)
} else {
  console.log('Manejado por LLM')
}
```

### Cómo Crear un Nuevo Proceso

1. Crear archivo en `ai/processes/definitions/mi-proceso.ts`
2. Definir `ProcessDefinition` con:
   - `triggers`: Patrones/keywords que activan el proceso
   - `slots`: Datos a recolectar
   - `steps`: Pasos del flujo
3. Registrar en `ai/processes/index.ts`

Ejemplo mínimo:

```typescript
export const miProcesoNuevo: ProcessDefinition = {
  id: 'mi-proceso',
  name: 'Mi Proceso',
  description: 'Descripción del proceso',
  version: '1.0.0',

  triggers: [{
    type: 'keyword',
    keywords: ['mi comando', 'hacer algo'],
    priority: 100
  }],

  slots: [{
    name: 'dato1',
    type: 'string',
    required: true,
    promptIfMissing: '¿Cuál es el dato?'
  }],

  steps: [
    { id: 'collect', type: 'collect', slots: ['dato1'], nextStep: 'execute' },
    { id: 'execute', type: 'execute', tool: 'mi_tool', toolArgs: { data: '$dato1' } }
  ],

  initialStep: 'collect',
  config: { requiresConfirmation: true, maxRetries: 3, timeout: 60000, allowCancel: true }
}
```

### Estructura de Archivos

```
ai/processes/
├── index.ts                 # Registry y exports
├── types.ts                 # Tipos base
├── executor.ts              # Motor de ejecución
├── intent-detector.ts       # Detección de intents
├── definitions/
│   ├── task-creation.ts     # Proceso crear tarea
│   ├── task-query.ts        # Proceso consultar tareas
│   └── task-update.ts       # Proceso actualizar tarea
└── responses/
    └── templates.ts         # Respuestas predefinidas
```

---

## Pendientes / TODO

- [ ] El workflow "Tool - Firestore Task Manager" esta inactivo
- [ ] El workflow "Tool - Timer and Time Logs Manager" esta inactivo
- [ ] Verificar conexion de webhooks de Vision y Notion
- [ ] Validar que las tools de n8n esten correctamente conectadas al Orquestador
- [ ] Implementar persistencia de conversacion en Firestore (actualmente solo localStorage)
- [ ] Revisar si los estados de task en el schema (`por iniciar`, etc.) coinciden con los enum del tool (`todo`, `in_progress`, etc.)
- [x] Implementar Structured Processes para ahorro de tokens

---

## Notas de Desarrollo

- El widget soporta modo **controlado** (para mobile navigation) y **flotante** (desktop)
- Las respuestas del bot se renderizan como Markdown
- Soporte para drag & drop de archivos
- Sesion persistida en localStorage con `sessionId`
- Maximo 5 iteraciones de tool calling por mensaje

---

*Documentacion generada: 2025-12-05*
