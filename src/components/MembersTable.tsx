'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';
import { useUser } from '@clerk/nextjs';
import Table from './Table';
import styles from './MembersTable.module.scss';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
}

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
}

interface MembersTableProps {
  users: User[];
  tasks: Task[]; // Nueva prop para las tareas
  onInviteSidebarOpen: () => void;
  onProfileSidebarOpen: (userId: string) => void;
  onMessageSidebarOpen: (user: User) => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const MembersTable: React.FC<MembersTableProps> = memo(
  ({ users, tasks, onInviteSidebarOpen, onProfileSidebarOpen, onMessageSidebarOpen, setUsers }) => {
    console.log('MembersTable rendered');
    const { user } = useUser();
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [sortKey, setSortKey] = useState<string>('fullName');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const portalContainer = useRef<HTMLElement | null>(null);

    // Inicializar portal
    useEffect(() => {
      portalContainer.current = document.getElementById('portal-root');
      if (!portalContainer.current) {
        console.error('Portal root (#portal-root) not found in the DOM');
      }
    }, []);

    // Calcular proyectos activos por usuario
    const activeProjectsCount = useMemo(() => {
      const validStatuses = ['En Proceso', 'Diseño', 'Desarrollo'];
      const counts: { [userId: string]: number } = {};

      users.forEach((u) => {
        counts[u.id] = tasks.filter(
          (task) =>
            validStatuses.includes(task.status) &&
            (task.AssignedTo.includes(u.id) || task.LeadedBy.includes(u.id)),
        ).length;
      });

      return counts;
    }, [users, tasks]);

    // Filtrar y ordenar usuarios
    const memoizedFilteredUsers = useMemo(() => {
      const currentUser = users.find((u) => u.id === user?.id);
      const otherUsers = users.filter((u) => u.id !== user?.id);
      const sortedUsers = [...otherUsers].sort((a, b) =>
        a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase()),
      );
      return currentUser ? [{ ...currentUser, fullName: `${currentUser.fullName} (Tú)` }, ...sortedUsers] : sortedUsers;
    }, [users, user?.id]);

    useEffect(() => {
      setFilteredUsers(
        memoizedFilteredUsers.filter(
          (u) =>
            u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.role.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
    }, [memoizedFilteredUsers, searchQuery]);

    // Animaciones GSAP
    useEffect(() => {
      const currentActionMenuRef = actionMenuRef.current;
      if (actionMenuOpenId && currentActionMenuRef) {
        gsap.fromTo(
          currentActionMenuRef,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
      return () => {
        if (currentActionMenuRef) {
          gsap.killTweensOf(currentActionMenuRef);
        }
      };
    }, [actionMenuOpenId]);

    // Manejar clics fuera del menú
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.get(actionMenuOpenId || '')?.contains(event.target as Node)
        ) {
          setActionMenuOpenId(null);
          console.log('Closed action menu via outside click');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId]);

    // Ordenamiento
    const handleSort = useCallback(
      (key: string) => {
        if (key === sortKey) {
          setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
          setSortKey(key);
          setSortDirection('asc');
        }
      },
      [sortKey],
    );

    // Manejar clic en acciones
    const handleActionClick = useCallback((userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
      });
      setActionMenuOpenId((prev) => (prev === userId ? null : userId));
      console.log('Action menu toggled for user:', userId);
    }, []);

    // Animación de clic
    const animateClick = useCallback((element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        opacity: 0.8,
        duration: 0.15,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1,
      });
    }, []);

    // Renderizar menú de acciones
    const renderActionMenu = useCallback(
      (u: User) => (
        <div className={styles.actionContainer}>
          <button
            ref={(el) => {
              if (el) actionButtonRefs.current.set(u.id, el);
              else actionButtonRefs.current.delete(u.id);
            }}
            onClick={(e) => handleActionClick(u.id, e)}
            className={styles.actionButton}
            aria-label="Abrir acciones"
          >
            <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
          </button>
          {actionMenuOpenId === u.id && portalContainer.current && (
            createPortal(
              <div
                ref={actionMenuRef}
                className={styles.dropdown}
                style={{ position: 'absolute', top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
              >
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    onProfileSidebarOpen(u.id);
                    setActionMenuOpenId(null);
                  }}
                >
                  <Image src="/user-round.svg" alt="Profile" width={16} height={16} />
                  <span>Ver perfil</span>
                </div>
                {u.id !== user?.id && (
                  <div
                    className={styles.dropdownItem}
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      onMessageSidebarOpen(u);
                      setActionMenuOpenId(null);
                    }}
                  >
                    <Image src="/message-square.svg" alt="Mensaje" width={16} height={16} />
                    <span>Enviar mensaje</span>
                  </div>
                )}
              </div>,
              portalContainer.current,
            )
          )}
        </div>
      ),
      [actionMenuOpenId, dropdownPosition, animateClick, onProfileSidebarOpen, onMessageSidebarOpen, user?.id],
    );

    // Definir columnas
    const baseColumns = useMemo(
      () => [
        {
          key: 'imageUrl',
          label: '',
          width: '10%',
          mobileVisible: false,
        },
        {
          key: 'fullName',
          label: 'Nombre',
          width: '40%',
          mobileVisible: true,
        },
        {
          key: 'role',
          label: 'Rol',
          width: '30%',
          mobileVisible: false,
        },
        {
          key: 'activeProjects',
          label: 'Proyectos activos',
          width: '10%',
          mobileVisible: false,
        },
        {
          key: 'action',
          label: 'Acciones',
          width: '10%',
          mobileVisible: true,
        },
      ],
      [],
    );

    const columns = useMemo(
      () =>
        baseColumns.map((col) => {
          if (col.key === 'imageUrl') {
            return {
              ...col,
              render: (user: User) => (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName}
                  width={38}
                  height={38}
                  className={styles.profileImage}
                  onError={(e) => {
                    e.currentTarget.src = '/default-avatar.png';
                  }}
                />
              ),
            };
          }
          if (col.key === 'activeProjects') {
            return {
              ...col,
              render: (user: User) => (
                <span className={styles.activeProjects}>{activeProjectsCount[user.id] || 0}</span>
              ),
            };
          }
          if (col.key === 'action') {
            return {
              ...col,
              render: renderActionMenu,
            };
          }
          return col;
        }),
      [baseColumns, renderActionMenu, activeProjectsCount],
    );

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar Miembros"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar miembros"
            />
          </div>
          <div className={styles.inviteButtonWrapper}>
            <button onClick={onInviteSidebarOpen} className={styles.inviteButton}>
              <Image src="/wallet-cards.svg" alt="Invite" width={17} height={17} />
              Invitar Miembro
            </button>
          </div>
        </div>
        <Table
          data={filteredUsers}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={(u: User, columnKey: string) =>
            ['imageUrl', 'fullName', 'role', 'activeProjects'].includes(columnKey) &&
            u.id !== user?.id &&
            onMessageSidebarOpen(u)
          }
        />
      </div>
    );
  },
);

MembersTable.displayName = 'MembersTable';

export default MembersTable;