/**
 * Mailer Module - Team Member Added Email Template
 *
 * Template for notifying users when they are added to a team,
 * or when someone else is added to a team they're in.
 */

import { baseEmailLayout } from './layout';

/**
 * Data for "you were added to a team" notification
 */
export interface TeamMemberAddedYouTemplateData {
  recipientName: string;
  /** Who added them to the team */
  adderName: string;
  teamName: string;
  teamDescription?: string;
  teamUrl: string;
  /** List of current team members */
  membersList?: string;
  /** Total member count */
  memberCount?: number;
}

/**
 * Data for "someone else was added to your team" notification
 */
export interface TeamMemberAddedOtherTemplateData {
  recipientName: string;
  /** Who added the new member */
  adderName: string;
  /** Name of the new member */
  newMemberName: string;
  teamName: string;
  teamUrl: string;
}

/**
 * Generate HTML email for "you were added to a team" notification
 * This notification is NOT configurable - always sent when someone is added
 */
export const getTeamMemberAddedYouTemplate = (data: TeamMemberAddedYouTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      <strong>${data.adderName}</strong> te ha agregado a un equipo de trabajo.
    </p>

    <div class="info-box">
      <strong>👥 Equipo:</strong>
      <span style="font-size: 18px; font-weight: 600; color: #1f2937; display: block; margin-top: 8px;">
        ${data.teamName}
      </span>
    </div>

    ${
      data.teamDescription
        ? `
      <h3>Descripción</h3>
      <p>${data.teamDescription}</p>
    `
        : ''
    }

    <div class="divider"></div>

    ${
      data.membersList
        ? `
      <h3>Miembros del equipo${data.memberCount ? ` (${data.memberCount})` : ''}</h3>
      <p>${data.membersList}</p>
    `
        : ''
    }

    <p>Ahora puedes colaborar con tu equipo a través del chat grupal.</p>

    <a href="${data.teamUrl}" class="btn">Ir al Equipo</a>

    <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
      💡 <strong>Tip:</strong> Puedes configurar tus preferencias de notificaciones desde el chat del equipo.
    </p>
  `;

  return baseEmailLayout(body, 'Te han agregado a un equipo');
};

/**
 * Generate HTML email for "someone else was added to your team" notification
 * This notification IS configurable via team preferences
 */
export const getTeamMemberAddedOtherTemplate = (data: TeamMemberAddedOtherTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      <strong>${data.adderName}</strong> ha agregado a <strong>${data.newMemberName}</strong> al equipo.
    </p>

    <div class="info-box">
      <strong>👥 Equipo:</strong>
      <span style="font-size: 18px; font-weight: 600; color: #1f2937; display: block; margin-top: 8px;">
        ${data.teamName}
      </span>
    </div>

    <p>El equipo tiene un nuevo integrante. Puedes darle la bienvenida en el chat grupal.</p>

    <a href="${data.teamUrl}" class="btn">Ir al Equipo</a>
  `;

  return baseEmailLayout(body, 'Nuevo miembro en tu equipo');
};
