/**
 * Mailer Module - Task Deleted Email Template
 *
 * Template for notifying users when a task is permanently deleted.
 */

import { baseEmailLayout } from './layout';

export interface TaskDeletedTemplateData {
  recipientName: string;
  deleterName: string;
  taskName: string;
  deletionDate: string;
  taskDescription?: string;
}

/**
 * Generate HTML email for task deletion notification
 */
export const getTaskDeletedTemplate = (data: TaskDeletedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      <strong>${data.deleterName}</strong> ha eliminado permanentemente la tarea <strong>"${data.taskName}"</strong>.
    </p>

    <div class="info-box" style="border-left-color: #ef4444; background-color: #fef2f2;">
      <strong style="color: #991b1b;">🗑️ Tarea Eliminada</strong>
      <span style="display: block; margin-top: 8px; font-size: 16px; color: #1f2937;">
        ${data.taskName}
      </span>
      <span style="display: block; margin-top: 8px; font-size: 14px; color: #dc2626;">
        Eliminada el: ${data.deletionDate}
      </span>
    </div>

    ${
      data.taskDescription
        ? `
      <h3>Información de la Tarea Eliminada</h3>
      <p style="color: #6b7280; font-style: italic;">
        ${data.taskDescription}
      </p>
    `
        : ''
    }

    <h3>¿Qué significa esto?</h3>
    <p>
      La tarea ha sido eliminada de forma permanente del sistema. Esto significa que:
    </p>
    <ul style="color: #4b5563; margin-left: 20px; line-height: 1.8;">
      <li>Ya no aparecerá en ninguna vista (activas ni archivadas)</li>
      <li>Todos los mensajes y archivos asociados también fueron eliminados</li>
      <li>Esta acción no se puede deshacer</li>
    </ul>

    <div class="divider"></div>

    <h3>¿Necesitas más información?</h3>
    <p>
      Si tienes preguntas sobre por qué se eliminó esta tarea o necesitas más detalles,
      te recomendamos contactar directamente con <strong>${data.deleterName}</strong> o
      con tu líder de equipo.
    </p>

    <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
      📧 Esta es una notificación informativa. No requiere acción de tu parte.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Eliminada');
};
