'use client';

import { useEffect, useMemo, useCallback, memo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Table from './Table';
import styles from './MembersTable.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import UserAvatar from '@/components/ui/UserAvatar';

import NotificationDot from '@/components/ui/NotificationDot';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { membersTableStore } from '@/stores/membersTableStore';
import { useDataStore } from '@/stores/dataStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';

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
  onMessageSidebarOpen: (user: User) => void;
  externalUsers?: User[];
  externalTasks?: Task[];
  getUnreadCountForUser?: (userId: string) => number;
  markConversationAsRead?: (conversationId: string) => Promise<void>;
}

// (Eliminar definiciones de getCacheKey, saveUsersCache, loadUsersCache, cleanupMembersTableListeners)

const MembersTable: React.FC<MembersTableProps> = memo(
  ({ onMessageSidebarOpen, externalUsers, externalTasks, getUnreadCountForUser, markConversationAsRead }) => {
    const { user } = useUser();
    const { isLoading } = useAuth();
    
    // Hook para detectar el viewport
    const [isMobile, setIsMobile] = useState(false);
    
    // Estado para visibilidad de columnas
    const [visibleColumns, setVisibleColumns] = useState<string[]>([
      'imageUrl', 'fullName', 'messageNotifications', 'role', 'activeProjects', 'status'
    ]);

    // Estado para el tooltip personalizado
    const [tooltipState, setTooltipState] = useState({
      isVisible: false,
      text: '',
      position: { x: 0, y: 0 }
    });
    
    useEffect(() => {
      const checkViewport = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkViewport();
      window.addEventListener('resize', checkViewport);
      
      return () => window.removeEventListener('resize', checkViewport);
    }, []);

    // Función para mostrar el tooltip
    const showTooltip = useCallback((event: React.MouseEvent, text: string) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipState({
        isVisible: true,
        text,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        }
      });
    }, []);

    // Función para ocultar el tooltip
    const hideTooltip = useCallback(() => {
      setTooltipState(prev => ({ ...prev, isVisible: false }));
    }, []);
    
    // Optimizar selectores de dataStore para evitar re-renders innecesarios
    const users = useDataStore(useShallow(state => state.users));
    const tasks = useDataStore(useShallow(state => state.tasks));
    const isLoadingUsers = useDataStore(useShallow(state => state.isLoadingUsers));
    const isLoadingTasks = useDataStore(useShallow(state => state.isLoadingTasks));

    // UI state desde membersTableStore - optimizado para evitar re-renders
    const filteredUsers = useStore(membersTableStore, useShallow(state => state.filteredUsers));
    const sortKey = useStore(membersTableStore, useShallow(state => state.sortKey));
    const sortDirection = useStore(membersTableStore, useShallow(state => state.sortDirection));
    const searchQuery = useStore(membersTableStore, useShallow(state => state.searchQuery));
    const setFilteredUsers = useStore(membersTableStore, useShallow(state => state.setFilteredUsers));
    const setSortKey = useStore(membersTableStore, useShallow(state => state.setSortKey));
    const setSortDirection = useStore(membersTableStore, useShallow(state => state.setSortDirection));
    const setSearchQuery = useStore(membersTableStore, useShallow(state => state.setSearchQuery));
    const setIsLoadingUsers = useStore(membersTableStore, useShallow(state => state.setIsLoadingUsers));
    const setIsLoadingTasks = useStore(membersTableStore, useShallow(state => state.setIsLoadingTasks));
    
    // Use external data if provided, otherwise use internal state
    const effectiveUsers = externalUsers || users;
    const effectiveTasks = externalTasks || tasks;
    
    // Debug logging disabled to reduce console spam
    
    // Memoizar los callbacks para evitar re-renders
    const handleMessageSidebarOpen = useCallback((user: User) => {
      onMessageSidebarOpen(user);
    }, [onMessageSidebarOpen]);

    // Handler para abrir ProfileCard - similar a UserSwiper
    const handleOpenProfile = useCallback((user: User) => {
      const { openProfileCard } = useTasksPageStore.getState();
      openProfileCard(user.id, user.imageUrl);
    }, []);

    // Memoizar el callback de row click para evitar re-renders
    const handleRowClick = useCallback(async (u: User, columnKey: string) => {
      // Debug logging disabled to reduce console spam
      if (['imageUrl', 'fullName', 'role', 'activeProjects', 'status', 'messageNotifications'].includes(columnKey)) {
        // Si es tu propio perfil, abrir ProfileCard en lugar de chat
        if (u.id === user?.id) {
          handleOpenProfile(u);
          return;
        }
        
        // Para otros usuarios, abrir chat y marcar como leída si es necesario
        if (getUnreadCountForUser && markConversationAsRead) {
          const unreadCount = getUnreadCountForUser(u.id);
          if (unreadCount > 0) {
            // Buscar la conversación y marcarla como leída
            const conversationsQuery = query(
              collection(db, 'conversations'),
              where('participants', 'array-contains', user?.id),
              where('participants', 'array-contains', u.id)
            );
            try {
              const conversationsSnapshot = await getDocs(conversationsQuery);
              if (!conversationsSnapshot.empty) {
                const conversationId = conversationsSnapshot.docs[0].id;
                await markConversationAsRead(conversationId);
              }
            } catch (error) {
              console.error('[MembersTable] Error marking conversation as read:', error);
            }
          }
        }
        handleMessageSidebarOpen(u);
      }
    }, [user?.id, getUnreadCountForUser, markConversationAsRead, handleMessageSidebarOpen, handleOpenProfile]);

    // Handler para el click en el avatar - evita que se propague al row click
    const handleAvatarClick = useCallback((e: React.MouseEvent, user: User) => {
      e.stopPropagation();
      handleOpenProfile(user);
    }, [handleOpenProfile]);

    // Handler para el hover del avatar con tooltip
    const handleAvatarMouseEnter = useCallback((e: React.MouseEvent) => {
      showTooltip(e, 'Ver Perfil');
    }, [showTooltip]);

    const handleAvatarMouseLeave = useCallback(() => {
      hideTooltip();
    }, [hideTooltip]);
    
    // Los datos vienen de dataStore - no necesitamos hacer fetch aquí
    // Solo sincronizar el estado de loading
    useEffect(() => {
      setIsLoadingUsers(isLoadingUsers);
    }, [isLoadingUsers, setIsLoadingUsers]);

    useEffect(() => {
      setIsLoadingTasks(isLoadingTasks);
    }, [isLoadingTasks, setIsLoadingTasks]);

    // Calcular proyectos activos por usuario (memoizado y optimizado)
    const activeProjectsCount = useMemo(() => {
      const validStatuses = ['En Proceso', 'Diseño', 'Desarrollo'];
      const counts: { [userId: string]: number } = {};

      // Optimizar el cálculo usando Map para mejor rendimiento
      const taskMap = new Map();
      effectiveTasks.forEach((task) => {
        if (validStatuses.includes(task.status)) {
          const participants = [...task.AssignedTo, ...task.LeadedBy];
          participants.forEach((userId) => {
            taskMap.set(userId, (taskMap.get(userId) || 0) + 1);
          });
        }
      });

      effectiveUsers.forEach((u) => {
        counts[u.id] = taskMap.get(u.id) || 0;
      });

      return counts;
    }, [effectiveUsers, effectiveTasks]);

    // Filtrar y ordenar usuarios (memoizado y optimizado)
    const memoizedFilteredUsers = useMemo(() => {
      if (!effectiveUsers.length) return [];
      
      const currentUser = effectiveUsers.find((u) => u.id === user?.id);
      const otherUsers = effectiveUsers.filter((u) => u.id !== user?.id);
      
      // Optimizar el ordenamiento usando localeCompare con opciones
      const sortedUsers = [...otherUsers].sort((a, b) =>
        a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase(), 'es', { numeric: true })
      );
      
      return currentUser 
        ? [{ ...currentUser, fullName: `${currentUser.fullName} (Tú)` }, ...sortedUsers] 
        : sortedUsers;
    }, [effectiveUsers, user?.id]);

    // Aplicar filtro de búsqueda (memoizado y optimizado)
    useEffect(() => {
      if (!searchQuery.trim()) {
        // Si no hay búsqueda, mostrar todos los usuarios
        setFilteredUsers(memoizedFilteredUsers.map(u => u.id));
        return;
      }

      const query = searchQuery.toLowerCase();
      const filtered = memoizedFilteredUsers.filter(
          (u) =>
            u.fullName.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query) ||
            u.status?.toLowerCase().includes(query),
      );
      setFilteredUsers(filtered.map(u => u.id)); // Solo guardar IDs
    }, [memoizedFilteredUsers, searchQuery, setFilteredUsers]);

    // Ordenamiento (memoizado y optimizado)
    const handleSort = useCallback(
      (key: string) => {
        if (key !== sortKey) {
          setSortKey(key);
          setSortDirection('asc');
        } else {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        }
      },
      [sortDirection, sortKey, setSortKey, setSortDirection],
    );

    // Ordenar usuarios
    const sortedUsers = useMemo(() => {
      const usersToSort = memoizedFilteredUsers.filter(u => 
        filteredUsers.includes(u.id)
      );
      
      if (!sortKey || sortKey === '') {
        return usersToSort;
      }

      return [...usersToSort].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortKey) {
          case 'fullName':
            aValue = a.fullName.toLowerCase();
            bValue = b.fullName.toLowerCase();
            break;
          case 'role':
            aValue = a.role.toLowerCase();
            bValue = b.role.toLowerCase();
            break;
          case 'activeProjects':
            aValue = activeProjectsCount[a.id] || 0;
            bValue = activeProjectsCount[b.id] || 0;
            break;
          case 'status':
            aValue = (a.status || 'Sin estado').toLowerCase();
            bValue = (b.status || 'Sin estado').toLowerCase();
            break;
          case 'messageNotifications':
            // Ordenar por número de notificaciones no leídas
            aValue = getUnreadCountForUser ? getUnreadCountForUser(a.id) : 0;
            bValue = getUnreadCountForUser ? getUnreadCountForUser(b.id) : 0;
            break;
          default:
            aValue = a.fullName.toLowerCase();
            bValue = b.fullName.toLowerCase();
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }, [memoizedFilteredUsers, filteredUsers, sortKey, sortDirection, activeProjectsCount, getUnreadCountForUser]);

    // Definir columnas (memoizado y optimizado)
    const columns = useMemo(() => [
      {
        key: 'imageUrl',
        label: '',
        width: isMobile ? '50%' : '20%',
        mobileVisible: true,
        render: (user: User) => (
          <button
            className={styles.avatarButton}
            onClick={(e) => handleAvatarClick(e, user)}
            onMouseEnter={handleAvatarMouseEnter}
            onMouseLeave={handleAvatarMouseLeave}
            aria-label={`Ver perfil de ${user.fullName}`}
            type="button"
          >
            <UserAvatar
              userId={user.id}
              imageUrl={user.imageUrl}
              userName={user.fullName}
              size="medium"
              showStatus={true}
            />
          </button>
        ),
      },
      {
        key: 'fullName',
        label: 'Nombre',
        width: '80%',
        mobileVisible: true,
      },
      {
        key: 'messageNotifications',
        label: '',
        width: '10%',
        mobileVisible: false,
        render: (user: User) => {
          const unreadCount = getUnreadCountForUser(user.id);
          return (
            <div className={styles.notificationDotWrapper}>
              <NotificationDot count={unreadCount} />
            </div>
          );
        },
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
        render: (user: User) => (
          <span className={styles.activeProjects}>{activeProjectsCount[user.id] || 0}</span>
        ),
      },
      {
        key: 'status',
        label: 'Estado',
        width: '15%',
        mobileVisible: false,
        render: (user: User) => (
          <span className={styles.status}>{user.status || 'Sin estado'}</span>
        ),
      },
    ], [activeProjectsCount, getUnreadCountForUser, isMobile, handleAvatarClick, handleAvatarMouseEnter, handleAvatarMouseLeave]);

    // Función para manejar cambios de visibilidad de columnas
    const handleColumnVisibilityChange = useCallback((columnKey: string, visible: boolean) => {
      setVisibleColumns(prev => {
        if (visible) {
          // Agregar columna si no está presente
          return prev.includes(columnKey) ? prev : [...prev, columnKey];
        } else {
          // Remover columna
          return prev.filter(key => key !== columnKey);
        }
      });
      
      console.log(`[MembersTable] Column ${columnKey} visibility changed to: ${visible}`);
    }, []);

    // Handle loading state
    if (isLoading || isLoadingUsers || isLoadingTasks) {
      return (
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.searchWrapper}>
              <div className={styles.searchInput} style={{ opacity: 0.5, pointerEvents: 'none' }}>
                <div style={{ width: '100%', height: '16px', background: '#f0f0f0', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
          <SkeletonLoader type="members" rows={6} />
        </div>
      );
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
        </div>
        <Table
          data={sortedUsers}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={handleRowClick}
          emptyStateType="members"
          enableColumnVisibility={true}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
        
        {/* Tooltip personalizado */}
        {tooltipState.isVisible && (
          <div
            className={styles.customTooltip}
            style={{
              left: `${tooltipState.position.x}px`,
              top: `${tooltipState.position.y}px`,
            }}
          >
            {tooltipState.text}
            <div className={styles.tooltipArrow} />
          </div>
        )}
      </div>
    );
  },
);

MembersTable.displayName = 'MembersTable';

export default MembersTable;