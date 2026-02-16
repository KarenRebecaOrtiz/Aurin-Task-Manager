/**
 * DEV ONLY - Email Template Preview API
 * Returns rendered HTML for all email templates
 * Route: GET /api/dev-tools/email-preview?template=task-created
 *        GET /api/dev-tools/email-preview (returns index of all templates)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskCreatedTemplate } from '@/modules/mailer/templates/task-created';
import { getTaskUpdatedTemplate } from '@/modules/mailer/templates/task-updated';
import { getTaskDeletedTemplate } from '@/modules/mailer/templates/task-deleted';
import {
  getTaskArchivedTemplate,
  getTaskUnarchivedTemplate,
} from '@/modules/mailer/templates/task-archived';
import {
  getTeamMemberAddedYouTemplate,
  getTeamMemberAddedOtherTemplate,
} from '@/modules/mailer/templates/team-member-added';
import { getTeamNewMessageTemplate } from '@/modules/mailer/templates/team-new-message';

// Block in production
const isDev = process.env.NODE_ENV === 'development';

const MOCK_DATA = {
  recipientName: 'Karen Ortiz',
  creatorName: 'Miguel Torres',
  updaterName: 'Miguel Torres',
  deleterName: 'Miguel Torres',
  archiverName: 'Miguel Torres',
  unarchiverName: 'Miguel Torres',
  adderName: 'Miguel Torres',
  senderName: 'Miguel Torres',
  loggerName: 'Miguel Torres',
  actorImageUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=MT&backgroundColor=6366f1&textColor=ffffff',
  clientImageUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AC&backgroundColor=059669&textColor=ffffff',
  clientName: 'Acme Corporation',
  taskName: 'Rediseño de landing page Q1',
  taskDescription: 'Actualizar la landing page principal con el nuevo branding y optimizar la conversión del formulario de contacto.',
  taskObjectives: 'Incrementar la tasa de conversión un 15% y alinear con la nueva guía de marca.',
  taskUrl: 'https://pm.aurincloud.com/dashboard/tasks/abc123',
  teamUrl: 'https://pm.aurincloud.com/dashboard/teams/team456',
  priority: 'Alta',
  status: 'En Progreso',
  startDate: '15 de enero de 2026',
  endDate: '28 de febrero de 2026',
  leadersList: 'Miguel Torres, Ana García',
  assignedList: 'Karen Ortiz, Luis Mendoza, Sofia Reyes',
  archiveDate: '16 de febrero de 2026',
  deletionDate: '16 de febrero de 2026',
  teamName: 'Equipo Diseño Digital',
  teamDescription: 'Equipo encargado del diseño y desarrollo de interfaces digitales para clientes.',
  membersList: 'Miguel Torres, Karen Ortiz, Ana García, Luis Mendoza',
  memberCount: 4,
  newMemberName: 'Sofia Reyes',
  messageSummary: 'Acabo de subir los mockups actualizados al drive. Revisen cuando puedan y dejen comentarios.',
};

const TEMPLATES: Record<string, () => string> = {
  'task-created': () =>
    getTaskCreatedTemplate({
      recipientName: MOCK_DATA.recipientName,
      creatorName: MOCK_DATA.creatorName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskDescription: MOCK_DATA.taskDescription,
      taskObjectives: MOCK_DATA.taskObjectives,
      taskUrl: MOCK_DATA.taskUrl,
      priority: MOCK_DATA.priority,
      status: MOCK_DATA.status,
      startDate: MOCK_DATA.startDate,
      endDate: MOCK_DATA.endDate,
      leadersList: MOCK_DATA.leadersList,
      assignedList: MOCK_DATA.assignedList,
    }),

  'task-updated-status': () =>
    getTaskUpdatedTemplate({
      recipientName: MOCK_DATA.recipientName,
      updaterName: MOCK_DATA.updaterName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskUrl: MOCK_DATA.taskUrl,
      updateType: 'status',
      oldValue: 'Pendiente',
      newValue: 'En Progreso',
      taskDescription: MOCK_DATA.taskDescription,
      priority: MOCK_DATA.priority,
      status: 'En Progreso',
      startDate: MOCK_DATA.startDate,
      endDate: MOCK_DATA.endDate,
    }),

  'task-updated-priority': () =>
    getTaskUpdatedTemplate({
      recipientName: MOCK_DATA.recipientName,
      updaterName: MOCK_DATA.updaterName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskUrl: MOCK_DATA.taskUrl,
      updateType: 'priority',
      oldValue: 'Media',
      newValue: 'Alta',
      priority: 'Alta',
      status: MOCK_DATA.status,
    }),

  'task-updated-dates': () =>
    getTaskUpdatedTemplate({
      recipientName: MOCK_DATA.recipientName,
      updaterName: MOCK_DATA.updaterName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskUrl: MOCK_DATA.taskUrl,
      updateType: 'dates',
      startDate: MOCK_DATA.startDate,
      endDate: MOCK_DATA.endDate,
      priority: MOCK_DATA.priority,
      status: MOCK_DATA.status,
    }),

  'task-updated-assignment': () =>
    getTaskUpdatedTemplate({
      recipientName: MOCK_DATA.recipientName,
      updaterName: MOCK_DATA.updaterName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskUrl: MOCK_DATA.taskUrl,
      updateType: 'assignment',
      leadersList: MOCK_DATA.leadersList,
      assignedList: MOCK_DATA.assignedList,
      priority: MOCK_DATA.priority,
      status: MOCK_DATA.status,
    }),

  'task-updated-general': () =>
    getTaskUpdatedTemplate({
      recipientName: MOCK_DATA.recipientName,
      updaterName: MOCK_DATA.updaterName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskUrl: MOCK_DATA.taskUrl,
      updateType: 'general',
      priority: MOCK_DATA.priority,
      status: MOCK_DATA.status,
    }),

  'task-deleted': () =>
    getTaskDeletedTemplate({
      recipientName: MOCK_DATA.recipientName,
      deleterName: MOCK_DATA.deleterName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskDescription: MOCK_DATA.taskDescription,
      deletionDate: MOCK_DATA.deletionDate,
    }),

  'task-archived': () =>
    getTaskArchivedTemplate({
      recipientName: MOCK_DATA.recipientName,
      archiverName: MOCK_DATA.archiverName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskUrl: MOCK_DATA.taskUrl,
      archiveDate: MOCK_DATA.archiveDate,
    }),

  'task-unarchived': () =>
    getTaskUnarchivedTemplate({
      recipientName: MOCK_DATA.recipientName,
      unarchiverName: MOCK_DATA.unarchiverName,
      actorImageUrl: MOCK_DATA.actorImageUrl,
      clientName: MOCK_DATA.clientName,
      clientImageUrl: MOCK_DATA.clientImageUrl,
      taskName: MOCK_DATA.taskName,
      taskUrl: MOCK_DATA.taskUrl,
    }),

  'team-member-added-you': () =>
    getTeamMemberAddedYouTemplate({
      recipientName: MOCK_DATA.recipientName,
      adderName: MOCK_DATA.adderName,
      adderImageUrl: MOCK_DATA.actorImageUrl,
      teamName: MOCK_DATA.teamName,
      teamDescription: MOCK_DATA.teamDescription,
      teamUrl: MOCK_DATA.teamUrl,
      membersList: MOCK_DATA.membersList,
      memberCount: MOCK_DATA.memberCount,
    }),

  'team-member-added-other': () =>
    getTeamMemberAddedOtherTemplate({
      recipientName: MOCK_DATA.recipientName,
      adderName: MOCK_DATA.adderName,
      adderImageUrl: MOCK_DATA.actorImageUrl,
      newMemberName: MOCK_DATA.newMemberName,
      newMemberImageUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SR&backgroundColor=ec4899&textColor=ffffff',
      teamName: MOCK_DATA.teamName,
      teamUrl: MOCK_DATA.teamUrl,
    }),

  'team-new-message': () =>
    getTeamNewMessageTemplate({
      recipientName: MOCK_DATA.recipientName,
      senderName: MOCK_DATA.senderName,
      senderImageUrl: MOCK_DATA.actorImageUrl,
      teamName: MOCK_DATA.teamName,
      teamUrl: MOCK_DATA.teamUrl,
      messageSummary: MOCK_DATA.messageSummary,
    }),
};

export async function GET(request: NextRequest) {
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const template = request.nextUrl.searchParams.get('template');

  // Return single template as HTML
  if (template && TEMPLATES[template]) {
    const html = TEMPLATES[template]();
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Return list of available templates
  return NextResponse.json({
    templates: Object.keys(TEMPLATES),
    usage: 'GET /api/dev-tools/email-preview?template=task-created',
  });
}
