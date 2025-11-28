/**
 * Profile Dialog Component
 * Unified dialog for displaying user profiles
 * Uses CrudDialog organism following atomic design
 */

'use client';

import { useCallback } from 'react';
import { CrudDialog } from '@/modules/dialogs';
import { ProfileCardContent } from './ProfileCardContent/ProfileCardContent';
import { useProfile } from '../../hooks/useProfile';
import { getSocialLinks } from '../../utils/socialLinksHelper';

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
  // Use existing profile hook that fetches from Firestore
  const { profile, isLoading, error } = useProfile(userId);

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

  const isOwnProfile = userId === currentUserId;
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
