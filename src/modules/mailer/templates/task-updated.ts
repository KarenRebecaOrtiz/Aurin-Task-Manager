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
      introMessage = `actualizó el estado de la tarea <strong>"${data.taskName}"</strong>`;
      if (data.oldValue && data.newValue) {
        changeDetails = `
          <div class="info-box">
            <p>
              <strong>Estado anterior:</strong> ${getStatusBadge(data.oldValue)}
              <span style="margin: 0 12px;">→</span>
              <strong>Nuevo estado:</strong> ${getStatusBadge(data.newValue)}
            </p>
          </div>
        `;
      }
      break;

    case 'priority':
      introMessage = `cambió la prioridad de la tarea <strong>"${data.taskName}"</strong>`;
      if (data.oldValue && data.newValue) {
        changeDetails = `
          <div class="info-box">
            <p>
              <strong>Prioridad anterior:</strong> ${getPriorityBadge(data.oldValue)}
              <span style="margin: 0 12px;">→</span>
              <strong>Nueva prioridad:</strong> ${getPriorityBadge(data.newValue)}
            </p>
          </div>
        `;
      }
      break;

    case 'dates':
      introMessage = `actualizó las fechas de la tarea <strong>"${data.taskName}"</strong>`;
      changeDetails = `
        <div class="info-box">
          ${
            data.startDate
              ? `<p><strong>Nueva fecha de inicio:</strong> ${data.startDate}</p>`
              : ''
          }
          ${data.endDate ? `<p><strong>Nueva fecha de vencimiento:</strong> ${data.endDate}</p>` : ''}
        </div>
      `;
      break;

    case 'assignment':
      introMessage = `modificó la asignación de la tarea <strong>"${data.taskName}"</strong>`;
      changeDetails = `
        <div class="info-box">
          ${
            data.leadersList
              ? `<p><strong>Líderes actualizados:</strong> ${data.leadersList}</p>`
              : ''
          }
          ${
            data.assignedList
              ? `<p><strong>Colaboradores actualizados:</strong> ${data.assignedList}</p>`
              : ''
          }
        </div>
      `;
      break;

    default:
      introMessage = `realizó cambios en la tarea <strong>"${data.taskName}"</strong>`;
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
