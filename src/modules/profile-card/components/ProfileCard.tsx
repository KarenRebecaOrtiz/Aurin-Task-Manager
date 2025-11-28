/**
 * Profile Card Component - REFACTORED
 * Simplified to use ProfileDialog directly
 * Reduced from 91 lines to ~60 lines
 */

'use client';

import React, { useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useProfile } from '../hooks/useProfile';
import { useProfileScroll } from '../hooks/useProfileScroll';
import { ProfileDialog } from './organisms/ProfileDialog';
import type { ProfileCardProps } from '../types';

const ProfileCard = ({ isOpen, userId, onClose, onChangeContainer }: ProfileCardProps) => {
  const { user: currentUser } = useUser();

  // Apply scroll lock when modal is open
  useProfileScroll(isOpen);

  const { openMessageSidebar } = useSidebarStateStore();

  // Handler to open config modal
  const handleConfigClick = useCallback(() => {
    onClose();
    if (onChangeContainer) {
      onChangeContainer('config');
    }
  }, [onClose, onChangeContainer]);

  // Handler to open message sidebar
  const handleMessageClick = useCallback(() => {
    if (!currentUser) return;

    // Don't do anything if viewing own profile
    if (userId === currentUser.id) {
      onClose();
      return;
    }

    // Create conversation and open sidebar
    // ProfileDialog handles profile loading internally
    const conversationId = `conversation_${currentUser.id}_${userId}`;

    // We'll need to fetch the profile name for the sidebar
    // This could be optimized by passing the profile from ProfileDialog
    openMessageSidebar(
      currentUser.id,
      {
        id: userId,
        imageUrl: '', // Will be filled by ProfileDialog
        fullName: 'Usuario', // Will be filled by ProfileDialog
        role: 'Sin rol',
      },
      conversationId
    );

    onClose();
  }, [currentUser, userId, onClose, openMessageSidebar]);

  return (
    <ProfileDialog
      isOpen={isOpen}
      onClose={onClose}
      userId={userId}
      currentUserId={currentUser?.id}
      onConfigClick={handleConfigClick}
      onMessageClick={handleMessageClick}
    />
  );
};

export default ProfileCard;
