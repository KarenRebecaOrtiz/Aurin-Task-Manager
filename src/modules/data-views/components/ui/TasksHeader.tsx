'use client';

import { CrystalButton } from '@/modules/shared/components/atoms';
import { TaskSearchBar, type SearchCategory, type PriorityLevel, type StatusLevel } from '@/modules/data-views/components/shared/search';
import { ViewSwitcher } from './ViewSwitcher';
import { Small } from '@/components/ui/Typography';
import styles from './TasksHeader.module.scss';

interface TasksHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchCategory: SearchCategory | null;
  setSearchCategory: (category: SearchCategory | null) => void;
  onViewChange: (view: 'table' | 'kanban') => void;
  onArchiveTableOpen: () => void;
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
  onViewChange,
  onArchiveTableOpen,
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
          <div className={styles.buttonWithTooltip}>
            <CrystalButton
              variant="secondary"
              size="medium"
              icon="/circle-plus.svg"
              onClick={onNewTaskOpen}
            >
              <Small>Crear Tarea</Small>
            </CrystalButton>
            <span className={styles.tooltip}>Crear Nueva Tarea</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksHeader;
