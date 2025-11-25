/**
 * Mailer Module - Task Archived/Unarchived Email Templates
 *
 * Templates for notifying users when a task is archived or unarchived.
 */

import { baseEmailLayout } from './layout';

export interface TaskArchivedTemplateData {
  recipientName: string;
  archiverName: string;
  taskName: string;
  taskUrl: string;
  archiveDate: string;
}

export interface TaskUnarchivedTemplateData {
  recipientName: string;
  unarchiverName: string;
  taskName: string;
  taskUrl: string;
}

/**
 * Generate HTML email for task archived notification
 */
export const getTaskArchivedTemplate = (data: TaskArchivedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      <strong>${data.archiverName}</strong> ha archivado la tarea <strong>"${data.taskName}"</strong>.
    </p>

    <div class="info-box">
      <strong>📦 Tarea Archivada</strong>
      <span style="display: block; margin-top: 8px; font-size: 16px; color: #1f2937;">
        ${data.taskName}
      </span>
      <span style="display: block; margin-top: 8px; font-size: 14px; color: #6b7280;">
        Archivada el: ${data.archiveDate}
      </span>
    </div>

    <h3>¿Qué significa esto?</h3>
    <p>
      La tarea ha sido movida al archivo y ya no aparecerá en tu vista de tareas activas.
      Esto generalmente significa que la tarea ha sido completada o ya no es necesaria.
    </p>

    <h3>¿Puedo seguir accediendo a ella?</h3>
    <p>
      Sí, puedes acceder a las tareas archivadas desde la sección de archivo en cualquier momento.
      Las tareas archivadas se mantienen en el sistema para referencia histórica.
    </p>

    <div class="divider"></div>

    <p>Si necesitas revisar los detalles de esta tarea archivada:</p>

    <a href="${data.taskUrl}" class="btn">Ver Tarea Archivada</a>

    <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
      💡 <strong>Nota:</strong> Si crees que esta tarea se archivó por error, contacta con el equipo para que la reactiven.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Archivada');
};

/**
 * Generate HTML email for task unarchived notification
 */
export const getTaskUnarchivedTemplate = (data: TaskUnarchivedTemplateData): string => {
  const body = `
    <h2>Hola, ${data.recipientName} 👋</h2>
    <p>
      <strong>${data.unarchiverName}</strong> ha reactivado la tarea <strong>"${data.taskName}"</strong>.
    </p>

    <div class="info-box" style="border-left-color: #10b981;">
      <strong>🔄 Tarea Reactivada</strong>
      <span style="display: block; margin-top: 8px; font-size: 16px; color: #1f2937;">
        ${data.taskName}
      </span>
      <span style="display: block; margin-top: 8px; font-size: 14px; color: #059669;">
        Esta tarea ha vuelto a estar activa
      </span>
    </div>

    <h3>¿Qué significa esto?</h3>
    <p>
      La tarea ha sido reactivada y ahora aparecerá nuevamente en tu vista de tareas activas.
      Es posible que necesites retomar el trabajo en esta tarea o revisar su estado actual.
    </p>

    <h3>¿Qué debo hacer?</h3>
    <p>
      Te recomendamos revisar la tarea para verificar su estado actual y cualquier actualización
      que pueda haberse realizado. Coordina con tu equipo si es necesario retomar las actividades.
    </p>

    <div class="divider"></div>

    <p>Accede a la tarea reactivada para revisar los detalles:</p>

    <a href="${data.taskUrl}" class="btn">Ver Tarea Reactivada</a>

    <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
      💬 ¿Preguntas? Usa el chat de la tarea para coordinar con tu equipo.
    </p>
  `;

  return baseEmailLayout(body, 'Tarea Reactivada');
};
