'use client';

import DataViewsContainer from '@/modules/data-views/components/DataViewsContainer';

/**
 * ArchivePage - Archive view entry point
 *
 * Uses the same DataViewsContainer as TasksPage for instant view switching.
 * The container automatically detects the /archive route and shows the archive view.
 */
export default function ArchivePage() {
  return <DataViewsContainer />;
}
