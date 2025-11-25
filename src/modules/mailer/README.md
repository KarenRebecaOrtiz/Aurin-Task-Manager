# Mailer Module

> **Unified email notification system for Aurin Task Manager**
> Built with SOLID principles, DRY, and serverless-optimized architecture.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Email Templates](#email-templates)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

---

## Architecture

This module follows a **layered architecture** with clear separation of concerns:

```
src/modules/mailer/
├── index.ts                    # 🎭 Facade Pattern - Public API
├── config.ts                   # ⚙️ Configuration Layer
├── transporter.ts              # 🚚 Infrastructure Layer (NodeMailer)
├── templates/                  # 🎨 View Layer (Email Templates)
│   ├── layout.ts              # Base HTML layout (DRY)
│   ├── task-created.ts        # Task creation template
│   ├── task-updated.ts        # Task update template
│   ├── task-archived.ts       # Archive/Unarchive templates
│   └── task-deleted.ts        # Task deletion template
├── services/                   # 🧠 Application Layer (Business Logic)
│   └── notification.service.ts
└── _deprecated/                # 🗑️ Old code (for reference)
```

### Design Principles

1. **Single Responsibility Principle (SRP)**
   - Each file has ONE clear purpose
   - `transporter.ts` only handles email sending
   - `templates/` only handle HTML generation
   - `services/` only orchestrate business logic

2. **Dependency Inversion Principle (DIP)**
   - Application code depends on `mailer` facade, not NodeMailer
   - Easy to swap NodeMailer for SendGrid, Resend, etc.

3. **Open/Closed Principle (OCP)**
   - Easy to add new notification types without modifying existing code
   - Just add a new template and facade method

4. **DRY (Don't Repeat Yourself)**
   - All emails share the same base layout
   - Template helpers for common patterns (badges, formatting)

5. **Serverless-Optimized**
   - No heavy dependencies (handlebars, pug, etc.)
   - Native ES6 template literals for zero overhead
   - Lazy initialization of transporter

---

## Quick Start

### 1. Environment Setup

Add these variables to your `.env` file:

```bash
# Required
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional
EMAIL_FROM="Aurin Task Manager <no-reply@aurin.com>"
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### 2. Import and Use

```typescript
import { mailer } from '@/modules/mailer';

// Send task created notification
await mailer.notifyTaskCreated({
  recipientIds: ['user1', 'user2'],
  taskId: 'task123',
  actorId: 'currentUser',
});
```

That's it! The mailer handles everything else.

---

## Configuration

### Email Provider Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Create a new app password
   - Use it as `EMAIL_PASS`

### Switching to Another Provider

To switch from Gmail to another provider (e.g., SendGrid, Mailgun, Resend):

**Only modify `transporter.ts`** - all other code remains unchanged!

Example for SendGrid:

```typescript
// transporter.ts
import sgMail from '@sendgrid/mail';

export async function sendEmailInternal(options: MailOptions) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  const msg = {
    to: options.to,
    from: mailConfig.from,
    subject: options.subject,
    html: options.html,
  };

  const result = await sgMail.send(msg);
  return { success: true, messageId: result[0].headers['x-message-id'] };
}
```

---

## Usage Examples

### Basic Notifications

```typescript
// Task Created
await mailer.notifyTaskCreated({
  recipientIds: ['user1', 'user2'],
  taskId: 'task-abc',
  actorId: 'creator-123',
});

// Task Updated (General)
await mailer.notifyTaskUpdated({
  recipientIds: ['user1'],
  taskId: 'task-abc',
  actorId: 'updater-456',
});
```

### Specific Change Notifications

```typescript
// Status Changed
await mailer.notifyTaskStatusChanged({
  recipientIds: ['user1', 'user2'],
  taskId: 'task-abc',
  actorId: 'user123',
  oldStatus: 'Por Iniciar',
  newStatus: 'En Progreso',
});

// Priority Changed
await mailer.notifyTaskPriorityChanged({
  recipientIds: ['user1'],
  taskId: 'task-abc',
  actorId: 'user123',
  oldPriority: 'Media',
  newPriority: 'Alta',
});

// Dates Changed
await mailer.notifyTaskDatesChanged({
  recipientIds: ['user1'],
  taskId: 'task-abc',
  actorId: 'user123',
});

// Assignment Changed
await mailer.notifyTaskAssignmentChanged({
  recipientIds: ['user1', 'user2'],
  taskId: 'task-abc',
  actorId: 'user123',
});
```

### Lifecycle Notifications

```typescript
// Task Archived
await mailer.notifyTaskArchived({
  recipientIds: ['user1'],
  taskId: 'task-abc',
  actorId: 'user123',
});

// Task Unarchived
await mailer.notifyTaskUnarchived({
  recipientIds: ['user1'],
  taskId: 'task-abc',
  actorId: 'user123',
});

// Task Deleted
await mailer.notifyTaskDeleted({
  recipientIds: ['user1', 'user2'],
  taskId: 'task-abc',
  actorId: 'user123',
});
```

### Error Handling

```typescript
// The mailer is non-throwing by design
const result = await mailer.notifyTaskCreated({
  recipientIds: ['user1'],
  taskId: 'task-abc',
  actorId: 'user123',
});

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
// Even if email fails, your task creation will succeed
```

### Health Checks

```typescript
// Check if mailer is configured
if (!mailer.isConfigured()) {
  console.warn('Email service not configured');
}

// Verify transporter connection
const isHealthy = await mailer.verify();
console.log('Mailer health:', isHealthy ? 'OK' : 'ERROR');
```

---

## API Reference

### `mailer` Object

All methods return `Promise<{ success: boolean; sent: number; failed: number }>`

#### Task Creation

```typescript
mailer.notifyTaskCreated(params: {
  recipientIds: string[];
  taskId: string;
  actorId: string;
}): Promise<Result>
```

#### Task Updates

```typescript
mailer.notifyTaskUpdated(params: {...}): Promise<Result>
mailer.notifyTaskStatusChanged(params: {..., oldStatus, newStatus}): Promise<Result>
mailer.notifyTaskPriorityChanged(params: {..., oldPriority, newPriority}): Promise<Result>
mailer.notifyTaskDatesChanged(params: {...}): Promise<Result>
mailer.notifyTaskAssignmentChanged(params: {...}): Promise<Result>
```

#### Task Lifecycle

```typescript
mailer.notifyTaskArchived(params: {...}): Promise<Result>
mailer.notifyTaskUnarchived(params: {...}): Promise<Result>
mailer.notifyTaskDeleted(params: {...}): Promise<Result>
```

#### Utilities

```typescript
mailer.isConfigured(): boolean
mailer.validate(): void // throws if invalid config
mailer.verify(): Promise<boolean>
```

---

## Email Templates

All templates share a beautiful base layout with:

- 📱 Responsive design (mobile-friendly)
- 🎨 Modern gradient header
- 🏷️ Dynamic badges for priority/status
- 🔗 Call-to-action buttons
- 📧 Unsubscribe link in footer

### Template Data

Each template receives specific data from Firestore:

```typescript
interface CommonTemplateData {
  recipientName: string;
  taskName: string;
  taskUrl: string;
  taskDescription?: string;
  priority?: string; // Rendered as colored badge
  status?: string;   // Rendered as badge
  startDate?: string; // Formatted as "15 de enero de 2025"
  endDate?: string;
  leadersList?: string; // "Juan, María, Pedro"
  assignedList?: string;
}
```

### Customizing Templates

To customize a template, edit the corresponding file in `templates/`:

```typescript
// templates/task-created.ts
export const getTaskCreatedTemplate = (data: TaskCreatedTemplateData): string => {
  const body = `
    <h2>Hey ${data.recipientName}! 🚀</h2>
    <p>You've got a new task...</p>
    <!-- Your custom HTML here -->
  `;

  return baseEmailLayout(body, 'New Task');
};
```

---

## Migration Guide

### From Old System to New Mailer

**Old Code:**
```typescript
import { emailNotificationService } from '@/services/emailNotificationService';

await emailNotificationService.createEmailNotificationsForRecipients({
  userId,
  message: `Te han asignado la tarea "${taskData.name}"`,
  type: 'task_created',
  taskId,
}, Array.from(recipients));
```

**New Code:**
```typescript
import { mailer } from '@/modules/mailer';

await mailer.notifyTaskCreated({
  recipientIds: recipients,
  taskId,
  actorId: userId,
});
```

**Benefits:**
- ✅ Simpler API (no manual message crafting)
- ✅ Type-safe (autocomplete in your IDE)
- ✅ Better templates (beautiful HTML emails)
- ✅ Automatic recipient filtering (excludes actor)
- ✅ Automatic data fetching (task, user info)

### Files Updated

The following files now use the new mailer:

1. ✅ `/src/app/api/tasks/route.ts` - Task creation
2. ✅ `/src/app/api/tasks/[id]/route.ts` - Task updates
3. ✅ `/src/lib/taskUtils.ts` - Archive/Delete operations

---

## Troubleshooting

### Emails Not Sending

**Check configuration:**
```typescript
import { mailer } from '@/modules/mailer';

// Check if configured
console.log('Configured:', mailer.isConfigured());

// Verify connection
const healthy = await mailer.verify();
console.log('Connection:', healthy);
```

**Common issues:**

1. **"Missing required email configuration"**
   - Solution: Add `EMAIL_USER` and `EMAIL_PASS` to `.env`

2. **"Invalid login"** (Gmail)
   - Solution: Use an App Password, not your regular password
   - Enable 2FA first

3. **Emails in spam**
   - Solution: Add SPF/DKIM records to your domain
   - Use a professional email service (SendGrid, Mailgun)

### Testing Locally

```typescript
// Test email sending without hitting production
const result = await mailer.notifyTaskCreated({
  recipientIds: ['your-test-email@gmail.com'],
  taskId: 'test-task-123',
  actorId: 'test-user',
});

console.log('Test result:', result);
```

### Performance Issues

The mailer is optimized for serverless, but if you notice slowdowns:

1. **Enable caching** for user data (TODO: add Redis cache)
2. **Batch notifications** when possible
3. **Consider queue** for high-volume (e.g., BullMQ, AWS SQS)

---

## Future Enhancements

- [ ] Add email queue for high-volume sends
- [ ] Add email tracking (open rates, clicks)
- [ ] Add unsubscribe management
- [ ] Add email templates for other events (comments, time logs)
- [ ] Add i18n support (Spanish/English templates)
- [ ] Add email preview in development mode

---

## License

Part of Aurin Task Manager - Internal Use Only

---

**Questions?** Contact the development team or check `/src/modules/mailer/_deprecated/` for old implementation reference.
