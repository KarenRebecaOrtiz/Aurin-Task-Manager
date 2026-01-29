/**
 * Mailer Module - Team New Message Email Template
 *
 * Template for notifying users when there's a new message in their team.
 * This notification IS configurable via team preferences.
 */

import { baseEmailLayout } from './layout';

export interface TeamNewMessageTemplateData {
  recipientName: string;
  /** Who sent the message */
  senderName: string;
  teamName: string;
  teamUrl: string;
  /** Preview/summary of the message (truncated) */
  messageSummary?: string;
  /** Timestamp of the message */
  messageTime?: string;
}

/**
 * Generate HTML email for new team message notification
 */
export const getTeamNewMessageTemplate = (data: TeamNewMessageTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      Tienes un nuevo mensaje de <strong>${data.senderName}</strong> en tu equipo.
    </p>

    <div class="info-box">
      <strong>👥 Equipo:</strong>
      <span style="font-size: 18px; font-weight: 600; color: #1f2937; display: block; margin-top: 8px;">
        ${data.teamName}
      </span>
    </div>

    ${
      data.messageSummary
        ? `
      <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #4b5563; font-style: italic;">
          "${data.messageSummary}"
        </p>
        ${
          data.messageTime
            ? `<p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">${data.messageTime}</p>`
            : ''
        }
      </div>
    `
        : ''
    }

    <p>Responde a tu equipo haciendo clic en el botón:</p>

    <a href="${data.teamUrl}" class="btn">Ver Conversación</a>

    <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
      💡 Puedes desactivar estas notificaciones desde las preferencias del equipo.
    </p>
  `;

  return baseEmailLayout(body, `Nuevo mensaje en ${data.teamName}`);
};
