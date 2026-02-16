/**
 * Mailer Module - Base Email Layout (View Layer)
 *
 * DRY Principle: All emails share this base structure.
 * Change styles/header/footer once, affects all emails.
 */

/**
 * Base email layout with consistent Aurin branding
 */
export const baseEmailLayout = (content: string, title: string): string => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <style>
    .email-container { width: 600px !important; }
    .email-header { background-color: #D3DE48 !important; }
    .btn { background-color: #D3DE48 !important; color: #0C0C0C !important; }
  </style>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      color: #1a1a1a;
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
    }

    .email-header {
      background-color: #D3DE48;
      color: #0C0C0C;
      padding: 24px 20px;
      text-align: center;
    }

    .email-header h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      color: #0C0C0C;
      letter-spacing: -0.3px;
    }

    .email-body {
      padding: 36px 30px;
    }

    .email-body h2 {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
    }

    .email-body h3 {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
      margin-top: 20px;
    }

    .email-body p {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 14px;
    }

    .info-box {
      background-color: #f9fafb;
      border-left: 4px solid #D3DE48;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }

    .info-box strong {
      color: #1a1a1a;
      display: block;
      margin-bottom: 4px;
    }

    .info-box span {
      color: #4b5563;
      font-size: 15px;
    }

    .client-label {
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      vertical-align: middle;
      margin-right: 8px;
      border: 2px solid #ffffff;
    }

    .avatar-sm {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      vertical-align: middle;
      margin-right: 4px;
      border: 1px solid #e5e7eb;
    }

    .avatar-stack {
      display: inline-block;
    }

    .avatar-stack .avatar-sm {
      margin-right: -6px;
    }

    .person-inline {
      display: inline;
      white-space: nowrap;
    }

    .person-inline img {
      vertical-align: middle;
      position: relative;
      top: -1px;
    }

    .btn {
      display: block;
      width: 100%;
      padding: 14px 28px;
      background-color: #D3DE48;
      color: #0C0C0C !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      margin-top: 24px;
      text-align: center;
    }

    .email-footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .email-footer img {
      height: 28px;
      width: auto;
      margin-bottom: 14px;
    }

    .email-footer p {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 6px;
    }

    .email-footer a {
      color: #6b7280;
      text-decoration: underline;
    }

    .email-footer .bell-icon {
      display: inline-block;
      vertical-align: middle;
      width: 14px;
      height: 14px;
      margin-right: 2px;
    }

    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 20px 0;
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
      .email-body { padding: 24px 20px; }
      .email-header h1 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${title}</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <div style="max-width: 80px; margin: 0 auto;">
        <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logoLight.svg" alt="Aurin" style="display: block; width: 100%;" />
      </div>
      <p>
        Puedes gestionar las notificaciones de cada tarea o equipo
        desde el icono de campana en su chat.
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

/**
 * Helper to generate client context block with optional avatar
 */
export const getClientBlock = (clientName?: string, clientImageUrl?: string): string => {
  if (!clientName) return '';
  const avatar = clientImageUrl
    ? `<img src="${clientImageUrl}" alt="${clientName}" class="avatar-sm" /> `
    : '';
  return `<p class="client-label">${avatar}Cliente: ${clientName}</p>`;
};

/**
 * Helper to generate a person reference with avatar bubble
 */
export const getPersonBadge = (name: string, imageUrl?: string): string => {
  const avatar = imageUrl
    ? `<img src="${imageUrl}" alt="${name}" class="avatar-sm" />`
    : '';
  return `<span class="person-inline">${avatar}<strong>${name}</strong></span>`;
};
