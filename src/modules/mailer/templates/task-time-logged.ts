/**
 * Mailer Module - Task Time Logged Email Template
 *
 * Template for notifying users when someone logs time on a task.
 */

import { baseEmailLayout, getClientBlock, getPersonBadge } from './layout';

export interface TaskTimeLoggedTemplateData {
  recipientName: string;
  loggerName: string;
  actorImageUrl?: string;
  clientName?: string;
  clientImageUrl?: string;
  taskName: string;
  taskUrl: string;
  timeEntry: string;
  logDate?: string;
  comment?: string;
}

/**
 * Generate HTML email for time logged notification
 */
export const getTaskTimeLoggedTemplate = (data: TaskTimeLoggedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName}</h2>
    <p>
      ${getPersonBadge(data.loggerName, data.actorImageUrl)} ha registrado tiempo en la tarea.
    </p>

    <div class="info-box">
      ${getClientBlock(data.clientName, data.clientImageUrl)}
      <strong>Tarea:</strong>
      <span style="font-size: 17px; font-weight: 600; color: #1a1a1a; display: block; margin-top: 6px;">
        ${data.taskName}
      </span>
      <span style="display: block; margin-top: 10px; font-size: 22px; font-weight: 700; color: #0C0C0C;">
        ${data.timeEntry}
      </span>
      ${
        data.logDate
          ? `<span style="display: block; margin-top: 4px; font-size: 13px; color: #6b7280;">${data.logDate}</span>`
          : ''
      }
    </div>
    ${
      data.comment
        ? `<div style="margin: 16px 0 0; padding: 12px 16px; border-left: 3px solid #D3DE48; background-color: #f9fafb; border-radius: 0 6px 6px 0;">
            <span style="font-size: 13px; color: #6b7280; display: block; margin-bottom: 4px;">Comentario:</span>
            <span style="font-size: 14px; color: #374151;">${data.comment}</span>
          </div>`
        : ''
    }

    <a href="${data.taskUrl}" class="btn">Ir a la Tarea</a>

    <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center;">
      Revisa el desglose de tiempo en los detalles de la tarea.
    </p>
  `;

  return baseEmailLayout(body, `Tiempo registrado en ${data.taskName}`);
};
