
'use client';

import React, { useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';

import { useProfile } from '../hooks/useProfile';
import { useProfileScroll } from '../hooks/useProfileScroll';
import { getSocialLinks } from '../utils/socialLinksHelper';
import { ProfileCardWrapper } from './organisms/ProfileCardWrapper/ProfileCardWrapper';
import { ProfileCardContent } from './organisms/ProfileCardContent/ProfileCardContent';
import type { ProfileCardProps } from '../types';

const ProfileCard = ({ isOpen, userId, onClose, onChangeContainer }: ProfileCardProps) => {
  // TODO: Obtener usuario actual de Clerk
  const { user: currentUser } = useUser();

  // TODO: Obtener profile data usando custom hook
  const { profile, isLoading, error } = useProfile(userId);

  // TODO: Aplicar scroll lock cuando modal está abierto
  useProfileScroll(isOpen);

  // TODO: Obtener sidebar state para mensajes
  const { openMessageSidebar } = useSidebarStateStore();

  // TODO: Handler para abrir modal de configuración
  const handleConfigClick = useCallback(() => {
    onClose();
    if (onChangeContainer) {
      onChangeContainer('config');
    }
  }, [onClose, onChangeContainer]);

  // TODO: Handler para abrir sidebar de mensajes
  const handleContactClick = useCallback(() => {
    if (!profile || !currentUser) return;

    // No hacer nada si es el propio usuario
    if (userId === currentUser.id) {
      onClose();
      return;
    }

    // TODO: Crear conversación y abrir sidebar
    const conversationId = `conversation_${currentUser.id}_${profile.id}`;
    openMessageSidebar(
      currentUser.id,
      {
        id: profile.id,
        imageUrl: profile.profilePhoto || '',
        fullName: profile.fullName || 'Usuario',
        role: profile.role || 'Sin rol',
      },
      conversationId
    );

    onClose();
  }, [profile, currentUser, userId, onClose, openMessageSidebar]);

  // TODO: Procesar social links usando helper
  const socialLinks = getSocialLinks(profile);

  // TODO: Renderizar wrapper con estados (loading, error, normal)
  return (
    <ProfileCardWrapper
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      error={error}
      userId={userId}
      currentUserId={currentUser?.id}
    >
      {/* TODO: Renderizar contenido solo si hay profile */}
      {profile && (
        <ProfileCardContent
          profile={profile}
          userId={userId}
          currentUserId={currentUser?.id}
          onConfigClick={handleConfigClick}
          onMessageClick={handleContactClick}
          socialLinks={socialLinks}
        />
      )}
    </ProfileCardWrapper>
  );
};

export default ProfileCard;
