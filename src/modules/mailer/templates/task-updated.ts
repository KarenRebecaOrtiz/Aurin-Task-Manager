/**
 * Mailer Module - Task Updated Email Template
 *
 * Template for notifying users when a task is updated.
 * Covers: status changes, priority changes, date changes, and assignment changes.
 */

import { baseEmailLayout, getPriorityBadge, getStatusBadge } from './layout';

export interface TaskUpdatedTemplateData {
  recipientName: string;
  updaterName: string;
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
  // Dynamic intro based on update type
  let introMessage = '';
  let changeDetails = '';

  switch (data.updateType) {
    case 'status':
      introMessage = `ha cambiado el status de la tarea <strong>"${data.taskName}"</strong> a ${getStatusBadge(data.newValue || '')}`;
      if (data.oldValue && data.newValue) {
        changeDetails = `
          <div class="info-box">
            <p style="margin-bottom: 8px;">
              <strong>📊 Cambio de Estado:</strong>
            </p>
            <p>
              ${getStatusBadge(data.oldValue)}
              <span style="margin: 0 12px; font-size: 18px;">→</span>
              ${getStatusBadge(data.newValue)}
            </p>
          </div>
        `;
      }
      break;

    case 'priority':
      introMessage = `ha cambiado la prioridad de la tarea <strong>"${data.taskName}"</strong> a ${getPriorityBadge(data.newValue || '')}`;
      if (data.oldValue && data.newValue) {
        changeDetails = `
          <div class="info-box">
            <p style="margin-bottom: 8px;">
              <strong>⚡ Cambio de Prioridad:</strong>
            </p>
            <p>
              ${getPriorityBadge(data.oldValue)}
              <span style="margin: 0 12px; font-size: 18px;">→</span>
              ${getPriorityBadge(data.newValue)}
            </p>
          </div>
        `;
      }
      break;

    case 'dates':
      introMessage = `ha cambiado las fechas de la tarea <strong>"${data.taskName}"</strong>`;
      changeDetails = `
        <div class="info-box">
          <p style="margin-bottom: 8px;">
            <strong>📅 Fechas Actualizadas:</strong>
          </p>
          ${
            data.startDate
              ? `<p><strong>Fecha de inicio:</strong> ${data.startDate}</p>`
              : ''
          }
          ${data.endDate ? `<p><strong>Fecha de vencimiento:</strong> ${data.endDate}</p>` : ''}
        </div>
      `;
      break;

    case 'assignment':
      introMessage = `ha modificado los miembros asignados a la tarea <strong>"${data.taskName}"</strong>`;
      changeDetails = `
        <div class="info-box">
          <p style="margin-bottom: 8px;">
            <strong>👥 Equipo Actualizado:</strong>
          </p>
          ${
            data.leadersList
              ? `<p><strong>Líderes:</strong> ${data.leadersList}</p>`
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
      changeDetails = '';
  }

  const body = `
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      <strong>${data.updaterName}</strong> ${introMessage}.
    </p>

    ${changeDetails}

    ${
      data.taskDescription
        ? `
      <div class="divider"></div>
      <h3>Descripción de la Tarea</h3>
      <p>${data.taskDescription}</p>
    `
        : ''
    }

    <div class="divider"></div>

    <h3>Estado Actual de la Tarea</h3>

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
        <strong>Fecha de inicio:</strong> ${data.startDate}
      </p>
    `
        : ''
    }

    ${
      data.endDate
        ? `
      <p>
        <strong>Fecha de vencimiento:</strong> ${data.endDate}
      </p>
    `
        : ''
    }

    <div class="divider"></div>

    <p>Revisa los cambios completos y mantente al día con el progreso:</p>

    <a href="${data.taskUrl}" class="btn">Ver Tarea Actualizada</a>

    <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
      💬 ¿Tienes preguntas? Usa el chat de la tarea para comunicarte con tu equipo.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Actualizada');
};
