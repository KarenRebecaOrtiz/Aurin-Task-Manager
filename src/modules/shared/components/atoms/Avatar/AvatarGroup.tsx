'use client';

import React, { useMemo, useCallback } from 'react';
import Image from 'next/image';
import styles from './AvatarGroup.module.scss';

export interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role?: string;
}

export interface AvatarGroupProps {
  assignedUserIds: string[];
  leadedByUserIds?: string[];
  users: User[];
  currentUserId: string;
  maxAvatars?: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  assignedUserIds,
  leadedByUserIds = [],
  users,
  currentUserId,
  maxAvatars = 5,
  size = 'medium',
  showTooltip = true,
}) => {
  const handleAvatarImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/empty-image.png';
  }, []);

  const avatars = useMemo(() => {
    if (!Array.isArray(users)) {
      return [];
    }

    const matchedUsers = users
      .filter((user) => assignedUserIds.includes(user.id) || leadedByUserIds.includes(user.id))
      .slice(0, maxAvatars);

    return matchedUsers.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [assignedUserIds, leadedByUserIds, users, currentUserId, maxAvatars]);

  const sizeMap = {
    small: 32,
    medium: 40,
    large: 48,
  };

  const avatarSize = sizeMap[size];

  if (avatars.length === 0) {
    return <span className={styles.noAssigned}>No asignados</span>;
  }

  return (
    <div className={`${styles.avatarGroup} ${styles[size]}`}>
      {avatars.map((user) => (
        <div key={user.id} className={styles.avatar}>
          {showTooltip && <span className={styles.avatarName}>{user.fullName}</span>}
          <Image
            src={user.imageUrl || '/empty-image.png'}
            alt={`${user.fullName}'s avatar`}
            width={avatarSize}
            height={avatarSize}
            className={styles.avatarImage}
            onError={handleAvatarImageError}
          />
        </div>
      ))}
    </div>
  );
};
