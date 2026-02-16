/**
 * Mailer Module - Task Updated Email Template
 *
 * Template for notifying users when a task is updated.
 * Covers: status changes, priority changes, date changes, and assignment changes.
 */

import { baseEmailLayout, getPriorityBadge, getStatusBadge, getClientBlock, getPersonBadge } from './layout';

export interface TaskUpdatedTemplateData {
  recipientName: string;
  updaterName: string;
  actorImageUrl?: string;
  clientName?: string;
  clientImageUrl?: string;
  taskName: string;
  taskUrl: string;
  updateType: 'status' | 'priority' | 'dates' | 'assignment' | 'general';
  oldValue?: string;
  newValue?: string;
  taskDescription?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  leadersList?: string;
  assignedList?: string;
}

/**
 * Generate HTML email for task update notification
 */
export const getTaskUpdatedTemplate = (data: TaskUpdatedTemplateData): string => {
  let introMessage = '';
  let changeDetails = '';

  switch (data.updateType) {
    case 'status':
      introMessage = `ha cambiado el estado de la tarea <strong>"${data.taskName}"</strong>`;
      if (data.oldValue && data.newValue) {
        changeDetails = `
          <div class="info-box">
            ${getClientBlock(data.clientName, data.clientImageUrl)}
            <p style="margin-bottom: 8px;">
              <strong>Cambio de Estado:</strong>
            </p>
            <p>
              ${getStatusBadge(data.oldValue)}
              <span style="margin: 0 10px; font-size: 16px;">&#8594;</span>
              ${getStatusBadge(data.newValue)}
            </p>
          </div>
        `;
      }
      break;

    case 'priority':
      introMessage = `ha cambiado la prioridad de la tarea <strong>"${data.taskName}"</strong>`;
      if (data.oldValue && data.newValue) {
        changeDetails = `
          <div class="info-box">
            ${getClientBlock(data.clientName, data.clientImageUrl)}
            <p style="margin-bottom: 8px;">
              <strong>Cambio de Prioridad:</strong>
            </p>
            <p>
              ${getPriorityBadge(data.oldValue)}
              <span style="margin: 0 10px; font-size: 16px;">&#8594;</span>
              ${getPriorityBadge(data.newValue)}
            </p>
          </div>
        `;
      }
      break;

    case 'dates':
      introMessage = `ha actualizado las fechas de la tarea <strong>"${data.taskName}"</strong>`;
      changeDetails = `
        <div class="info-box">
          ${getClientBlock(data.clientName, data.clientImageUrl)}
          <p style="margin-bottom: 8px;">
            <strong>Fechas Actualizadas:</strong>
          </p>
          ${
            data.startDate
              ? `<p><strong>Inicio:</strong> ${data.startDate}</p>`
              : ''
          }
          ${data.endDate ? `<p><strong>Vencimiento:</strong> ${data.endDate}</p>` : ''}
        </div>
      `;
      break;

    case 'assignment':
      introMessage = `ha modificado el equipo de la tarea <strong>"${data.taskName}"</strong>`;
      changeDetails = `
        <div class="info-box">
          ${getClientBlock(data.clientName, data.clientImageUrl)}
          <p style="margin-bottom: 8px;">
            <strong>Equipo Actualizado:</strong>
          </p>
          ${
            data.leadersList
              ? `<p><strong>Lideres:</strong> ${data.leadersList}</p>`
              : ''
          }
          ${
            data.assignedList
              ? `<p><strong>Colaboradores:</strong> ${data.assignedList}</p>`
              : ''
          }
        </div>
      `;
      break;

    default:
      introMessage = `ha realizado cambios en la tarea <strong>"${data.taskName}"</strong>`;
      changeDetails = data.clientName ? `
        <div class="info-box">
          ${getClientBlock(data.clientName, data.clientImageUrl)}
        </div>
      ` : '';
  }

  const body = `
    <h2>Hola, ${data.recipientName}</h2>
    <p>
      ${getPersonBadge(data.updaterName, data.actorImageUrl)} ${introMessage}.
    </p>

    ${changeDetails}

    ${
      data.taskDescription
        ? `
      <div class="divider"></div>
      <h3>Descripcion de la Tarea</h3>
      <p>${data.taskDescription}</p>
    `
        : ''
    }

    <div class="divider"></div>

    <h3>Estado Actual</h3>

    ${
      data.priority
        ? `
      <p>
        <strong>Prioridad:</strong> ${getPriorityBadge(data.priority)}
      </p>
    `
        : ''
    }

    ${
      data.status
        ? `
      <p>
        <strong>Estado:</strong> ${getStatusBadge(data.status)}
      </p>
    `
        : ''
    }

    ${
      data.startDate
        ? `
      <p>
        <strong>Inicio:</strong> ${data.startDate}
      </p>
    `
        : ''
    }

    ${
      data.endDate
        ? `
      <p>
        <strong>Vencimiento:</strong> ${data.endDate}
      </p>
    `
        : ''
    }

    <div class="divider"></div>

    <a href="${data.taskUrl}" class="btn">Ir a la Tarea</a>

    <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center;">
      Usa el chat de la tarea para coordinar con tu equipo.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Actualizada');
};
