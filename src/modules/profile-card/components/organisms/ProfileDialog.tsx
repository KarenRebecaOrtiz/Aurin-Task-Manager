/**
 * Profile Dialog Component
 * Unified dialog for displaying user profiles
 * Uses CrudDialog organism following atomic design
 *
 * IMPORTANT: Uses userDataStore for current user (Single Source of Truth)
 * and profileCardStore for other users
 */

'use client';

import { useCallback, useMemo } from 'react';
import { CrudDialog } from '@/modules/dialogs';
import { ProfileCardContent } from './ProfileCardContent/ProfileCardContent';
import { useProfile } from '../../hooks/useProfile';
import { getSocialLinks } from '../../utils/socialLinksHelper';
import { useUserData, useUserDataLoading } from '@/stores/userDataStore';
import type { UserProfile } from '../../types';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId?: string;
  onConfigClick?: () => void;
  onMessageClick?: () => void;
}

export function ProfileDialog({
  isOpen,
  onClose,
  userId,
  currentUserId,
  onConfigClick,
  onMessageClick,
}: ProfileDialogProps) {
  const isOwnProfile = userId === currentUserId;

  // For current user: use userDataStore (Single Source of Truth)
  const currentUserData = useUserData();
  const currentUserLoading = useUserDataLoading();

  // For other users: always call useProfile hook (React rule: hooks must be called unconditionally)
  // We'll just ignore the result if it's own profile
  const { profile: otherUserProfile, isLoading: otherUserLoading, error: otherUserError } = useProfile(userId);

  // Select the appropriate data source based on who we're viewing
  const profile = useMemo((): UserProfile | undefined => {
    if (isOwnProfile && currentUserData) {
      // Transform UserData to UserProfile for current user
      return {
        id: currentUserData.userId,
        ...currentUserData,
      } as UserProfile;
    }
    // For other users, use the profile from profileCardStore
    return otherUserProfile;
  }, [isOwnProfile, currentUserData, otherUserProfile]);

  const isLoading = isOwnProfile ? currentUserLoading : otherUserLoading;
  const error = isOwnProfile ? undefined : otherUserError;

  const handleConfigClick = useCallback(() => {
    onConfigClick?.();
    onClose();
  }, [onConfigClick, onClose]);

  const handleMessageClick = useCallback(() => {
    onMessageClick?.();
    onClose();
  }, [onMessageClick, onClose]);

  // Process social links using helper
  const socialLinks = getSocialLinks(profile);

  const title = isOwnProfile ? "Mi Perfil" : "Perfil Público";
  const description = isOwnProfile
    ? "Vista previa de tu información compartida."
    : "Información de contacto y experiencia.";

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onClose}
      mode="view"
      title={title}
      description={description}
      isLoading={isLoading}
      error={error}
      loadingMessage="Cargando perfil..."
      size="lg"
      closeOnOverlayClick
      showCloseButton
      // No actions for profile view - just a display dialog
    >
      {profile && (
        <ProfileCardContent
          profile={profile}
          userId={userId}
          currentUserId={currentUserId}
          onConfigClick={handleConfigClick}
          onMessageClick={handleMessageClick}
          socialLinks={socialLinks}
        />
      )}
    </CrudDialog>
  );
}
