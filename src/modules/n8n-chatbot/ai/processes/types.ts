/**
 * Structured Processes - Type Definitions
 *
 * Los procesos estructurados permiten definir flujos paso a paso
 * que se ejecutan de forma determinística, reduciendo la dependencia
 * del LLM y ahorrando tokens.
 */

/**
 * Estado de un proceso en ejecución
 */
export type ProcessStatus =
  | 'idle'           // No iniciado
  | 'collecting'     // Recolectando datos (slots)
  | 'confirming'     // Esperando confirmación del usuario
  | 'executing'      // Ejecutando acciones
  | 'completed'      // Completado exitosamente
  | 'cancelled'      // Cancelado por el usuario
  | 'error'          // Error en ejecución

/**
 * Un slot es un dato que el proceso necesita recolectar
 */
export interface ProcessSlot {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'date' | 'userId' | 'clientId' | 'taskId'
  required: boolean
  description: string

  // Valor actual (si ya fue recolectado)
  value?: unknown

  // Para obtener el valor
  extractFrom?: 'message' | 'tool' | 'context' | 'default'
  extractPattern?: RegExp
  toolToCall?: string
  toolArgs?: Record<string, unknown>
  defaultValue?: unknown

  // Validación
  validation?: {
    pattern?: RegExp
    minLength?: number
    maxLength?: number
    enum?: string[]
    customValidator?: (value: unknown) => boolean | string
  }

  // Prompt para pedir el dato si no está presente
  promptIfMissing?: string
}

/**
 * Un paso del proceso
 */
export interface ProcessStep {
  id: string
  name: string
  type: 'collect' | 'validate' | 'confirm' | 'execute' | 'respond' | 'branch'

  // Para type: 'collect'
  slots?: string[]  // Nombres de slots a recolectar

  // Para type: 'validate'
  validations?: Array<{
    condition: string  // Expresión a evaluar
    errorMessage: string
    failAction: 'retry' | 'abort' | 'skip'
  }>

  // Para type: 'confirm'
  confirmMessage?: string | ((context: ProcessContext) => string)

  // Para type: 'execute'
  tool?: string
  toolArgs?: Record<string, unknown> | ((context: ProcessContext) => Record<string, unknown>)

  // Para type: 'respond'
  response?: string | ((context: ProcessContext) => string)

  // Para type: 'branch'
  branches?: Array<{
    condition: string | ((context: ProcessContext) => boolean)
    nextStep: string
  }>

  // Siguiente paso (si no es branch)
  nextStep?: string

  // Acciones al entrar/salir del paso
  onEnter?: (context: ProcessContext) => Promise<void>
  onExit?: (context: ProcessContext) => Promise<void>
}

/**
 * Definición completa de un proceso
 */
export interface ProcessDefinition {
  id: string
  name: string
  description: string
  version: string

  // Triggers que activan este proceso
  triggers: ProcessTrigger[]

  // Slots que el proceso necesita
  slots: ProcessSlot[]

  // Pasos del proceso
  steps: ProcessStep[]

  // Paso inicial
  initialStep: string

  // Configuración
  config: {
    requiresConfirmation: boolean
    maxRetries: number
    timeout: number  // ms
    allowCancel: boolean
    trackInHistory: boolean
  }

  // Metadata
  metadata?: {
    author?: string
    createdAt?: string
    updatedAt?: string
    tags?: string[]
  }
}

/**
 * Trigger que puede activar un proceso
 */
export interface ProcessTrigger {
  type: 'pattern' | 'keyword' | 'intent' | 'command'

  // Para type: 'pattern'
  patterns?: RegExp[]

  // Para type: 'keyword'
  keywords?: string[]

  // Para type: 'intent' (detectado por LLM ligero)
  intents?: string[]

  // Para type: 'command' (slash commands)
  commands?: string[]

  // Prioridad (mayor = más prioritario)
  priority: number

  // Condición adicional
  condition?: (context: ProcessContext) => boolean
}

/**
 * Contexto de ejecución de un proceso
 */
export interface ProcessContext {
  // Identificadores
  processId: string
  sessionId: string
  userId: string

  // Estado actual
  status: ProcessStatus
  currentStep: string

  // Datos recolectados
  slots: Record<string, unknown>

  // Historial de ejecución
  executionHistory: Array<{
    step: string
    action: string
    timestamp: Date
    result?: unknown
    error?: string
  }>

  // Resultados de tools
  toolResults: Record<string, unknown>

  // Mensaje original del usuario
  originalMessage: string

  // Mensajes pendientes de responder
  pendingResponses: string[]

  // Flags
  awaitingConfirmation: boolean
  awaitingInput: boolean

  // Metadata del usuario
  userContext: {
    isAdmin: boolean
    userName?: string
    timezone?: string
  }

  // Timestamps
  startedAt: Date
  updatedAt: Date
}

/**
 * Resultado de ejecutar un proceso
 */
export interface ProcessResult {
  success: boolean
  processId: string
  status: ProcessStatus

  // Respuesta para el usuario
  response: string

  // Datos del resultado
  data?: unknown

  // Si el proceso necesita más input
  awaitingInput?: {
    slotName: string
    prompt: string
  }

  // Si el proceso necesita confirmación
  awaitingConfirmation?: {
    message: string
    data: unknown
  }

  // Sugerencias de quick replies
  quickReplies?: Array<{
    label: string
    payload: string
  }>

  // Error si hubo
  error?: string

  // Métricas
  metrics?: {
    tokensUsed: number
    toolCallsCount: number
    durationMs: number
  }
}

/**
 * Match result de un trigger
 */
export interface TriggerMatch {
  processId: string
  trigger: ProcessTrigger
  confidence: number
  extractedData?: Record<string, unknown>
}
