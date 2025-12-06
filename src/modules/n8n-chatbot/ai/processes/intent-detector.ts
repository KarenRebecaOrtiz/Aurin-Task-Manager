/**
 * Intent Detector - Detecta qué proceso triggerar
 *
 * Usa pattern matching para detectar intents sin usar el LLM,
 * ahorrando tokens y proporcionando respuestas más rápidas.
 */

import type { ProcessDefinition, TriggerMatch, ProcessContext, ProcessTrigger } from './types'

export class IntentDetector {
  private processes: Map<string, ProcessDefinition> = new Map()

  /**
   * Registra un proceso para detección
   */
  register(process: ProcessDefinition): void {
    this.processes.set(process.id, process)
  }

  /**
   * Registra múltiples procesos
   */
  registerAll(processes: ProcessDefinition[]): void {
    processes.forEach(p => this.register(p))
  }

  /**
   * Detecta qué proceso debe ejecutarse basándose en el mensaje
   */
  detect(
    message: string,
    context: Partial<ProcessContext>
  ): TriggerMatch | null {
    const normalizedMessage = this.normalizeMessage(message)
    const matches: TriggerMatch[] = []

    for (const [processId, process] of this.processes) {
      for (const trigger of process.triggers) {
        const match = this.matchTrigger(
          normalizedMessage,
          message,
          trigger,
          processId,
          context
        )

        if (match) {
          matches.push(match)
        }
      }
    }

    if (matches.length === 0) {
      return null
    }

    // Ordenar por prioridad y confianza
    matches.sort((a, b) => {
      const priorityDiff = b.trigger.priority - a.trigger.priority
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })

    return matches[0]
  }

  /**
   * Verifica si hay un proceso activo que debe continuar
   */
  shouldContinueProcess(
    message: string,
    activeContext: ProcessContext
  ): { continue: boolean; action?: 'confirm' | 'cancel' | 'input' | 'modify'; modifications?: Record<string, unknown> } {
    const normalized = this.normalizeMessage(message)

    // Detectar confirmaciones
    if (activeContext.awaitingConfirmation) {
      if (this.isConfirmation(normalized)) {
        return { continue: true, action: 'confirm' }
      }
      if (this.isCancellation(normalized)) {
        return { continue: true, action: 'cancel' }
      }
      
      // Detectar modificaciones (cambios de prioridad, estado, etc.)
      const modifications = this.detectModifications(message)
      if (Object.keys(modifications).length > 0) {
        return { continue: true, action: 'modify', modifications }
      }
    }

    // Detectar input esperado
    if (activeContext.awaitingInput) {
      return { continue: true, action: 'input' }
    }

    return { continue: false }
  }

  /**
   * Detecta modificaciones solicitadas en el mensaje
   */
  private detectModifications(message: string): Record<string, unknown> {
    const modifications: Record<string, unknown> = {}
    const lower = message.toLowerCase()

    // Detectar cambio de prioridad
    if (lower.includes('prioridad alta') || lower.includes('alta prioridad') || lower.includes('urgente')) {
      modifications.priority = 'Alta'
    } else if (lower.includes('prioridad baja') || lower.includes('baja prioridad')) {
      modifications.priority = 'Baja'
    } else if (lower.includes('prioridad media')) {
      modifications.priority = 'Media'
    }

    // Detectar cambio de estado
    if (lower.includes('por iniciar') || lower.includes('sin empezar')) {
      modifications.status = 'Por Iniciar'
    } else if (lower.includes('backlog')) {
      modifications.status = 'Backlog'
    }

    // Detectar proyecto
    const projectMatch = message.match(/proyecto[:\s]+["']?([^"'\n,]+)["']?/i)
    if (projectMatch) {
      modifications.project = projectMatch[1].trim()
    }

    return modifications
  }

  /**
   * Normaliza el mensaje para matching
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^\w\s]/g, ' ')        // Eliminar puntuación
      .replace(/\s+/g, ' ')            // Normalizar espacios
  }

  /**
   * Intenta hacer match con un trigger específico
   */
  private matchTrigger(
    normalizedMessage: string,
    originalMessage: string,
    trigger: ProcessTrigger,
    processId: string,
    context: Partial<ProcessContext>
  ): TriggerMatch | null {
    let confidence = 0
    let extractedData: Record<string, unknown> = {}

    switch (trigger.type) {
      case 'pattern':
        const patternMatch = this.matchPatterns(
          originalMessage,
          trigger.patterns || []
        )
        if (patternMatch) {
          confidence = 0.9
          extractedData = patternMatch.groups || {}
        }
        break

      case 'keyword':
        const keywordMatch = this.matchKeywords(
          normalizedMessage,
          trigger.keywords || []
        )
        if (keywordMatch) {
          confidence = keywordMatch.exact ? 0.95 : 0.7
        }
        break

      case 'intent':
        // Los intents se matchean con keywords semánticos
        const intentMatch = this.matchIntentKeywords(
          normalizedMessage,
          trigger.intents || []
        )
        if (intentMatch) {
          confidence = intentMatch.confidence
        }
        break

      case 'command':
        const commandMatch = this.matchCommands(
          normalizedMessage,
          trigger.commands || []
        )
        if (commandMatch) {
          confidence = 1.0  // Comandos exactos tienen máxima confianza
        }
        break
    }

    if (confidence === 0) {
      return null
    }

    // Verificar condición adicional si existe
    if (trigger.condition) {
      const fullContext = context as ProcessContext
      if (!trigger.condition(fullContext)) {
        return null
      }
    }

    return {
      processId,
      trigger,
      confidence,
      extractedData
    }
  }

  /**
   * Match con patrones regex
   */
  private matchPatterns(
    message: string,
    patterns: RegExp[]
  ): RegExpMatchArray | null {
    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match) {
        return match
      }
    }
    return null
  }

  /**
   * Match con keywords
   */
  private matchKeywords(
    normalizedMessage: string,
    keywords: string[]
  ): { exact: boolean } | null {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase().trim()

      // Match exacto
      if (normalizedMessage === normalizedKeyword) {
        return { exact: true }
      }

      // Match parcial (contiene el keyword)
      if (normalizedMessage.includes(normalizedKeyword)) {
        return { exact: false }
      }
    }
    return null
  }

  /**
   * Match semántico para intents
   * Mapea intents a grupos de keywords
   */
  private matchIntentKeywords(
    normalizedMessage: string,
    intents: string[]
  ): { confidence: number } | null {
    const intentKeywordMap: Record<string, string[]> = {
      // Creación de tareas
      'TASK_CREATE': [
        'crear tarea', 'crea tarea', 'nueva tarea', 'agregar tarea',
        'create task', 'new task', 'add task',
        'necesito una tarea', 'quiero crear', 'agrega una tarea'
      ],

      // Consulta de tareas
      'TASK_QUERY': [
        'mis tareas', 'mostrar tareas', 'ver tareas', 'lista tareas',
        'cuantas tareas', 'que tareas', 'buscar tarea',
        'my tasks', 'show tasks', 'list tasks'
      ],

      // Actualización de tareas
      'TASK_UPDATE': [
        'actualizar tarea', 'editar tarea', 'modificar tarea',
        'cambiar tarea', 'update task', 'edit task',
        'cambiar estado', 'cambiar prioridad', 'asignar tarea'
      ],

      // Archivar/eliminar
      'TASK_ARCHIVE': [
        'eliminar tarea', 'borrar tarea', 'archivar tarea',
        'delete task', 'archive task', 'remove task',
        'cancelar tarea'
      ],

      // Carga de trabajo
      'WORKLOAD': [
        'carga de trabajo', 'workload', 'cuantas tareas tiene',
        'tareas del equipo', 'distribucion de tareas',
        'quien tiene mas tareas', 'balance de carga'
      ],

      // Búsqueda de cliente
      'CLIENT_SEARCH': [
        'buscar cliente', 'cliente', 'para el cliente',
        'pertenece a', 'del cliente', 'search client'
      ],

      // Crear cliente
      'CLIENT_CREATE': [
        'crear cliente', 'nuevo cliente', 'agregar cliente',
        'create client', 'new client'
      ],

      // Analytics
      'ANALYTICS': [
        'reporte', 'estadisticas', 'metricas', 'resumen',
        'report', 'stats', 'metrics', 'summary',
        'horas del proyecto', 'tiempo registrado'
      ],

      // Ayuda
      'HELP': [
        'ayuda', 'help', 'que puedes hacer', 'comandos',
        'como funciona', 'instrucciones'
      ],

      // Confirmación
      'CONFIRM': [
        'si', 'confirmo', 'adelante', 'ok', 'yes', 'confirm',
        'dale', 'hazlo', 'procede', 'correcto', 'esta bien'
      ],

      // Cancelación
      'CANCEL': [
        'no', 'cancelar', 'cancel', 'detener', 'olvida',
        'no quiero', 'dejalo', 'para', 'stop'
      ]
    }

    let bestMatch: { intent: string; confidence: number } | null = null

    for (const intent of intents) {
      const keywords = intentKeywordMap[intent] || []
      let matchScore = 0

      for (const keyword of keywords) {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          // Keywords más largos tienen más peso
          const score = keyword.length / normalizedMessage.length
          matchScore = Math.max(matchScore, Math.min(0.95, 0.6 + score))
        }
      }

      if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.confidence)) {
        bestMatch = { intent, confidence: matchScore }
      }
    }

    return bestMatch
  }

  /**
   * Match con comandos (slash commands o similares)
   */
  private matchCommands(
    normalizedMessage: string,
    commands: string[]
  ): boolean {
    for (const command of commands) {
      if (normalizedMessage.startsWith(command.toLowerCase())) {
        return true
      }
    }
    return false
  }

  /**
   * Detecta si el mensaje es una confirmación
   */
  private isConfirmation(normalized: string): boolean {
    const confirmationPatterns = [
      /^(si|sí|yes|ok|okay|dale|confirmo|adelante|hazlo|procede|correcto)$/,
      /^(esta bien|está bien|de acuerdo|afirmativo|claro|por supuesto)$/,
      /confirmar?$/,
      /^s[íi]$/
    ]
    return confirmationPatterns.some(p => p.test(normalized))
  }

  /**
   * Detecta si el mensaje es una cancelación
   */
  private isCancellation(normalized: string): boolean {
    const cancellationPatterns = [
      /^(no|cancel|cancelar|detener|para|stop|olvida)$/,
      /^(no quiero|dejalo|déjalo|mejor no|olvidalo|olvídalo)$/,
      /cancelar?$/
    ]
    return cancellationPatterns.some(p => p.test(normalized))
  }

  /**
   * Extrae entidades del mensaje (nombres, fechas, etc.)
   */
  extractEntities(message: string): Record<string, unknown> {
    const entities: Record<string, unknown> = {}

    // Extraer nombre de tarea (texto entre comillas o después de "llamada/llamado")
    const taskNamePatterns = [
      /"([^"]+)"/,
      /'([^']+)'/,
      /llamad[ao]\s+(.+?)(?:\s+para|\s+del?|\s*$)/i,
      /tarea\s+(?:de\s+)?(.+?)(?:\s+para|\s+del?|\s*$)/i
    ]
    for (const pattern of taskNamePatterns) {
      const match = message.match(pattern)
      if (match) {
        entities.taskName = match[1].trim()
        break
      }
    }

    // Extraer cliente (después de "para" o "del cliente")
    const clientPatterns = [
      /para\s+(?:el\s+)?(?:cliente\s+)?(\w+)/i,
      /del?\s+cliente\s+(\w+)/i,
      /cliente[:\s]+(\w+)/i,
      /pertenece\s+a\s+(\w+)/i
    ]
    for (const pattern of clientPatterns) {
      const match = message.match(pattern)
      if (match) {
        entities.clientName = match[1].trim()
        break
      }
    }

    // Extraer prioridad
    const priorityPatterns = [
      /prioridad\s+(alta|media|baja)/i,
      /(alta|media|baja)\s+prioridad/i,
      /urgente/i
    ]
    for (const pattern of priorityPatterns) {
      const match = message.match(pattern)
      if (match) {
        if (match[0].toLowerCase().includes('urgente')) {
          entities.priority = 'Alta'
        } else {
          entities.priority = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
        }
        break
      }
    }

    // Extraer fecha
    const datePatterns = [
      /para\s+(hoy|mañana|manana)/i,
      /fecha[:\s]+(\d{1,2}[/-]\d{1,2}[/-]?\d{0,4})/i,
      /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i
    ]
    for (const pattern of datePatterns) {
      const match = message.match(pattern)
      if (match) {
        entities.dueDate = this.parseDate(match[0])
        break
      }
    }

    return entities
  }

  /**
   * Parsea una fecha en lenguaje natural
   */
  private parseDate(dateStr: string): string | null {
    const now = new Date()
    const lower = dateStr.toLowerCase()

    if (lower.includes('hoy')) {
      return now.toISOString().split('T')[0]
    }

    if (lower.includes('mañana') || lower.includes('manana')) {
      now.setDate(now.getDate() + 1)
      return now.toISOString().split('T')[0]
    }

    // Intentar parsear fecha numérica
    const numericMatch = dateStr.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/)
    if (numericMatch) {
      const day = parseInt(numericMatch[1])
      const month = parseInt(numericMatch[2]) - 1
      const year = numericMatch[3]
        ? parseInt(numericMatch[3].length === 2 ? '20' + numericMatch[3] : numericMatch[3])
        : now.getFullYear()
      return new Date(year, month, day).toISOString().split('T')[0]
    }

    return null
  }
}

// Singleton para uso global
export const intentDetector = new IntentDetector()
