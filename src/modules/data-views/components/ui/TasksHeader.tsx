'use client';

import { Button } from '@/modules/shared/components/atoms/Button';
import { TaskSearchBar, type SearchCategory, type PriorityLevel, type StatusLevel } from '@/modules/data-views/components/shared/search';
import { ViewSwitcher } from './ViewSwitcher';
import styles from './TasksHeader.module.scss';

interface TasksHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchCategory: SearchCategory | null;
  setSearchCategory: (category: SearchCategory | null) => void;
  onViewChange: (view: 'table' | 'kanban') => void;
  onArchiveTableOpen: () => void;
  onNewTaskOpen: () => void;
  onNewClientOpen?: () => void;
  onPriorityFiltersChange?: (priorities: PriorityLevel[]) => void;
  onStatusFiltersChange?: (statuses: StatusLevel[]) => void;
  currentView?: 'table' | 'kanban' | 'archive';
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  searchCategory,
  setSearchCategory,
  onViewChange,
  onArchiveTableOpen,
  onNewTaskOpen,
  onNewClientOpen,
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
          {/* View Switcher - Three fixed views */}
          <ViewSwitcher
            currentView={currentView === 'kanban' ? 'kanban' : currentView === 'archive' ? 'archive' : 'table'}
            onViewChange={(view) => {
              if (view === 'archive') {
                onArchiveTableOpen();
              } else {
                onViewChange(view);
              }
            }}
          />
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
          {onNewClientOpen && (
            <div className={styles.buttonWithTooltip}>
              <Button
                variant="secondary"
                size="medium"
                icon="/circle-plus.svg"
                onClick={onNewClientOpen}
              >
                Crear Cuenta
              </Button>
              <span className={styles.tooltip}>Crear Nueva Cuenta</span>
            </div>
          )}
          <div className={styles.buttonWithTooltip}>
            <Button
              variant="primary"
              size="medium"
              icon="/circle-plus.svg"
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
