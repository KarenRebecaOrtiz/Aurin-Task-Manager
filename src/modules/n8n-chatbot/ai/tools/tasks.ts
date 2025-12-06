/**
 * Task management tools for OpenAI function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const searchTasksTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_tasks',
    description: `Busca tareas en Firestore donde el usuario está involucrado (como creador, asignado o líder).
    Sin parámetros retorna todas las tareas ordenadas por fecha de creación (más recientes primero).

    IMPORTANTE - Estructura de datos retornados:
    - id: ID único de la tarea (usar para update_task)
    - name: Nombre/título de la tarea
    - AssignedTo: Array de IDs de usuarios EJECUTORES (quienes trabajan)
    - LeadedBy: Array de IDs de usuarios LÍDERES (quienes supervisan)
    - CreatedBy: ID del usuario creador
    - status: Estado actual de la tarea

    CRÍTICO PARA MODIFICAR ASIGNACIONES:
    - Revisa AMBOS arrays: AssignedTo Y LeadedBy
    - Un usuario puede estar en uno, otro, o ambos
    - Si buscas quitar a alguien, verifica en cuál array está

    ESTADOS DE TAREAS:
    - ACTIVAS (cuentan para carga de trabajo): "En Proceso", "Por Finalizar"
    - INACTIVAS: "Por Iniciar", "Backlog", "Finalizado", "Cancelado"
    `,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Buscar tarea por nombre (búsqueda parcial, case-insensitive)'
        },
        status: {
          type: 'string',
          enum: ['Por Iniciar', 'En Proceso', 'Backlog', 'Por Finalizar', 'Finalizado', 'Cancelado'],
          description: 'Filtrar por estado de la tarea'
        },
        onlyActive: {
          type: 'boolean',
          description: 'Si es true, solo retorna tareas activas (En Proceso, Por Finalizar). Útil para calcular carga de trabajo.'
        },
        priority: {
          type: 'string',
          enum: ['Alta', 'Media', 'Baja'],
          description: 'Filtrar por prioridad'
        },
        clientId: {
          type: 'string',
          description: 'Filtrar por ID del cliente'
        },
        assignedToUserId: {
          type: 'string',
          description: 'Filtrar tareas donde este userId está en el array AssignedTo'
        },
        leadedByUserId: {
          type: 'string',
          description: 'Filtrar tareas donde este userId está en el array LeadedBy'
        },
        project: {
          type: 'string',
          description: 'Filtrar por nombre del proyecto'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (útil para "última tarea" = 1)'
        },
        orderBy: {
          type: 'string',
          enum: ['createdAt', 'updatedAt', 'name'],
          description: 'Campo por el cual ordenar (default: createdAt)'
        },
        orderDirection: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Dirección de ordenamiento (default: desc - más reciente primero)'
        }
      },
      additionalProperties: false
    }
  }
}

export const createTaskTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_task',
    description: `Crea una nueva tarea en Firestore con DEFAULTS INTELIGENTES.

    FLUJO RECOMENDADO:
    1. Usa search_clients para encontrar el cliente por nombre
    2. De la respuesta, extrae el campo "id" (NO el "name")
    3. Usa ese "id" como clientId al crear la tarea

    CAMPOS REQUERIDOS:
    - name: Título de la tarea
    - clientId: ID del cliente (DEBE ser el "id" retornado por search_clients, ej: "LIBCSBfUHRFh2uPv47Gd", NO el nombre)

    DEFAULTS AUTOMÁTICOS:
    - project: "chatbotTasks" (si no se especifica)
    - status: "En Proceso" (activa desde el inicio)
    - priority: "Media"
    - LeadedBy: [userId del creador]

    IMPORTANTE: El clientId DEBE ser el ID del documento, NO el nombre del cliente.`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Título de la tarea (requerido)'
        },
        clientId: {
          type: 'string',
          description: 'ID del documento del cliente en Firestore (ej: "LIBCSBfUHRFh2uPv47Gd"). NUNCA uses el nombre del cliente aquí, siempre el ID obtenido de search_clients.'
        },
        description: {
          type: 'string',
          description: 'Descripción detallada de la tarea (opcional)'
        },
        project: {
          type: 'string',
          description: 'Nombre del proyecto (default: "chatbotTasks")'
        },
        status: {
          type: 'string',
          enum: ['Por Iniciar', 'En Proceso', 'Backlog', 'Por Finalizar'],
          description: 'Estado inicial (default: "En Proceso")'
        },
        priority: {
          type: 'string',
          enum: ['Alta', 'Media', 'Baja'],
          description: 'Prioridad (default: "Media")'
        },
        AssignedTo: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de IDs de usuarios asignados (opcional)'
        },
        LeadedBy: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de IDs de líderes (default: [creador])'
        }
      },
      required: ['name', 'clientId'],
      additionalProperties: false
    }
  }
}

export const updateTaskTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'update_task',
    description: `Actualiza una tarea existente. Solo actualiza los campos proporcionados.

IMPORTANTE - DOS TIPOS DE USUARIOS EN TAREAS:
- AssignedTo: Usuarios que TRABAJAN en la tarea (ejecutores)
- LeadedBy: Usuarios que SUPERVISAN la tarea (líderes/responsables)

FLUJO PARA MODIFICAR ASIGNACIONES:
1. Busca la tarea con search_tasks para ver AssignedTo Y LeadedBy actuales
2. Verifica en QUÉ array está el usuario (puede estar en ambos)
3. Si el usuario pide "quitar a X" y X está en LeadedBy pero NO en AssignedTo:
   → INFORMA: "X no está asignado, pero es LÍDER. ¿Quieres quitarlo como líder?"
4. Para REMOVER: pasa el array sin ese usuario
5. Para AGREGAR: combina array actual + nuevo ID

EJEMPLO - Remover líder:
- Tarea tiene LeadedBy: ["user1", "user2"]
- Usuario quiere quitar a user1 como líder
- Llamas: update_task({ taskId: "xxx", LeadedBy: ["user2"] })

IMPORTANTE: Siempre revisa AMBOS arrays antes de decir que un usuario no está en la tarea.`,
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tarea a actualizar (requerido). Obtener de search_tasks.'
        },
        name: {
          type: 'string',
          description: 'Nuevo título de la tarea'
        },
        description: {
          type: 'string',
          description: 'Nueva descripción'
        },
        status: {
          type: 'string',
          enum: ['Por Iniciar', 'En Proceso', 'Backlog', 'Por Finalizar', 'Finalizado', 'Cancelado'],
          description: 'Nuevo estado'
        },
        priority: {
          type: 'string',
          enum: ['Alta', 'Media', 'Baja'],
          description: 'Nueva prioridad'
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Nueva fecha de inicio'
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'Nueva fecha de finalización'
        },
        AssignedTo: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array COMPLETO de IDs de EJECUTORES (quienes trabajan en la tarea). Para remover, pasa el array sin ese usuario.'
        },
        LeadedBy: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array COMPLETO de IDs de LÍDERES (quienes supervisan). Para remover, pasa el array sin ese usuario.'
        }
      },
      required: ['taskId'],
      additionalProperties: false
    }
  }
}

export const archiveTaskTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'archive_task',
    description: 'Archiva una tarea (cambia su status a "Cancelado"). IMPORTANTE: Solo administradores pueden archivar tareas. Usar en lugar de eliminar para mantener el historial. Si el usuario pide eliminar, usa esta función en su lugar.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tarea a archivar (requerido)'
        }
      },
      required: ['taskId'],
      additionalProperties: false
    }
  }
}
