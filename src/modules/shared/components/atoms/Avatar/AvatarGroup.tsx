'use client';

import React, { useMemo, useCallback, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataStore } from '@/stores/dataStore';
import styles from './AvatarGroup.module.scss';

// Lazy load the ProfileCard to avoid bundle size issues
const ProfileCard = dynamic(
  () => import('@/modules/profile-card/components/ProfileCard'),
  { ssr: false }
);

export type AvailabilityStatus = 'Disponible' | 'Ocupado' | 'Por terminar' | 'Fuera';

// Umbral de inactividad en milisegundos (5 minutos)
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

// Interface local para el componente
export interface AvatarUser {
  id: string;
  imageUrl: string;
  fullName: string;
  role?: string;
  status?: string;
  lastActive?: string;
}

// Re-exportar para compatibilidad
export type User = AvatarUser;

export interface AvatarGroupProps {
  assignedUserIds: string[];
  leadedByUserIds?: string[];
  currentUserId: string;
  maxAvatars?: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

/**
 * AvatarGroup - Migrado para usar dataStore
 *
 * Cambios:
 * - Ya NO recibe array de users como prop
 * - Obtiene los datos directamente de dataStore (datos centralizados)
 * - Mismo comportamiento y UI que antes
 *
 * Beneficios:
 * - Datos centralizados desde useSharedTasksState
 * - Componente más desacoplado
 * - Menos props drilling
 */
export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  assignedUserIds,
  leadedByUserIds = [],
  currentUserId,
  maxAvatars = 5,
  size = 'medium',
  showTooltip = true,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<AvatarUser | null>(null);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);

  // ✅ Obtener users desde dataStore en lugar de prop
  const users = useDataStore((state) => state.users);

  const handleAvatarImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Fallback to empty image on error
    if (e.currentTarget.src !== '/empty-image.png') {
      e.currentTarget.src = '/empty-image.png';
    }
  }, []);

  const handleAvatarClick = useCallback((user: AvatarUser, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setIsProfileCardOpen(true);
  }, []);

  const handleProfileCardClose = useCallback(() => {
    setIsProfileCardOpen(false);
    setSelectedUser(null);
  }, []);

  /**
   * Determina si un usuario está inactivo basándose en lastActive
   * Si no hay lastActive o es muy antiguo, se considera inactivo
   */
  const isUserInactive = useCallback((lastActive?: string): boolean => {
    if (!lastActive) return true; // Sin lastActive = inactivo

    const lastActiveTime = new Date(lastActive).getTime();
    const now = Date.now();
    return now - lastActiveTime > INACTIVITY_THRESHOLD_MS;
  }, []);

  /**
   * Get status color based on user availability status AND lastActive
   * Si el usuario está inactivo (>5 min sin actividad), mostrar gris
   * independientemente del status manual
   */
  const getStatusColor = useCallback((user: AvatarUser): string => {
    // Si está inactivo, mostrar como "Fuera" (gris) sin importar el status manual
    if (isUserInactive(user.lastActive)) {
      return '#616161'; // Gray - inactivo
    }

    // Si está activo, usar el status manual
    switch (user.status) {
      case 'Disponible':
        return '#178d00'; // Green
      case 'Ocupado':
        return '#d32f2f'; // Red
      case 'Por terminar':
        return '#f57c00'; // Orange
      case 'Fuera':
        return '#616161'; // Gray
      default:
        return '#616161'; // Default gray for unknown/undefined status
    }
  }, [isUserInactive]);

  /**
   * Get status label for tooltip
   */
  const getStatusLabel = useCallback((user: AvatarUser): string => {
    if (isUserInactive(user.lastActive)) {
      return 'Inactivo';
    }
    return user.status || 'Sin estado';
  }, [isUserInactive]);

  const avatars = useMemo((): AvatarUser[] => {
    if (!Array.isArray(users)) {
      return [];
    }

    const matchedUsers = users
      .filter((user) => assignedUserIds.includes(user.id) || leadedByUserIds.includes(user.id))
      .slice(0, maxAvatars) as AvatarUser[];

    return matchedUsers.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [assignedUserIds, leadedByUserIds, users, currentUserId, maxAvatars]);

  const sizeMap = {
    small: { px: 32, class: 'h-8 w-8' },
    medium: { px: 40, class: 'h-10 w-10' },
    large: { px: 48, class: 'h-12 w-12' },
  };

  const sizeConfig = sizeMap[size];
  const avatarSize = sizeConfig.px;
  const overlap = 14;

  if (avatars.length === 0) {
    return <span className="text-sm text-muted-foreground">No asignados</span>;
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-3">
        {avatars.map((user, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={user.id}
              className="relative rounded-full transition-all duration-300 cursor-pointer border-2 border-white"
              style={{
                width: avatarSize,
                height: avatarSize,
                zIndex: isHovered ? 100 : avatars.length - idx,
                marginLeft: idx === 0 ? 0 : -overlap,
                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={(e) => handleAvatarClick(user, e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedUser(user);
                  setIsProfileCardOpen(true);
                }
              }}
              title={`Ver perfil de ${user.fullName}`}
            >
              <Image
                src={user.imageUrl && user.imageUrl.trim() ? user.imageUrl : '/empty-image.png'}
                alt={`${user.fullName}'s avatar`}
                width={avatarSize}
                height={avatarSize}
                className="rounded-full object-cover w-full h-full"
                onError={handleAvatarImageError}
                priority={false}
                loading="lazy"
              />
              {/* Status indicator dot */}
              <div
                className={`${styles.statusDot} ${size === 'small' ? styles.statusDotSmall : ''} ${size === 'large' ? styles.statusDotLarge : ''}`}
                style={{ backgroundColor: getStatusColor(user) }}
                title={getStatusLabel(user)}
              />
              <AnimatePresence>
                {isHovered && showTooltip && (
                  <motion.div
                    key="tooltip"
                    initial={{
                      x: '-50%',
                      y: 10,
                      opacity: 0,
                      scale: 0.7,
                    }}
                    animate={{
                      x: '-50%',
                      y: 0,
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      x: '-50%',
                      y: 10,
                      opacity: 0,
                      scale: 0.7,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 24,
                    }}
                    className="absolute z-50 px-2 py-1 bg-primary text-primary-foreground text-xs rounded shadow-lg whitespace-nowrap pointer-events-none font-semibold"
                    style={{
                      top: -avatarSize * 0.7,
                      left: '50%',
                    }}
                  >
                    {user.fullName}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ProfileCard Modal */}
      {selectedUser && (
        <ProfileCard
          isOpen={isProfileCardOpen}
          userId={selectedUser.id}
          onClose={handleProfileCardClose}
        />
      )}
    </div>
  );
};
