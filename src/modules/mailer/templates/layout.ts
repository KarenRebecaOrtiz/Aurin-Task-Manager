/**
 * Mailer Module - Base Email Layout (View Layer)
 *
 * DRY Principle: All emails share this base structure.
 * Change styles/header/footer once, affects all emails.
 *
 * Using ES6 Template Literals for:
 * - Zero dependencies
 * - Native performance
 * - Type safety
 * - Serverless-friendly (no compilation needed)
 */

/**
 * Base email layout with consistent styling
 * @param content - HTML content to inject into the body
 * @param title - Email title for the header
 * @returns Complete HTML email string
 */
export const baseEmailLayout = (content: string, title: string): string => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      color: #333333;
      line-height: 1.6;
      background-color: #f4f4f5;
      padding: 20px;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }

    .email-header h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .email-body {
      padding: 40px 30px;
    }

    .email-body h2 {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
    }

    .email-body h3 {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      margin-top: 24px;
    }

    .email-body p {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 16px;
    }

    .info-box {
      background-color: #f9fafb;
      border-left: 4px solid #667eea;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .info-box strong {
      color: #1f2937;
      display: block;
      margin-bottom: 4px;
    }

    .info-box span {
      color: #6b7280;
      font-size: 15px;
    }

    .btn {
      display: inline-block;
      padding: 12px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 16px;
      margin-top: 20px;
      transition: transform 0.2s;
    }

    .btn:hover {
      transform: translateY(-2px);
    }

    .email-footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .email-footer p {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }

    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 24px 0;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: #dbeafe;
      color: #1e40af;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      margin: 4px 0;
    }

    .badge.priority-high {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .badge.priority-medium {
      background-color: #fef3c7;
      color: #92400e;
    }

    .badge.priority-low {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .badge.status {
      background-color: #f3e8ff;
      color: #6b21a8;
    }

    @media only screen and (max-width: 600px) {
      .email-body {
        padding: 30px 20px;
      }

      .email-header h1 {
        font-size: 20px;
      }

      .btn {
        display: block;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>📋 ${title}</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p><strong>Aurin Task Manager</strong></p>
      <p>Sistema de Gestión de Tareas y Proyectos</p>
      <div class="divider" style="margin: 16px auto; max-width: 200px;"></div>
      <p>
        Este es un correo automático. Para gestionar tus notificaciones,
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/config">visita tu configuración</a>.
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Helper to generate priority badge HTML
 */
export const getPriorityBadge = (priority: string): string => {
  const priorityLower = priority.toLowerCase();
  let badgeClass = 'badge';

  if (priorityLower.includes('alta') || priorityLower.includes('high')) {
    badgeClass += ' priority-high';
  } else if (priorityLower.includes('media') || priorityLower.includes('medium')) {
    badgeClass += ' priority-medium';
  } else if (priorityLower.includes('baja') || priorityLower.includes('low')) {
    badgeClass += ' priority-low';
  }

  return `<span class="${badgeClass}">${priority}</span>`;
};

/**
 * Helper to generate status badge HTML
 */
export const getStatusBadge = (status: string): string => {
  return `<span class="badge status">${status}</span>`;
};
