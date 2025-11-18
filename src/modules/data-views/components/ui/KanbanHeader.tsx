'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { CrystalButton } from '@/modules/shared/components/atoms/CrystalButton';
import { Dropdown, type DropdownItem } from '@/modules/shared/components/molecules/Dropdown';
import { Small, Muted } from '@/components/ui/Typography';
import styles from '@/modules/data-views/tasks/components/tables/KanbanBoard/TasksKanban.module.scss';

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

interface KanbanHeaderProps {
  onNewTaskOpen: () => void;
  onViewChange: (view: 'table' | 'kanban') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  clientFilter: string;
  setClientFilter: (clientId: string) => void;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  clients: Client[];
  users: User[];
  isAdmin: boolean;
  userId: string;
  isLoadingClients?: boolean;
  isLoadingUsers?: boolean;
}

const KanbanHeader: React.FC<KanbanHeaderProps> = ({
  onNewTaskOpen,
  onViewChange,
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter,
  clientFilter,
  setClientFilter,
  userFilter,
  setUserFilter,
  clients,
  users,
  isAdmin,
  userId,
  isLoadingClients = false,
  isLoadingUsers = false,
}) => {
  // Crear items para los dropdowns
  const priorityItems: DropdownItem[] = [
    { id: 'all', label: 'Todos', value: '' },
    { id: 'alta', label: 'Alta', value: 'Alta' },
    { id: 'media', label: 'Media', value: 'Media' },
    { id: 'baja', label: 'Baja', value: 'Baja' },
  ];

  const clientItems: DropdownItem[] = [
    { id: 'all', label: 'Todos', value: '' },
    ...clients.map(c => ({ id: c.id, label: c.name, value: c.id })),
  ];

  const userItems: DropdownItem[] = [
    { id: 'all', label: 'Todos', value: '' },
    { id: 'me', label: 'Mis tareas', value: 'me' },
    ...users.filter(u => u.id !== userId).map(u => ({ id: u.id, label: u.fullName, value: u.id })),
  ];

  const handlePriorityChange = useCallback((item: DropdownItem) => {
    setPriorityFilter(item.value as string);
  }, [setPriorityFilter]);

  const handleClientChange = useCallback((item: DropdownItem) => {
    setClientFilter(item.value as string);
  }, [setClientFilter]);

  const handleUserChange = useCallback((item: DropdownItem) => {
    setUserFilter(item.value as string);
  }, [setUserFilter]);

  const handleSearchChange = useCallback((newValue: string) => {
    setSearchQuery(newValue);
  }, [setSearchQuery]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          e.currentTarget.select();
          break;
        case 'c':
          e.preventDefault();
          const targetC = e.currentTarget as HTMLInputElement;
          if (targetC.selectionStart !== targetC.selectionEnd) {
            const selectedText = targetC.value.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          const targetV = e.currentTarget as HTMLInputElement;
          navigator.clipboard.readText().then(text => {
            if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
              const start = targetV.selectionStart;
              const end = targetV.selectionEnd;
              const newValue = targetV.value.substring(0, start) + text + targetV.value.substring(end);
              setSearchQuery(newValue);
              setTimeout(() => {
                targetV.setSelectionRange(start + text.length, start + text.length);
              }, 0);
            } else {
              setSearchQuery(targetV.value + text);
            }
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = targetX.value.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = targetX.value.substring(0, start) + targetX.value.substring(end);
                setSearchQuery(newValue);
              } else {
                setSearchQuery('');
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = targetX.value.substring(0, start) + targetX.value.substring(end);
                setSearchQuery(newValue);
              } else {
                setSearchQuery('');
              }
            });
          }
          break;
      }
    }
  }, [setSearchQuery]);

  return (
    <div className={styles.header} style={{ margin: '20px 0px' }}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Buscar Tareas"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={styles.searchInput}
          aria-label="Buscar tareas"
          onKeyDown={handleInputKeyDown}
        />
      </div>

      <div className={styles.filtersWrapper}>
        <div className={styles.buttonWithTooltip}>
          <button
            className={styles.viewButton}
            onClick={() => onViewChange('table')}
          >
            <Image
              src="/table.svg"
              alt="table"
              draggable="false"
              width={20}
              height={20}
              style={{
                marginLeft: '5px',
                transition: 'transform 0.3s ease, filter 0.3s ease',
                filter:
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.81)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
              }}
            />
          </button>
          <Muted className={styles.tooltip}>Vista Tabla</Muted>
        </div>

        <div className={styles.buttonWithTooltip}>
          <Dropdown
            trigger={
              <div className={styles.dropdownTrigger}>
                <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                <span>{priorityFilter || 'Prioridad'}</span>
              </div>
            }
            items={priorityItems}
            value={priorityFilter}
            onChange={handlePriorityChange}
          />
          <Muted className={styles.tooltip}>Filtrar por Prioridad</Muted>
        </div>

        <div className={styles.buttonWithTooltip}>
          <Dropdown
            trigger={
              <div className={styles.dropdownTrigger}>
                <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                <span>
                  {isLoadingClients 
                    ? 'Cargando...' 
                    : clients.find((c) => c.id === clientFilter)?.name || 'Cuenta'
                  }
                </span>
              </div>
            }
            items={clientItems}
            value={clientFilter}
            onChange={handleClientChange}
            disabled={isLoadingClients}
          />
          <Muted className={styles.tooltip}>Filtrar por Cuenta</Muted>
        </div>

        {isAdmin && (
          <div className={styles.buttonWithTooltip}>
            <Dropdown
              trigger={
                <div className={styles.dropdownTrigger}>
                  <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
                  <span>
                    {isLoadingUsers 
                      ? 'Cargando...'
                      : userFilter === ''
                        ? 'Todos'
                        : userFilter === 'me'
                        ? 'Mis tareas'
                        : users.find((u) => u.id === userFilter)?.fullName || 'Usuario'
                    }
                  </span>
                </div>
              }
              items={userItems}
              value={userFilter}
              onChange={handleUserChange}
              disabled={isLoadingUsers}
            />
            <Muted className={styles.tooltip}>Filtrar por Usuario</Muted>
          </div>
        )}

        <div className={styles.buttonWithTooltip}>
          <CrystalButton
            variant="primary"
            size="medium"
            icon="/circle-plus.svg"
            onClick={onNewTaskOpen}
          >
            <Small>Crear Tarea</Small>
          </CrystalButton>
          <Muted className={styles.tooltip}>Crear Nueva Tarea</Muted>
        </div>
      </div>
    </div>
  );
};

export default KanbanHeader; 