/**
 * Process Executor - Motor de ejecución de procesos estructurados
 *
 * Ejecuta los pasos de un proceso de forma determinística,
 * manejando la recolección de datos, validaciones, confirmaciones
 * y ejecución de tools.
 */

import type {
  ProcessDefinition,
  ProcessContext,
  ProcessResult,
  ProcessStep,
  ProcessSlot,
  ProcessStatus
} from './types'
import { executeTool } from '../tool-executor'
import { intentDetector } from './intent-detector'

/**
 * Almacén de contextos activos por sesión
 */
const activeContexts: Map<string, ProcessContext> = new Map()

/**
 * Registro de procesos disponibles
 */
const processRegistry: Map<string, ProcessDefinition> = new Map()

/**
 * Registra un proceso en el registry
 */
export function registerProcess(process: ProcessDefinition): void {
  processRegistry.set(process.id, process)
  intentDetector.register(process)
}

/**
 * Obtiene un proceso por ID
 */
export function getProcess(processId: string): ProcessDefinition | undefined {
  return processRegistry.get(processId)
}

/**
 * Obtiene todos los procesos registrados
 */
export function getAllProcesses(): ProcessDefinition[] {
  return Array.from(processRegistry.values())
}

/**
 * Obtiene o crea el contexto de una sesión
 */
export function getContext(sessionId: string): ProcessContext | undefined {
  return activeContexts.get(sessionId)
}

/**
 * Limpia el contexto de una sesión
 */
export function clearContext(sessionId: string): void {
  activeContexts.delete(sessionId)
}

/**
 * Clase principal del executor
 */
export class ProcessExecutor {
  private userId: string
  private sessionId: string
  private isAdmin: boolean
  private userName?: string

  constructor(options: {
    userId: string
    sessionId: string
    isAdmin?: boolean
    userName?: string
  }) {
    this.userId = options.userId
    this.sessionId = options.sessionId
    this.isAdmin = options.isAdmin || false
    this.userName = options.userName
  }

  /**
   * Procesa un mensaje del usuario
   * Retorna null si no hay proceso que maneje el mensaje
   */
  async processMessage(message: string): Promise<ProcessResult | null> {
    const startTime = Date.now()

    // Verificar si hay un proceso activo que debe continuar
    const activeContext = activeContexts.get(this.sessionId)

    if (activeContext) {
      const continuation = intentDetector.shouldContinueProcess(
        message,
        activeContext
      )

      if (continuation.continue) {
        return await this.continueProcess(
          activeContext,
          message,
          continuation.action,
          continuation.modifications
        )
      }

      // Si el usuario no confirma/cancela, podría querer iniciar otro proceso
      // Verificar si el mensaje matchea otro proceso
      const newMatch = intentDetector.detect(message, activeContext)
      if (newMatch && newMatch.processId !== activeContext.processId) {
        // Cancelar proceso actual e iniciar nuevo
        activeContext.status = 'cancelled'
        activeContexts.delete(this.sessionId)
      }
    }

    // Detectar qué proceso ejecutar
    const match = intentDetector.detect(message, {
      userId: this.userId,
      sessionId: this.sessionId,
      userContext: {
        isAdmin: this.isAdmin,
        userName: this.userName
      }
    } as ProcessContext)

    if (!match) {
      return null // No hay proceso que maneje esto
    }

    // Iniciar nuevo proceso
    return await this.startProcess(match.processId, message, match.extractedData)
  }

  /**
   * Inicia un nuevo proceso
   */
  private async startProcess(
    processId: string,
    message: string,
    extractedData?: Record<string, unknown>
  ): Promise<ProcessResult> {
    const process = processRegistry.get(processId)

    if (!process) {
      return {
        success: false,
        processId,
        status: 'error',
        response: `Proceso "${processId}" no encontrado.`,
        error: 'PROCESS_NOT_FOUND'
      }
    }

    // Crear contexto
    const context: ProcessContext = {
      processId,
      sessionId: this.sessionId,
      userId: this.userId,
      status: 'collecting',
      currentStep: process.initialStep,
      slots: {},
      executionHistory: [],
      toolResults: {},
      originalMessage: message,
      pendingResponses: [],
      awaitingConfirmation: false,
      awaitingInput: false,
      userContext: {
        isAdmin: this.isAdmin,
        userName: this.userName
      },
      startedAt: new Date(),
      updatedAt: new Date()
    }

    // Extraer entidades del mensaje original
    const entities = intentDetector.extractEntities(message)

    // Combinar con datos extraídos por el trigger
    const allExtracted = { ...entities, ...extractedData }

    // Poblar slots con datos extraídos
    for (const slot of process.slots) {
      if (allExtracted[slot.name] !== undefined) {
        context.slots[slot.name] = allExtracted[slot.name]
      } else if (slot.defaultValue !== undefined) {
        context.slots[slot.name] = slot.defaultValue
      }
    }

    // Guardar contexto
    activeContexts.set(this.sessionId, context)

    // Ejecutar proceso
    return await this.executeProcess(process, context)
  }

  /**
   * Continúa un proceso existente
   */
  private async continueProcess(
    context: ProcessContext,
    message: string,
    action?: 'confirm' | 'cancel' | 'input' | 'modify',
    modifications?: Record<string, unknown>
  ): Promise<ProcessResult> {
    const process = processRegistry.get(context.processId)

    if (!process) {
      return {
        success: false,
        processId: context.processId,
        status: 'error',
        response: 'Error interno: proceso no encontrado.',
        error: 'PROCESS_NOT_FOUND'
      }
    }

    context.updatedAt = new Date()

    if (action === 'cancel') {
      context.status = 'cancelled'
      activeContexts.delete(this.sessionId)
      return {
        success: true,
        processId: context.processId,
        status: 'cancelled',
        response: 'Operación cancelada. ¿En qué más puedo ayudarte?'
      }
    }

    if (action === 'modify' && modifications) {
      // Aplicar modificaciones a los slots
      for (const [key, value] of Object.entries(modifications)) {
        context.slots[key] = value
      }
      
      // Regenerar mensaje de confirmación con los nuevos valores
      const currentStep = this.findStep(process, context.currentStep)
      if (currentStep?.type === 'confirm' && currentStep.confirmMessage) {
        const confirmMsg = typeof currentStep.confirmMessage === 'function'
          ? currentStep.confirmMessage(context)
          : currentStep.confirmMessage
        
        return {
          success: true,
          processId: context.processId,
          status: 'confirming',
          response: `Actualizado. ${confirmMsg}`,
          awaitingConfirmation: {
            message: confirmMsg,
            data: context.slots
          }
        }
      }
    }

    if (action === 'confirm') {
      context.awaitingConfirmation = false
      // Avanzar al siguiente paso después de confirmación
      const currentStep = this.findStep(process, context.currentStep)
      if (currentStep?.nextStep) {
        context.currentStep = currentStep.nextStep
      }
      return await this.executeProcess(process, context)
    }

    if (action === 'input') {
      // Procesar el input del usuario
      context.awaitingInput = false

      // Encontrar qué slot estamos esperando
      const currentStep = this.findStep(process, context.currentStep)
      if (currentStep?.type === 'collect' && currentStep.slots) {
        for (const slotName of currentStep.slots) {
          const slot = process.slots.find(s => s.name === slotName)
          if (slot && context.slots[slotName] === undefined) {
            // Este es el slot que faltaba
            context.slots[slotName] = this.parseSlotValue(slot, message)
            break
          }
        }
      }

      return await this.executeProcess(process, context)
    }

    return await this.executeProcess(process, context)
  }

  /**
   * Ejecuta los pasos del proceso
   */
  private async executeProcess(
    process: ProcessDefinition,
    context: ProcessContext
  ): Promise<ProcessResult> {
    let iterations = 0
    const maxIterations = 10

    while (iterations < maxIterations) {
      iterations++

      const step = this.findStep(process, context.currentStep)

      if (!step) {
        context.status = 'error'
        return {
          success: false,
          processId: context.processId,
          status: 'error',
          response: 'Error interno: paso no encontrado.',
          error: 'STEP_NOT_FOUND'
        }
      }

      // Ejecutar onEnter si existe
      if (step.onEnter) {
        await step.onEnter(context)
      }

      // Log de ejecución
      context.executionHistory.push({
        step: step.id,
        action: 'enter',
        timestamp: new Date()
      })

      // Ejecutar según tipo de paso
      switch (step.type) {
        case 'collect':
          const collectResult = await this.executeCollectStep(process, step, context)
          if (collectResult) return collectResult
          break

        case 'validate':
          const validateResult = await this.executeValidateStep(step, context)
          if (validateResult) return validateResult
          break

        case 'confirm':
          const confirmResult = await this.executeConfirmStep(step, context)
          if (confirmResult) return confirmResult
          break

        case 'execute':
          const executeResult = await this.executeToolStep(step, context)
          if (executeResult.error) {
            context.status = 'error'
            return {
              success: false,
              processId: context.processId,
              status: 'error',
              response: `Error al ejecutar: ${executeResult.error}`,
              error: executeResult.error
            }
          }
          break

        case 'respond':
          const response = this.buildResponse(step, context)
          context.pendingResponses.push(response)
          break

        case 'branch':
          const branchResult = this.executeBranchStep(step, context)
          if (branchResult) {
            context.currentStep = branchResult
            continue
          }
          break
      }

      // Ejecutar onExit si existe
      if (step.onExit) {
        await step.onExit(context)
      }

      // Determinar siguiente paso
      if (step.nextStep) {
        context.currentStep = step.nextStep
      } else {
        // Proceso completado
        context.status = 'completed'
        activeContexts.delete(this.sessionId)

        return {
          success: true,
          processId: context.processId,
          status: 'completed',
          response: context.pendingResponses.join('\n\n') || 'Operación completada.',
          data: context.toolResults,
          metrics: {
            tokensUsed: 0, // No usamos tokens del LLM
            toolCallsCount: context.executionHistory.filter(e => e.action === 'tool').length,
            durationMs: Date.now() - context.startedAt.getTime()
          }
        }
      }
    }

    return {
      success: false,
      processId: context.processId,
      status: 'error',
      response: 'El proceso excedió el límite de iteraciones.',
      error: 'MAX_ITERATIONS'
    }
  }

  /**
   * Ejecuta un paso de recolección
   */
  private async executeCollectStep(
    process: ProcessDefinition,
    step: ProcessStep,
    context: ProcessContext
  ): Promise<ProcessResult | null> {
    if (!step.slots) return null

    for (const slotName of step.slots) {
      const slot = process.slots.find(s => s.name === slotName)
      if (!slot) continue

      // Si ya tenemos el valor, continuar
      if (context.slots[slotName] !== undefined) continue

      // Intentar obtener el valor
      if (slot.extractFrom === 'tool' && slot.toolToCall) {
        // Ejecutar tool para obtener el valor
        const toolResult = await this.callTool(slot.toolToCall, slot.toolArgs || {}, context)
        if (toolResult.success) {
          context.slots[slotName] = toolResult.data
        }
      } else if (slot.extractFrom === 'default' && slot.defaultValue !== undefined) {
        context.slots[slotName] = slot.defaultValue
      } else if (slot.required) {
        // Necesitamos pedir el dato al usuario
        context.awaitingInput = true
        activeContexts.set(this.sessionId, context)

        return {
          success: true,
          processId: context.processId,
          status: 'collecting',
          response: slot.promptIfMissing || `Por favor, proporciona: ${slot.description}`,
          awaitingInput: {
            slotName,
            prompt: slot.promptIfMissing || slot.description
          }
        }
      }
    }

    return null
  }

  /**
   * Ejecuta un paso de validación
   */
  private async executeValidateStep(
    step: ProcessStep,
    context: ProcessContext
  ): Promise<ProcessResult | null> {
    if (!step.validations) return null

    for (const validation of step.validations) {
      const isValid = this.evaluateCondition(validation.condition, context)

      if (!isValid) {
        if (validation.failAction === 'abort') {
          context.status = 'error'
          return {
            success: false,
            processId: context.processId,
            status: 'error',
            response: validation.errorMessage,
            error: 'VALIDATION_FAILED'
          }
        }
        // retry o skip continúan el proceso
      }
    }

    return null
  }

  /**
   * Ejecuta un paso de confirmación
   */
  private async executeConfirmStep(
    step: ProcessStep,
    context: ProcessContext
  ): Promise<ProcessResult | null> {
    context.awaitingConfirmation = true
    activeContexts.set(this.sessionId, context)

    const message = typeof step.confirmMessage === 'function'
      ? step.confirmMessage(context)
      : step.confirmMessage || '¿Confirmas esta acción?'

    return {
      success: true,
      processId: context.processId,
      status: 'confirming',
      response: message,
      awaitingConfirmation: {
        message,
        data: context.slots
      },
      quickReplies: [
        { label: 'Sí, confirmar', payload: 'confirmar' },
        { label: 'Cancelar', payload: 'cancelar' }
      ]
    }
  }

  /**
   * Ejecuta un paso de tool
   */
  private async executeToolStep(
    step: ProcessStep,
    context: ProcessContext
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (!step.tool) {
      return { success: true }
    }

    const args = typeof step.toolArgs === 'function'
      ? step.toolArgs(context)
      : this.interpolateArgs(step.toolArgs || {}, context)

    return await this.callTool(step.tool, args, context)
  }

  /**
   * Ejecuta un paso de branch
   */
  private executeBranchStep(
    step: ProcessStep,
    context: ProcessContext
  ): string | null {
    if (!step.branches) return null

    for (const branch of step.branches) {
      let matches = false

      if (typeof branch.condition === 'function') {
        matches = branch.condition(context)
      } else {
        matches = this.evaluateCondition(branch.condition, context)
      }

      if (matches) {
        return branch.nextStep
      }
    }

    return null
  }

  /**
   * Llama a un tool
   */
  private async callTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ProcessContext
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    context.executionHistory.push({
      step: context.currentStep,
      action: 'tool',
      timestamp: new Date()
    })

    try {
      const result = await executeTool(
        {
          id: `process_${Date.now()}`,
          type: 'function',
          function: {
            name: toolName,
            arguments: JSON.stringify(args)
          }
        },
        this.userId,
        this.isAdmin
      )

      context.toolResults[toolName] = result

      // Verificar si el resultado indica error
      if (typeof result === 'object' && result !== null && 'success' in result) {
        const typedResult = result as { success: boolean; error?: string }
        if (!typedResult.success) {
          return { success: false, error: typedResult.error || 'Error en tool' }
        }
      }

      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      context.executionHistory.push({
        step: context.currentStep,
        action: 'error',
        timestamp: new Date(),
        error: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Encuentra un paso por ID
   */
  private findStep(process: ProcessDefinition, stepId: string): ProcessStep | undefined {
    return process.steps.find(s => s.id === stepId)
  }

  /**
   * Construye una respuesta
   */
  private buildResponse(step: ProcessStep, context: ProcessContext): string {
    if (typeof step.response === 'function') {
      return step.response(context)
    }
    return this.interpolateString(step.response || '', context)
  }

  /**
   * Interpola argumentos con valores del contexto
   */
  private interpolateArgs(
    args: Record<string, unknown>,
    context: ProcessContext
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        const slotName = value.slice(1)
        result[key] = context.slots[slotName]
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Interpola una string con valores del contexto
   */
  private interpolateString(template: string, context: ProcessContext): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      if (key in context.slots) {
        return String(context.slots[key])
      }
      if (key in context.toolResults) {
        return JSON.stringify(context.toolResults[key])
      }
      return `{${key}}`
    })
  }

  /**
   * Evalúa una condición
   */
  private evaluateCondition(condition: string, context: ProcessContext): boolean {
    // Condiciones simples: "slot.name exists", "slot.name == value"
    if (condition.includes('exists')) {
      const slotName = condition.replace(' exists', '').trim()
      return context.slots[slotName] !== undefined
    }

    if (condition.includes('==')) {
      const [left, right] = condition.split('==').map(s => s.trim())
      const leftValue = left.startsWith('slot.')
        ? context.slots[left.replace('slot.', '')]
        : left

      const rightValue = right.startsWith('"') && right.endsWith('"')
        ? right.slice(1, -1)
        : right

      return leftValue == rightValue
    }

    return true
  }

  /**
   * Parsea el valor de un slot según su tipo
   */
  private parseSlotValue(slot: ProcessSlot, value: string): unknown {
    switch (slot.type) {
      case 'number':
        return parseFloat(value) || 0
      case 'boolean':
        return ['si', 'sí', 'yes', 'true', '1'].includes(value.toLowerCase())
      case 'array':
        return value.split(',').map(s => s.trim())
      case 'date':
        return new Date(value).toISOString()
      default:
        return value
    }
  }
}

/**
 * Factory function para crear un executor
 */
export function createExecutor(options: {
  userId: string
  sessionId: string
  isAdmin?: boolean
  userName?: string
}): ProcessExecutor {
  return new ProcessExecutor(options)
}
