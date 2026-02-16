/**
 * Mailer Module - Task Archived/Unarchived Email Templates
 *
 * Templates for notifying users when a task is archived or unarchived.
 */

import { baseEmailLayout, getClientBlock, getPersonBadge } from './layout';

export interface TaskArchivedTemplateData {
  recipientName: string;
  archiverName: string;
  actorImageUrl?: string;
  clientName?: string;
  clientImageUrl?: string;
  taskName: string;
  taskUrl: string;
  archiveDate: string;
}

export interface TaskUnarchivedTemplateData {
  recipientName: string;
  unarchiverName: string;
  actorImageUrl?: string;
  clientName?: string;
  clientImageUrl?: string;
  taskName: string;
  taskUrl: string;
}

/**
 * Generate HTML email for task archived notification
 */
export const getTaskArchivedTemplate = (data: TaskArchivedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName}</h2>
    <p>
      ${getPersonBadge(data.archiverName, data.actorImageUrl)} ha archivado la tarea <strong>"${data.taskName}"</strong>.
    </p>

    <div class="info-box">
      ${getClientBlock(data.clientName, data.clientImageUrl)}
      <strong>Tarea Archivada</strong>
      <span style="display: block; margin-top: 6px; font-size: 15px; color: #1a1a1a;">
        ${data.taskName}
      </span>
      <span style="display: block; margin-top: 6px; font-size: 13px; color: #6b7280;">
        Archivada el ${data.archiveDate}
      </span>
    </div>

    <p>
      La tarea ya no aparecera en tu vista de tareas activas, pero puedes acceder a ella
      en cualquier momento desde la seccion de archivo.
    </p>

    <a href="${data.taskUrl}" class="btn">Ir a la Tarea</a>

    <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center;">
      Si crees que fue archivada por error, contacta con tu equipo para reactivarla.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Archivada');
};

/**
 * Generate HTML email for task unarchived notification
 */
export const getTaskUnarchivedTemplate = (data: TaskUnarchivedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName}</h2>
    <p>
      ${getPersonBadge(data.unarchiverName, data.actorImageUrl)} ha reactivado la tarea <strong>"${data.taskName}"</strong>.
    </p>

    <div class="info-box" style="border-left-color: #10b981;">
      ${getClientBlock(data.clientName, data.clientImageUrl)}
      <strong>Tarea Reactivada</strong>
      <span style="display: block; margin-top: 6px; font-size: 15px; color: #1a1a1a;">
        ${data.taskName}
      </span>
      <span style="display: block; margin-top: 6px; font-size: 13px; color: #059669;">
        Esta tarea esta activa nuevamente
      </span>
    </div>

    <p>
      La tarea vuelve a estar en tu vista de tareas activas. Revisa su estado y coordina
      con tu equipo para retomar el trabajo.
    </p>

    <a href="${data.taskUrl}" class="btn">Ir a la Tarea</a>

    <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center;">
      Usa el chat de la tarea para coordinar con tu equipo.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Reactivada');
};
