'use client';

import React, { useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUsers } from '@/stores/dataStore';
import UserAvatar from './UserAvatar';
import styles from './OnlineUsersPortal.module.scss';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useUser } from '@clerk/nextjs';

interface OnlineUsersPortalProps {
  maxVisible?: number;
  className?: string;
}

const OnlineUsersPortal: React.FC<OnlineUsersPortalProps> = ({ 
  maxVisible = 3,
  className 
}) => {
  const users = useUsers();
  const { user: currentUser } = useUser();

  // Filtrar usuarios online (Disponible, Ocupado, Por terminar)
  const onlineUsers = useMemo(() => {
    return users.filter(user => 
      user.status && 
      ['Disponible', 'Ocupado', 'Por terminar'].includes(user.status)
    );
  }, [users]);

  // Limitar el número de usuarios visibles
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const hiddenCount = onlineUsers.length - visibleUsers.length;

  // Handler para abrir chat con el usuario
  const handleSendMessage = useCallback((user: any) => {
    if (!currentUser) return;
    
    const conversationId = `conversation_${currentUser.id}_${user.id}`;
    const { openMessageSidebar } = useSidebarStateStore.getState();
    openMessageSidebar(currentUser.id, {
      id: user.id,
      imageUrl: user.imageUrl,
      fullName: user.fullName,
      role: user.role || 'Sin rol',
    }, conversationId);
  }, [currentUser]);

  // Handler para abrir ProfileCard
  const handleOpenProfile = useCallback((user: any) => {
    const { openProfileCard } = useTasksPageStore.getState();
    openProfileCard(user.id, user.imageUrl);
  }, []);

  // Solo renderizar si hay usuarios online
  if (onlineUsers.length === 0) {
    return null;
  }

  const portalContent = (
    <div className={`${styles.onlineUsersPortal} ${className || ''}`}>
      <div className={styles.avatarGroup}>
        {visibleUsers.map((user, index) => (
          <div
            key={user.id}
            className={`${styles.avatarWrapper} ${index > 0 ? styles.overlapped : ''}`}
            style={{ zIndex: visibleUsers.length - index }}
          >
            <UserAvatar
              userId={user.id}
              imageUrl={user.imageUrl}
              userName={user.fullName}
              size="tiny"
              showStatus={false}
            />
          </div>
        ))}
        
        {/* Indicador de usuarios adicionales */}
        {hiddenCount > 0 && (
          <div className={`${styles.avatarWrapper} ${styles.moreIndicator}`}>
            <div className={styles.moreCount}>
              +{hiddenCount}
            </div>
          </div>
        )}
      </div>
      
      {/* Tooltip con información */}
      <div className={styles.tooltip}>
        <div className={styles.tooltipContent}>
          <div className={styles.tooltipTitle}>
            Usuarios Online ({onlineUsers.length})
          </div>
          <div className={styles.tooltipUsers}>
            {onlineUsers.map(user => (
              <div key={user.id} className={styles.tooltipUser}>
                <UserAvatar
                  userId={user.id}
                  imageUrl={user.imageUrl}
                  userName={user.fullName}
                  size="tiny"
                  showStatus={true}
                />
                <span className={styles.tooltipUserName}>
                  {user.fullName}
                </span>
                <div className={styles.tooltipUserActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleSendMessage(user)}
                    aria-label={`Enviar mensaje a ${user.fullName}`}
                    title="Enviar mensaje"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                    </svg>
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleOpenProfile(user)}
                    aria-label={`Ver perfil de ${user.fullName}`}
                    title="Ver perfil"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar como portal en el body
  if (typeof window !== 'undefined') {
    return createPortal(portalContent, document.body);
  }

  return null;
};

export default OnlineUsersPortal; 