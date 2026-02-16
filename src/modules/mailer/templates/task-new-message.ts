/**
 * Mailer Module - Task New Message Email Template
 *
 * Template for notifying users when there's a new message in a task chat.
 */

import { baseEmailLayout, getClientBlock, getPersonBadge } from './layout';

export interface TaskNewMessageTemplateData {
  recipientName: string;
  senderName: string;
  actorImageUrl?: string;
  clientName?: string;
  clientImageUrl?: string;
  taskName: string;
  taskUrl: string;
  messageSummary?: string;
}

/**
 * Generate HTML email for new task message notification
 */
export const getTaskNewMessageTemplate = (data: TaskNewMessageTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName}</h2>
    <p>
      ${getPersonBadge(data.senderName, data.actorImageUrl)} ha enviado un mensaje en la tarea.
    </p>

    <div class="info-box">
      ${getClientBlock(data.clientName, data.clientImageUrl)}
      <strong>Tarea:</strong>
      <span style="font-size: 17px; font-weight: 600; color: #1a1a1a; display: block; margin-top: 6px;">
        ${data.taskName}
      </span>
    </div>

    ${
      data.messageSummary
        ? `
      <div style="background-color: #f9fafb; border-left: 4px solid #D3DE48; padding: 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
        <p style="margin: 0; color: #4b5563; font-style: italic;">
          "${data.messageSummary}"
        </p>
      </div>
    `
        : ''
    }

    <a href="${data.taskUrl}" class="btn">Ir a la Tarea</a>

    <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center;">
      Responde desde el chat de la tarea.
    </p>
  `;

  return baseEmailLayout(body, `Nuevo mensaje en ${data.taskName}`);
};
