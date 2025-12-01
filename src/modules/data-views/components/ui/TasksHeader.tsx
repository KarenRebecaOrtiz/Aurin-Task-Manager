'use client';

import { Button } from '@/components/ui/buttons';
import { CirclePlus } from 'lucide-react';
import { TaskSearchBar, type SearchCategory, type PriorityLevel, type StatusLevel } from '@/modules/data-views/components/shared/search';
import { ViewSwitcher } from './ViewSwitcher';
import styles from './TasksHeader.module.scss';

interface TasksHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchCategory: SearchCategory | null;
  setSearchCategory: (category: SearchCategory | null) => void;
  onNewTaskOpen: () => void;
  onPriorityFiltersChange?: (priorities: string[]) => void;
  onStatusFiltersChange?: (statuses: StatusLevel[]) => void;
  currentView?: 'table' | 'kanban' | 'archive';
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  searchCategory,
  setSearchCategory,
  onNewTaskOpen,
  onPriorityFiltersChange,
  onStatusFiltersChange,
  currentView = 'table',
}) => {

  // Convert PriorityLevel[] to string[] for the store
  const handlePriorityFiltersChange = (priorities: PriorityLevel[]) => {
    onPriorityFiltersChange?.(priorities as string[]);
  };

  // Convert StatusLevel[] to string[] for the store
  const handleStatusFiltersChange = (statuses: StatusLevel[]) => {
    onStatusFiltersChange?.(statuses);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchSection}>
        <div className={styles.leftActions}>
          {/* View Switcher - Uses router.push() for navigation */}
          <ViewSwitcher />
        </div>

        {/* Advanced Task Search Bar */}
        <TaskSearchBar
          onSearch={(query, category) => {
            setSearchQuery(query);
            setSearchCategory(category);
          }}
          onPriorityFiltersChange={handlePriorityFiltersChange}
          onStatusFiltersChange={handleStatusFiltersChange}
          placeholder="Buscar tareas, cuentas o miembros..."
        />
      </div>

      <div className={styles.actionsSection}>
        {/* Right Actions */}
        <div className={styles.rightActions}>
          <div className={styles.buttonWithTooltip}>
            <Button
              intent="primary"
              size="lg"
              leftIcon={CirclePlus}
              onClick={onNewTaskOpen}
            >
              Crear Tarea
            </Button>
            <span className={styles.tooltip}>Crear Nueva Tarea</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksHeader;
