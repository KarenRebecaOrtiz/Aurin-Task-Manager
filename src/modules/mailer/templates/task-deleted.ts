/**
 * Mailer Module - Task Deleted Email Template
 *
 * Template for notifying users when a task is permanently deleted.
 */

import { baseEmailLayout, getClientBlock, getPersonBadge } from './layout';

export interface TaskDeletedTemplateData {
  recipientName: string;
  deleterName: string;
  actorImageUrl?: string;
  clientName?: string;
  clientImageUrl?: string;
  taskName: string;
  taskDescription?: string;
  taskUrl?: string;
  deletionDate: string;
}

/**
 * Generate HTML email for task deletion notification
 */
export const getTaskDeletedTemplate = (data: TaskDeletedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName}</h2>
    <p>
      ${getPersonBadge(data.deleterName, data.actorImageUrl)} ha eliminado la tarea <strong>"${data.taskName}"</strong>.
    </p>

    <div class="info-box" style="border-left-color: #ef4444; background-color: #fef2f2;">
      ${getClientBlock(data.clientName, data.clientImageUrl)}
      <strong style="color: #991b1b;">Tarea Eliminada</strong>
      <span style="display: block; margin-top: 6px; font-size: 15px; color: #1a1a1a;">
        ${data.taskName}
      </span>
      <span style="display: block; margin-top: 6px; font-size: 13px; color: #dc2626;">
        Eliminada el ${data.deletionDate}
      </span>
    </div>

    ${
      data.taskDescription
        ? `
      <p style="color: #6b7280; font-style: italic; font-size: 14px;">
        ${data.taskDescription}
      </p>
    `
        : ''
    }

    <p>
      La tarea, sus mensajes y archivos asociados fueron eliminados de forma permanente.
      Si tienes preguntas, contacta con ${getPersonBadge(data.deleterName, data.actorImageUrl)}.
    </p>

    <p style="margin-top: 20px; font-size: 13px; color: #9ca3af; text-align: center;">
      Esta es una notificacion informativa. No requiere accion de tu parte.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Eliminada');
};
