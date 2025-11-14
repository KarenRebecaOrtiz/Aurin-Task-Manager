'use client';

import React, { useMemo, useCallback, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load the ProfileCard to avoid bundle size issues
const ProfileCard = dynamic(
  () => import('@/modules/profile-card/components/ProfileCard'),
  { ssr: false }
);

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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);

  const handleAvatarImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/empty-image.png';
  }, []);

  const handleAvatarClick = useCallback((user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setIsProfileCardOpen(true);
  }, []);

  const handleProfileCardClose = useCallback(() => {
    setIsProfileCardOpen(false);
    setSelectedUser(null);
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
                src={user.imageUrl || '/empty-image.png'}
                alt={`${user.fullName}'s avatar`}
                width={avatarSize}
                height={avatarSize}
                className="rounded-full object-cover w-full h-full"
                onError={handleAvatarImageError}
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
