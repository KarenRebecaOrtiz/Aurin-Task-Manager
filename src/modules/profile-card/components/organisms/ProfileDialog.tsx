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

  const currentUserData = useUserData();
  const currentUserLoading = useUserDataLoading();

  // Hooks must be called unconditionally — result ignored for own profile
  const { profile: otherUserProfile, isLoading: otherUserLoading, error: otherUserError } = useProfile(userId);

  const profile = useMemo((): UserProfile | undefined => {
    if (isOwnProfile && currentUserData) {
      return {
        id: currentUserData.userId,
        ...currentUserData,
      } as unknown as UserProfile;
    }
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
