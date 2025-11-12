'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AvatarGroupProps {
  avatars?: { src: string; alt?: string; label?: string }[];
  maxVisible?: number;
  size?: number;
  overlap?: number;
  // Legacy props for backward compatibility
  assignedUserIds?: string[];
  leadedByUserIds?: string[];
  users?: { id: string; imageUrl: string; fullName: string; role?: string }[];
  currentUserId?: string;
  maxAvatars?: number;
  showTooltip?: boolean;
}

const AvatarGroup = ({
  avatars,
  maxVisible = 5,
  size = 40,
  overlap = 14,
  // Legacy props
  assignedUserIds,
  leadedByUserIds = [],
  users = [],
  currentUserId,
  maxAvatars = 5,
  showTooltip = true,
}: AvatarGroupProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Handle both new and legacy interfaces
  let processedAvatars: { src: string; alt?: string; label?: string }[] = [];

  if (avatars && avatars.length > 0) {
    // New interface
    processedAvatars = avatars;
  } else if (assignedUserIds && users.length > 0) {
    // Legacy interface - convert to new format
    const matchedUsers = users
      .filter(
        (user) =>
          assignedUserIds.includes(user.id) || leadedByUserIds.includes(user.id),
      )
      .slice(0, maxAvatars)
      .sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      });

    processedAvatars = matchedUsers.map((user) => ({
      src: user.imageUrl,
      alt: user.fullName,
      label: showTooltip ? user.fullName : undefined,
    }));
  }

  if (processedAvatars.length === 0) {
    return <span className="text-sm text-muted-foreground">No asignados</span>;
  }

  const visibleAvatars = processedAvatars.slice(0, maxVisible);
  const extraCount = processedAvatars.length - maxVisible;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-3">
        {visibleAvatars.map((avatar, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              className="relative border-4 border-background rounded-full bg-background transition-all duration-300"
              style={{
                width: size,
                height: size,
                zIndex: isHovered ? 100 : visibleAvatars.length - idx,
                marginLeft: idx === 0 ? 0 : -overlap,
                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <img
                src={avatar.src}
                alt={avatar.alt || `Avatar ${idx + 1}`}
                width={size}
                height={size}
                className="rounded-full object-cover w-full h-full"
                draggable={false}
              />
              <AnimatePresence>
                {isHovered && avatar.label && (
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
                      top: -size * 0.7,
                      left: '50%',
                    }}
                  >
                    {avatar.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {extraCount > 0 && (
          <div
            className="flex items-center justify-center bg-primary text-primary-foreground font-semibold border-4 border-background rounded-full"
            style={{
              width: size,
              height: size,
              marginLeft: -overlap,
              zIndex: 0,
              fontSize: size * 0.32,
            }}
          >
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
};

export { AvatarGroup };
