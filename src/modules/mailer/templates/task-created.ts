/**
 * Mailer Module - Task Created Email Template
 *
 * Template for notifying users when a new task is created and assigned to them.
 */

import { baseEmailLayout, getPriorityBadge, getStatusBadge } from './layout';

export interface TaskCreatedTemplateData {
  recipientName: string;
  creatorName: string;
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
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      <strong>${data.creatorName}</strong> te ha asignado una nueva tarea en el sistema.
    </p>

    <div class="info-box">
      <strong>📋 Tarea:</strong>
      <span style="font-size: 18px; font-weight: 600; color: #1f2937; display: block; margin-top: 8px;">
        ${data.taskName}
      </span>
    </div>

    ${
      data.taskDescription
        ? `
      <h3>Descripción</h3>
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

    <h3>Detalles de la Tarea</h3>

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
        <strong>Líderes:</strong> ${data.leadersList}
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

    <p>Puedes ver todos los detalles y comenzar a trabajar en esta tarea haciendo clic en el botón:</p>

    <a href="${data.taskUrl}" class="btn">Ver Tarea Completa</a>

    <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
      💡 <strong>Tip:</strong> Puedes comunicarte con tu equipo directamente desde el chat de la tarea.
    </p>
  `;

  return baseEmailLayout(body, 'Nueva Tarea Asignada');
};
