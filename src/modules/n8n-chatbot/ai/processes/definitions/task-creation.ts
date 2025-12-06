/**
 * Proceso: Creación de Tareas
 *
 * Flujo estructurado para crear tareas sin depender del LLM
 * para decisiones de flujo. Solo usa tools para operaciones de datos.
 *
 * FLUJO:
 * 1. Extraer nombre de tarea del mensaje
 * 2. Buscar cliente por nombre mencionado
 * 3. Si no existe cliente, ofrecer crearlo
 * 4. Confirmar con el usuario
 * 5. Crear la tarea
 * 6. Responder con éxito
 */

import type { ProcessDefinition, ProcessContext } from '../types'

export const taskCreationProcess: ProcessDefinition = {
  id: 'task-creation',
  name: 'Creación de Tareas',
  description: 'Proceso para crear nuevas tareas con búsqueda automática de cliente',
  version: '1.0.0',

  triggers: [
    {
      type: 'intent',
      intents: ['TASK_CREATE'],
      priority: 100
    },
    {
      type: 'pattern',
      patterns: [
        /^crea(?:r)?\s+(?:una?\s+)?tarea\s+(.+)/i,
        /^nueva\s+tarea\s+(.+)/i,
        /^agregar?\s+tarea\s+(.+)/i,
        /^add\s+task\s+(.+)/i,
        /^create\s+task\s+(.+)/i
      ],
      priority: 110
    },
    {
      type: 'keyword',
      keywords: [
        'crear tarea',
        'nueva tarea',
        'agregar tarea',
        'create task',
        'new task'
      ],
      priority: 90
    }
  ],

  slots: [
    {
      name: 'taskName',
      type: 'string',
      required: true,
      description: 'Nombre/título de la tarea',
      extractFrom: 'message',
      promptIfMissing: '¿Cómo quieres llamar a esta tarea?',
      validation: {
        minLength: 3,
        maxLength: 200
      }
    },
    {
      name: 'clientName',
      type: 'string',
      required: true,
      description: 'Nombre del cliente',
      extractFrom: 'message',
      promptIfMissing: '¿Para qué cliente es esta tarea?'
    },
    {
      name: 'clientId',
      type: 'clientId',
      required: true,
      description: 'ID del cliente (se obtiene buscando)',
      extractFrom: 'tool',
      toolToCall: 'search_clients'
    },
    {
      name: 'priority',
      type: 'string',
      required: false,
      description: 'Prioridad de la tarea',
      defaultValue: 'Media',
      validation: {
        enum: ['Alta', 'Media', 'Baja']
      }
    },
    {
      name: 'project',
      type: 'string',
      required: false,
      description: 'Nombre del proyecto',
      defaultValue: 'chatbotTasks'
    },
    {
      name: 'status',
      type: 'string',
      required: false,
      description: 'Estado inicial',
      defaultValue: 'En Proceso',
      validation: {
        enum: ['Por Iniciar', 'En Proceso', 'Backlog']
      }
    },
    {
      name: 'description',
      type: 'string',
      required: false,
      description: 'Descripción de la tarea'
    }
  ],

  steps: [
    // Paso 1: Recolectar nombre de tarea
    {
      id: 'collect_task_name',
      name: 'Recolectar nombre de tarea',
      type: 'collect',
      slots: ['taskName'],
      nextStep: 'collect_client_name'
    },

    // Paso 2: Recolectar nombre de cliente
    {
      id: 'collect_client_name',
      name: 'Recolectar cliente',
      type: 'collect',
      slots: ['clientName'],
      nextStep: 'search_client'
    },

    // Paso 3: Buscar cliente
    {
      id: 'search_client',
      name: 'Buscar cliente en BD',
      type: 'execute',
      tool: 'search_clients',
      toolArgs: (ctx: ProcessContext) => ({
        query: ctx.slots.clientName as string,
        limit: 5
      }),
      nextStep: 'check_client_found'
    },

    // Paso 4: Verificar si se encontró el cliente
    {
      id: 'check_client_found',
      name: 'Verificar cliente encontrado',
      type: 'branch',
      branches: [
        {
          condition: (ctx: ProcessContext) => {
            const result = ctx.toolResults.search_clients
            if (Array.isArray(result) && result.length > 0) {
              // Guardar el primer cliente encontrado
              ctx.slots.clientId = result[0].id
              ctx.slots.clientFoundName = result[0].name
              return true
            }
            if (result && typeof result === 'object' && 'clients' in result) {
              const clients = (result as { clients: Array<{ id: string; name: string }> }).clients
              if (clients.length > 0) {
                ctx.slots.clientId = clients[0].id
                ctx.slots.clientFoundName = clients[0].name
                return true
              }
            }
            return false
          },
          nextStep: 'confirm_task'
        },
        {
          condition: () => true, // Default: no se encontró
          nextStep: 'client_not_found'
        }
      ]
    },

    // Paso 5a: Cliente no encontrado - ofrecer crear
    {
      id: 'client_not_found',
      name: 'Cliente no encontrado',
      type: 'confirm',
      confirmMessage: (ctx: ProcessContext) =>
        `No encontré un cliente llamado "${ctx.slots.clientName}". ¿Deseas que lo cree?`,
      nextStep: 'create_client'
    },

    // Paso 5b: Crear cliente
    {
      id: 'create_client',
      name: 'Crear nuevo cliente',
      type: 'execute',
      tool: 'create_client',
      toolArgs: (ctx: ProcessContext) => ({
        name: ctx.slots.clientName as string
      }),
      onExit: async (ctx: ProcessContext) => {
        // Extraer el ID del cliente creado
        const result = ctx.toolResults.create_client
        if (result && typeof result === 'object' && 'id' in result) {
          ctx.slots.clientId = (result as { id: string }).id
          ctx.slots.clientFoundName = ctx.slots.clientName
        }
      },
      nextStep: 'confirm_task'
    },

    // Paso 6: Confirmar creación de tarea
    {
      id: 'confirm_task',
      name: 'Confirmar tarea',
      type: 'confirm',
      confirmMessage: (ctx: ProcessContext) => {
        const priority = ctx.slots.priority || 'Media'
        const project = ctx.slots.project || 'chatbotTasks'
        const status = ctx.slots.status || 'En Proceso'

        return `Voy a crear la siguiente tarea:

**Tarea:** ${ctx.slots.taskName}
**Cliente:** ${ctx.slots.clientFoundName}
**Proyecto:** ${project}
**Prioridad:** ${priority}
**Estado:** ${status}

¿Confirmas?`
      },
      nextStep: 'create_task'
    },

    // Paso 7: Crear la tarea
    {
      id: 'create_task',
      name: 'Crear tarea',
      type: 'execute',
      tool: 'create_task',
      toolArgs: (ctx: ProcessContext) => ({
        name: ctx.slots.taskName,
        clientId: ctx.slots.clientId,
        project: ctx.slots.project || 'chatbotTasks',
        priority: ctx.slots.priority || 'Media',
        status: ctx.slots.status || 'En Proceso',
        description: ctx.slots.description || undefined
      }),
      nextStep: 'success_response'
    },

    // Paso 8: Respuesta de éxito
    {
      id: 'success_response',
      name: 'Responder éxito',
      type: 'respond',
      response: (ctx: ProcessContext) => {
        return `✅ Tarea "${ctx.slots.taskName}" creada para ${ctx.slots.clientFoundName}.

La página se recargará para mostrar tu nueva tarea.

¿Quieres agregar personas o cambiar algo? Solo dime. [REFRESH_PAGE]`
      }
      // Sin nextStep = proceso completado
    }
  ],

  initialStep: 'collect_task_name',

  config: {
    requiresConfirmation: true,
    maxRetries: 3,
    timeout: 300000, // 5 minutos
    allowCancel: true,
    trackInHistory: true
  },

  metadata: {
    author: 'Aurin Team',
    createdAt: '2024-12-06',
    tags: ['tasks', 'crud', 'core']
  }
}
