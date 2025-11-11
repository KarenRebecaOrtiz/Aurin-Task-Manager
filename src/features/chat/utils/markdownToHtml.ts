import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export function markdownToHtml(markdown: string): string {
  // Convert Markdown to HTML
  const html = marked(markdown, { breaks: true }) as string;

  // Sanitize the HTML to prevent XSS attacks
  const cleanHtml = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'details', 'summary']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title'],
    },
    // Custom transform for list items to ensure proper formatting
    transformTags: {
      'li': function (tagName, attribs) {
        // Add a bullet point for list items if not already present
        if (!attribs['data-list-item']) {
          return {
            tagName: 'li',
            attribs: {
              ...attribs,
              'data-list-item': 'true', // Mark to prevent re-processing
            },
            text: '• ' + (this as any).text, // Prepend bullet
          };
        }
        return { tagName, attribs };
      }
    }
  });

  return cleanHtml;
}
