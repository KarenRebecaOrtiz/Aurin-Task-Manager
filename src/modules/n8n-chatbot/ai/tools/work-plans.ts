import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const createWorkPlanTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_work_plan',
    description:
      'Crea un enlace seguro para compartir un plan de trabajo con el cliente. Genera un token único y crea una página pública donde el cliente puede ver los detalles del plan y hacer comentarios. Usa esta herramienta cuando el usuario pida crear una "propuesta", "plan para cliente" o "compartir plan" de una tarea existente.',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description:
            'El nombre exacto de la tarea o plan de trabajo que se quiere compartir con el cliente (debe existir en Firestore).',
        },
      },
      required: ['subject'],
    },
  },
}
