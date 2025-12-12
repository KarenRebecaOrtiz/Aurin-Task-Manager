'use client';

import { TeamsView } from '@/modules/data-views/teams';

/**
 * TeamsPage - Entry point for the Teams view
 *
 * Provides team collaboration space filtered by workspace.
 * Uses the same container pattern as TasksPage.
 */
export default function TeamsPage() {
  return <TeamsView />;
}
