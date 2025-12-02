'use client';

import DataViewsContainer from '@/modules/data-views/components/DataViewsContainer';

/**
 * TasksPage - Main entry point for all data views
 *
 * Uses DataViewsContainer for instant view switching without remounting.
 * Handles /tasks, /kanban, and /archive routes in a single page for performance.
 */
export default function TasksPage() {
  return <DataViewsContainer />;
}
