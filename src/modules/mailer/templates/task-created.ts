/**
 * Mailer Module - Task Created Email Template
 *
 * Template for notifying users when a new task is created and assigned to them.
 */

import { baseEmailLayout, getPriorityBadge, getStatusBadge, getClientBlock, getPersonBadge } from './layout';

export interface TaskCreatedTemplateData {
  recipientName: string;
  creatorName: string;
  actorImageUrl?: string;
  clientName?: string;
  clientImageUrl?: string;
  taskName: string;
  taskDescription?: string;
  taskObjectives?: string;
  taskUrl: string;
  priority?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  leadersList?: string;
  assignedList?: string;
}

/**
 * Generate HTML email for task creation notification
 */
export const getTaskCreatedTemplate = (data: TaskCreatedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName}</h2>
    <p>
      ${getPersonBadge(data.creatorName, data.actorImageUrl)} te ha asignado una nueva tarea.
    </p>

    <div class="info-box">
      ${getClientBlock(data.clientName, data.clientImageUrl)}
      <strong>Tarea:</strong>
      <span style="font-size: 17px; font-weight: 600; color: #1a1a1a; display: block; margin-top: 6px;">
        ${data.taskName}
      </span>
    </div>

    ${
      data.taskDescription
        ? `
      <h3>Descripcion</h3>
      <p>${data.taskDescription}</p>
    `
        : ''
    }

    ${
      data.taskObjectives
        ? `
      <h3>Objetivos</h3>
      <p>${data.taskObjectives}</p>
    `
        : ''
    }

    <div class="divider"></div>

    <h3>Detalles</h3>

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

    ${
      data.leadersList
        ? `
      <p>
        <strong>Lideres:</strong> ${data.leadersList}
      </p>
    `
        : ''
    }

    ${
      data.assignedList
        ? `
      <p>
        <strong>Asignados:</strong> ${data.assignedList}
      </p>
    `
        : ''
    }

    <div class="divider"></div>

    <a href="${data.taskUrl}" class="btn">Ir a la Tarea</a>

    <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center;">
      Puedes comunicarte con tu equipo desde el chat de la tarea.
    </p>
  `;

  return baseEmailLayout(body, 'Nueva Tarea Asignada');
};
