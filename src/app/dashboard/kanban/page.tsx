'use client';

import DataViewsContainer from '@/modules/data-views/components/DataViewsContainer';

/**
 * KanbanPage - Kanban view entry point
 *
 * Uses the same DataViewsContainer as TasksPage for instant view switching.
 * The container automatically detects the /kanban route and shows the kanban view.
 */
export default function KanbanPage() {
  return <DataViewsContainer />;
}
