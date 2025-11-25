/**
 * Tests for Mailer Layout Template Module
 */

import { baseEmailLayout, getPriorityBadge, getStatusBadge } from '../templates/layout';

describe('Mailer Layout Templates', () => {
  describe('baseEmailLayout', () => {
    it('should generate complete HTML email structure', () => {
      const content = '<p>Test content</p>';
      const title = 'Test Email';

      const html = baseEmailLayout(content, title);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="es">');
      expect(html).toContain('</html>');
    });

    it('should include title in header and meta tags', () => {
      const content = '<p>Test content</p>';
      const title = 'My Custom Title';

      const html = baseEmailLayout(content, title);

      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(`<h1>📋 ${title}</h1>`);
    });

    it('should inject content into email body', () => {
      const content = '<p>Hello, this is custom content!</p>';
      const title = 'Test';

      const html = baseEmailLayout(content, title);

      expect(html).toContain(content);
    });

    it('should include responsive CSS styles', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain('<style>');
      expect(html).toContain('email-container');
      expect(html).toContain('email-header');
      expect(html).toContain('email-body');
      expect(html).toContain('email-footer');
      expect(html).toContain('@media only screen and (max-width: 600px)');
    });

    it('should include gradient header styling', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    });

    it('should include footer with Aurin branding', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain('Aurin Task Manager');
      expect(html).toContain('Sistema de Gestión de Tareas y Proyectos');
    });

    it('should include configuration link in footer', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain('/dashboard/config');
      expect(html).toContain('visita tu configuración');
    });

    it('should use NEXT_PUBLIC_APP_URL in footer link', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain(process.env.NEXT_PUBLIC_APP_URL);
    });

    it('should define badge styles', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain('.badge {');
      expect(html).toContain('.badge.priority-high');
      expect(html).toContain('.badge.priority-medium');
      expect(html).toContain('.badge.priority-low');
      expect(html).toContain('.badge.status');
    });

    it('should define button styles', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain('.btn {');
      expect(html).toContain('display: inline-block');
    });

    it('should define info-box styles', () => {
      const html = baseEmailLayout('content', 'title');

      expect(html).toContain('.info-box {');
      expect(html).toContain('border-left: 4px solid #667eea');
    });

    it('should handle HTML special characters in title', () => {
      const title = 'Test & <Special> "Characters"';
      const html = baseEmailLayout('content', title);

      expect(html).toContain(title);
    });

    it('should handle multiline content', () => {
      const content = `
        <h2>Title</h2>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
        <div>Div content</div>
      `;
      const html = baseEmailLayout(content, 'Test');

      expect(html).toContain('<h2>Title</h2>');
      expect(html).toContain('<p>Paragraph 1</p>');
      expect(html).toContain('<p>Paragraph 2</p>');
      expect(html).toContain('<div>Div content</div>');
    });
  });

  describe('getPriorityBadge', () => {
    it('should generate badge HTML with correct class for high priority (Spanish)', () => {
      const badge = getPriorityBadge('Alta');

      expect(badge).toContain('<span');
      expect(badge).toContain('class="badge priority-high"');
      expect(badge).toContain('Alta');
      expect(badge).toContain('</span>');
    });

    it('should generate badge HTML with correct class for high priority (English)', () => {
      const badge = getPriorityBadge('High');

      expect(badge).toContain('class="badge priority-high"');
      expect(badge).toContain('High');
    });

    it('should generate badge HTML with correct class for medium priority (Spanish)', () => {
      const badge = getPriorityBadge('Media');

      expect(badge).toContain('class="badge priority-medium"');
      expect(badge).toContain('Media');
    });

    it('should generate badge HTML with correct class for medium priority (English)', () => {
      const badge = getPriorityBadge('Medium');

      expect(badge).toContain('class="badge priority-medium"');
      expect(badge).toContain('Medium');
    });

    it('should generate badge HTML with correct class for low priority (Spanish)', () => {
      const badge = getPriorityBadge('Baja');

      expect(badge).toContain('class="badge priority-low"');
      expect(badge).toContain('Baja');
    });

    it('should generate badge HTML with correct class for low priority (English)', () => {
      const badge = getPriorityBadge('Low');

      expect(badge).toContain('class="badge priority-low"');
      expect(badge).toContain('Low');
    });

    it('should be case-insensitive for priority detection', () => {
      expect(getPriorityBadge('ALTA')).toContain('priority-high');
      expect(getPriorityBadge('alta')).toContain('priority-high');
      expect(getPriorityBadge('AlTa')).toContain('priority-high');
      expect(getPriorityBadge('HIGH')).toContain('priority-high');
      expect(getPriorityBadge('high')).toContain('priority-high');
    });

    it('should default to base badge class for unknown priority', () => {
      const badge = getPriorityBadge('Unknown Priority');

      expect(badge).toContain('class="badge"');
      expect(badge).not.toContain('priority-high');
      expect(badge).not.toContain('priority-medium');
      expect(badge).not.toContain('priority-low');
      expect(badge).toContain('Unknown Priority');
    });

    it('should handle empty string', () => {
      const badge = getPriorityBadge('');

      expect(badge).toContain('<span class="badge">');
      expect(badge).toContain('</span>');
    });

    it('should preserve exact priority text in output', () => {
      const priorities = ['Alta', 'Media', 'Baja', 'High Priority', 'Custom'];

      priorities.forEach((priority) => {
        const badge = getPriorityBadge(priority);
        expect(badge).toContain(`>${priority}</span>`);
      });
    });
  });

  describe('getStatusBadge', () => {
    it('should generate badge HTML with status class', () => {
      const badge = getStatusBadge('En Progreso');

      expect(badge).toContain('<span');
      expect(badge).toContain('class="badge status"');
      expect(badge).toContain('En Progreso');
      expect(badge).toContain('</span>');
    });

    it('should work with different status values', () => {
      const statuses = [
        'Por Iniciar',
        'En Progreso',
        'Completada',
        'Cancelada',
        'En Revisión',
      ];

      statuses.forEach((status) => {
        const badge = getStatusBadge(status);
        expect(badge).toContain('class="badge status"');
        expect(badge).toContain(status);
      });
    });

    it('should handle empty string', () => {
      const badge = getStatusBadge('');

      expect(badge).toContain('<span class="badge status">');
      expect(badge).toContain('</span>');
    });

    it('should preserve exact status text in output', () => {
      const status = 'Custom Status 123!';
      const badge = getStatusBadge(status);

      expect(badge).toContain(`>${status}</span>`);
    });

    it('should handle HTML special characters', () => {
      const status = 'Status & <Test>';
      const badge = getStatusBadge(status);

      // Note: We're not escaping HTML here, just testing the function behavior
      expect(badge).toContain(status);
    });
  });

  describe('Template Integration', () => {
    it('should work together - layout with badges', () => {
      const priorityBadge = getPriorityBadge('Alta');
      const statusBadge = getStatusBadge('En Progreso');

      const content = `
        <h2>Task Details</h2>
        <p>Priority: ${priorityBadge}</p>
        <p>Status: ${statusBadge}</p>
      `;

      const html = baseEmailLayout(content, 'Task Notification');

      expect(html).toContain('class="badge priority-high"');
      expect(html).toContain('class="badge status"');
      expect(html).toContain('Alta');
      expect(html).toContain('En Progreso');
    });

    it('should generate valid HTML structure', () => {
      const content = '<p>Test</p>';
      const html = baseEmailLayout(content, 'Test');

      // Basic HTML validation
      expect(html).toMatch(/<html[^>]*>.*<\/html>/s);
      expect(html).toMatch(/<head>.*<\/head>/s);
      expect(html).toMatch(/<body>.*<\/body>/s);

      // Check proper nesting
      const htmlOpenIndex = html.indexOf('<html');
      const htmlCloseIndex = html.indexOf('</html>');
      const headOpenIndex = html.indexOf('<head>');
      const headCloseIndex = html.indexOf('</head>');
      const bodyOpenIndex = html.indexOf('<body>');
      const bodyCloseIndex = html.indexOf('</body>');

      expect(htmlOpenIndex).toBeLessThan(headOpenIndex);
      expect(headOpenIndex).toBeLessThan(headCloseIndex);
      expect(headCloseIndex).toBeLessThan(bodyOpenIndex);
      expect(bodyOpenIndex).toBeLessThan(bodyCloseIndex);
      expect(bodyCloseIndex).toBeLessThan(htmlCloseIndex);
    });
  });
});
