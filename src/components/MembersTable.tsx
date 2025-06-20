'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import Table from './Table';
import styles from './MembersTable.module.scss';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
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
  tasks: Task[];
  onInviteSidebarOpen: () => void;
  onMessageSidebarOpen: (user: User) => void;
}

const MembersTable: React.FC<MembersTableProps> = memo(
  ({ users, tasks, onInviteSidebarOpen, onMessageSidebarOpen }) => {
    console.log('MembersTable rendered');
    const { user } = useUser();
    const { isAdmin, isLoading } = useAuth(); // Use useAuth to get isAdmin and isLoading
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [sortKey, setSortKey] = useState<string>('fullName');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');

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
            u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.status?.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
    }, [memoizedFilteredUsers, searchQuery]);

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
          width: '30%',
          mobileVisible: true,
        },
        {
          key: 'role',
          label: 'Rol',
          width: '25%',
          mobileVisible: false,
        },
        {
          key: 'activeProjects',
          label: 'Proyectos activos',
          width: '20%',
          mobileVisible: false,
        },
        {
          key: 'status',
          label: 'Estado',
          width: '15%',
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
          if (col.key === 'status') {
            return {
              ...col,
              render: (user: User) => (
                <span className={styles.status}>{user.status || 'Sin estado'}</span>
              ),
            };
          }
          return col;
        }),
      [baseColumns, activeProjectsCount],
    );

    // Handle loading state
    if (isLoading) {
      return <div>Loading...</div>; // You can replace with your Loader component
    }

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
              aria-label="Buscar Miembros"
            />
          </div>
          {isAdmin && !isLoading && (
            <div className={styles.inviteButtonWrapper}>
              <button onClick={onInviteSidebarOpen} className={styles.inviteButton}>
                <Image src="/wallet-cards.svg" alt="Invite" width={17} height={17} />
                Invitar Miembro
              </button>
            </div>
          )}
        </div>
        <Table
          data={filteredUsers}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={(u: User, columnKey: string) =>
            ['imageUrl', 'fullName', 'role', 'activeProjects', 'status'].includes(columnKey) &&
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