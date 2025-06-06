'use client';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import Table from './Table';
import styles from './MembersTable.module.scss';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
}

interface MembersTableProps {
  users: User[];
  onInviteOpen: () => void;
  onProfileOpen: (userId: string) => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const MembersTable: React.FC<MembersTableProps> = memo(
  ({ users, onInviteOpen, onProfileOpen, setUsers }) => {
    console.log('MembersTable rendered'); // Para depuración, quitar en producción
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [sortKey, setSortKey] = useState<string>('fullName');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const response = await fetch('/api/users');
          if (!response.ok) throw new Error('Failed to fetch users');
          const clerkUsers: { id: string; imageUrl?: string; firstName?: string; lastName?: string; publicMetadata: { role?: string; description?: string } }[] = await response.json();
          const usersData: User[] = clerkUsers.map((user) => ({
            id: user.id,
            imageUrl: user.imageUrl || '/default-avatar.png',
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre',
            role: user.publicMetadata.role || 'Sin rol',
            description: user.publicMetadata.description || 'Sin descripción',
          }));
          setUsers(usersData);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      };
      fetchUsers();
    }, [setUsers]);

    const memoizedFilteredUsers = useMemo(
      () =>
        users.filter(
          (user) =>
            user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      [searchQuery, users],
    );

    useEffect(() => {
      setFilteredUsers(memoizedFilteredUsers);
    }, [memoizedFilteredUsers]);

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

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.get(actionMenuOpenId || '')?.contains(event.target as Node)
        ) {
          setActionMenuOpenId(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId]);

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

    const handleActionClick = useCallback((userId: string) => {
      setActionMenuOpenId((prev) => (prev === userId ? null : userId));
    }, []);

    const handleDeleteRequest = useCallback(
      async (user: User) => {
        try {
          const response = await fetch('/api/request-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, fullName: user.fullName }),
          });
          if (!response.ok) throw new Error('Failed to request deletion');
          alert(`Solicitud de eliminación enviada para ${user.fullName}`);
        } catch (error) {
          console.error('Error requesting deletion:', error);
          alert('Error al solicitar la eliminación');
        }
        setActionMenuOpenId(null);
      },
      [],
    );

    const renderActionMenu = useCallback(
      (user: User) => (
        <div className={styles.actionContainer}>
          <button
            ref={(el) => {
              if (el) actionButtonRefs.current.set(user.id, el);
              else actionButtonRefs.current.delete(user.id);
            }}
            onClick={() => handleActionClick(user.id)}
            className={styles.actionButton}
            aria-label="Abrir acciones"
          >
            <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
          </button>
          {actionMenuOpenId === user.id && (
            <div ref={actionMenuRef} className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownTitle}>Acciones</div>
              </div>
              <div
                className={styles.dropdownItem}
                onClick={() => {
                  onProfileOpen(user.id);
                  setActionMenuOpenId(null);
                }}
              >
                <Image src="/user-round.svg" alt="Profile" width={16} height={16} />
                <span>Perfil</span>
              </div>
              <div
                className={styles.dropdownItem}
                onClick={() => {
                  handleDeleteRequest(user);
                  setActionMenuOpenId(null);
                }}
              >
                <Image src="/trash-2.svg" alt="Delete" width={16} height={16} />
                <span className={styles.deleteText}>Eliminar Miembro</span>
              </div>
            </div>
          )}
        </div>
      ),
      [actionMenuOpenId, handleActionClick, handleDeleteRequest, onProfileOpen]
    );

    const baseColumns = useMemo(() => [
      {
        key: 'imageUrl',
        label: '',
        width: '10%',
        mobileVisible: false,
      },
      {
        key: 'fullName',
        label: 'Nombre',
        width: '50%',
        mobileVisible: true,
      },
      {
        key: 'role',
        label: 'Rol',
        width: '30%',
        mobileVisible: false,
      },
      {
        key: 'action',
        label: 'Acciones',
        width: '10%',
        mobileVisible: true,
      },
    ], []);

    const columns = useMemo(() => baseColumns.map((col) => {
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
      if (col.key === 'action') {
        return {
          ...col,
          render: renderActionMenu,
        };
      }
      return col;
    }), [baseColumns, renderActionMenu]);

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
            <button onClick={onInviteOpen} className={styles.inviteButton}>
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
        />
      </div>
    );
  }
);

MembersTable.displayName = 'MembersTable';

export default MembersTable;