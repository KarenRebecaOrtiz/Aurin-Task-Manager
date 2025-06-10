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

interface MembersTableProps {
  users: User[];
  onInviteSidebarOpen: () => void;
  onProfileSidebarOpen: (userId: string) => void;
  onMessageSidebarOpen: (user: User) => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const MembersTable: React.FC<MembersTableProps> = memo(
  ({ users, onInviteSidebarOpen, onProfileSidebarOpen, onMessageSidebarOpen, setUsers }) => {
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

    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const response = await fetch('/api/users');
          if (!response.ok) throw new Error('Failed to fetch users');
          const clerkUsers: {
            id: string;
            imageUrl?: string;
            firstName?: string;
            lastName?: string;
            publicMetadata: { role?: string; description?: string };
          }[] = await response.json();
          const usersData: User[] = clerkUsers.map((u) => ({
            id: u.id,
            imageUrl: u.imageUrl || '/default-avatar.png',
            fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Sin nombre',
            role: u.publicMetadata.role || 'Sin rol',
            description: u.publicMetadata.description || 'Sin descripción',
          }));
          setUsers(usersData);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      };
      fetchUsers();
    }, [setUsers]);

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
          console.log('Closed action menu via outside click');
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
          if (col.key === 'action') {
            return {
              ...col,
              render: renderActionMenu,
            };
          }
          return col;
        }),
        [baseColumns, renderActionMenu],
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
            ['imageUrl', 'fullName', 'role'].includes(columnKey) && u.id !== user?.id && onMessageSidebarOpen(u)
          }
        />
      </div>
    );
  },
);

MembersTable.displayName = 'MembersTable';

export default MembersTable;