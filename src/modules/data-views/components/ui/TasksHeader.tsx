'use client';

import { Button } from '@/modules/shared/components/atoms/Button';
import { FilterGroup, type Filter } from '@/modules/shared/components/organisms/FilterGroup';
import { SearchInput } from '@/modules/shared/components/atoms/Input/SearchInput';
import { ChangeViewButton } from './ChangeViewButton';
import styles from './TasksHeader.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface TasksHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onViewChange: (view: 'table' | 'kanban') => void;
  onArchiveTableOpen: () => void;
  onNewTaskOpen: () => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  clientFilter: string;
  setClientFilter: (clientId: string) => void;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  clients: Client[];
  users: User[];
  userId: string;
  isAdmin: boolean;
  isLoadingClients?: boolean;
  isLoadingUsers?: boolean;
  currentView?: 'table' | 'kanban';
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onViewChange,
  onArchiveTableOpen,
  onNewTaskOpen,
  priorityFilter,
  setPriorityFilter,
  clientFilter,
  setClientFilter,
  userFilter,
  setUserFilter,
  clients,
  users,
  userId,
  isAdmin,
  isLoadingClients = false,
  isLoadingUsers = false,
  currentView = 'table',
}) => {
  // Priority filter options
  const priorityOptions = [
    { id: 'Alta', value: 'Alta', label: 'Alta' },
    { id: 'Media', value: 'Media', label: 'Media' },
    { id: 'Baja', value: 'Baja', label: 'Baja' },
    { id: 'all', value: '', label: 'Todos' },
  ];

  // Client filter options
  const clientOptions = [
    { id: 'all', value: '', label: 'Todos' },
    ...clients.map((c) => ({ id: c.id, value: c.id, label: c.name })),
  ];

  // User filter options
  const userOptions = [
    { id: 'all', value: '', label: 'Todos' },
    { id: 'me', value: 'me', label: 'Mis tareas' },
    ...users
      .filter((u) => u.id !== userId)
      .map((u) => ({ id: u.id, value: u.id, label: u.fullName })),
  ];

  // Build filters array
  const filters: Filter[] = [
    {
      id: 'priority',
      label: 'Prioridad',
      value: priorityFilter,
      options: priorityOptions,
      onChange: setPriorityFilter,
      icon: '/filter.svg',
    },
    {
      id: 'client',
      label: 'Cuenta',
      value: clientFilter,
      options: clientOptions,
      onChange: setClientFilter,
      icon: '/filter.svg',
    },
    ...(isAdmin
      ? [
          {
            id: 'user',
            label: 'Usuario',
            value: userFilter,
            options: userOptions,
            onChange: setUserFilter,
            icon: '/filter.svg',
          },
        ]
      : []),
  ];

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchSection}>
        <div className={styles.leftActions}>
          {/* View Toggle Buttons - Dynamic based on current view */}
          {currentView === 'table' ? (
            <ChangeViewButton
              icon="/kanban.svg"
              label="Vista Kanban"
              tooltip="Vista Kanban"
              onClick={() => onViewChange('kanban')}
              hideOnMobile
            />
          ) : (
            <ChangeViewButton
              icon="/table.svg"
              label="Vista Tabla"
              tooltip="Vista Tabla"
              onClick={() => onViewChange('table')}
              hideOnMobile
            />
          )}

          <ChangeViewButton
            icon="/archive.svg"
            label="Archivo"
            tooltip="Archivo"
            onClick={onArchiveTableOpen}
          />
        </div>

        {/* Search Input */}
        <SearchInput
          placeholder="Buscar Tareas"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className={styles.actionsSection}>
        {/* Filters */}
        <div className={styles.filters}>
          <FilterGroup filters={filters} />
        </div>

        {/* Right Actions */}
        <div className={styles.rightActions}>
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
