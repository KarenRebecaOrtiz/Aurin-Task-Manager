'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { UserAvatar } from '@/modules/shared/components/atoms/Avatar/UserAvatar';
import Badge from '@/components/Badge';
import { Small, Muted } from '@/components/ui/Typography';
import { DialogHeader } from '@/modules/shared/components/molecules';

import { useProfile } from '../hooks/useProfile';
import type { ProfileCardProps } from '../types';
import styles from './ProfileCard.module.scss';
import {
  backdropVariants,
  panelVariants,
  contentVariants,
  itemVariants,
  transitions,
} from '@/modules/dialog';
import { AddedLinkItem } from '@/modules/config/components/social-links/AddedLinkItem';
import { NETWORK_CONFIG } from '@/modules/config/components/social-links/network-config';
import type { SocialLink } from '@/modules/config/components/social-links/types';

const ProfileCard = ({ isOpen, userId, onClose, onChangeContainer }: ProfileCardProps) => {
  const { user: currentUser } = useUser();
  const { profile, isLoading, error } = useProfile(userId);
  const [showAllTechs, setShowAllTechs] = useState(false);
  const stackContainerRef = useRef<HTMLDivElement>(null);
  const [isStackOverflowing, setIsStackOverflowing] = useState(false);

  const { openMessageSidebar } = useSidebarStateStore();

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const checkOverflow = () => {
      const container = stackContainerRef.current;
      if (container) {
        const isOverflowing = container.scrollHeight > 40; // Approx height for one row
        setIsStackOverflowing(isOverflowing);
      }
    };

    // Check on mount and on window resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [profile?.stack]);

  const getSocialLinks = useCallback((): SocialLink[] => {
    if (!profile?.socialLinks) return [];

    const links: SocialLink[] = [];
    const socialNetworks: Array<keyof typeof profile.socialLinks> = [
      'github',
      'linkedin',
      'twitter',
      'instagram',
    ];

    socialNetworks.forEach(network => {
      const url = profile.socialLinks?.[network];
      if (url) {
        const networkConfig = NETWORK_CONFIG[network];
        const username = url.replace(networkConfig?.prefix || '', '').split('/').pop() || '';
        links.push({
          id: network,
          networkId: network,
          username,
          fullUrl: url,
        });
      }
    });

    return links;
  }, [profile]);

  const handleContactClick = useCallback(() => {
    if (!profile || !currentUser) return;

    if (userId === currentUser.id) {
      onClose();
      return;
    }

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

  const handleConfigClick = useCallback(() => {
    onClose();
    if (onChangeContainer) {
      onChangeContainer('config');
    }
  }, [onClose, onChangeContainer]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClose();
    },
    [onClose]
  );

  const handleStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (isLoading) {
    return createPortal(
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className={styles.overlay}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitions.fast}
            onClick={handleOverlayClick}
            onMouseDown={handleStopPropagation}
          >
            <motion.div
              className={styles.card}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transitions.normal}
              onClick={handleStopPropagation}
            >
              <div className={styles.loadingContainer}>
                <p>Cargando perfil...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  if (error || !profile) {
    return createPortal(
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className={styles.overlay}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitions.fast}
            onClick={handleOverlayClick}
            onMouseDown={handleStopPropagation}
          >
            <motion.div
              className={styles.card}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transitions.normal}
              onClick={handleStopPropagation}
            >
              <div className={styles.errorContainer}>
                <p>{error?.message || 'Perfil no disponible'}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  const avatarUrl = profile.profilePhoto || '';
  const socialLinks = getSocialLinks();

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={styles.overlay}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={transitions.fast}
          onClick={handleOverlayClick}
          onMouseDown={handleStopPropagation}
        >
          <motion.div
            className={styles.card}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transitions.normal}
            onClick={handleStopPropagation}
          >
            <div className={`${styles.profileCard} overflow-y-auto flex flex-col`}>
              <DialogHeader
                title={userId === currentUser?.id ? "Mi Perfil" : "Perfil Público"}
                description={userId === currentUser?.id ? "Vista previa de tu información compartida." : "Información de contacto y experiencia."}
                className="px-10 py-6"
              />
              <motion.div
                className={styles.coverPhotoSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={transitions.fast}
              >
                <div
                  className={styles.coverPhoto}
                  style={{
                    backgroundImage: `url(${profile.coverPhoto || '/empty-cover.png'})`,
                  }}
                />
              </motion.div>

              <motion.div
                className={styles.profilePhotoOverlay}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...transitions.fast, delay: 0.03 }}
              >
                <UserAvatar
                  userId={userId}
                  imageUrl={avatarUrl}
                  userName={profile.fullName || 'Usuario'}
                  size="xl"
                  showStatus={true}
                />
              </motion.div>

              <motion.div
                className={styles.contentSection}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div className={styles.headerSection} variants={itemVariants}>
                  <div className={styles.nameAndBadgeContainer}>
                    <h2 className={styles.name}>{profile.fullName || 'Sin nombre'}</h2>

                    <div className={styles.actionButtons}>
                      {userId === currentUser?.id && (
                        <button
                          className={styles.configButton}
                          onClick={handleConfigClick}
                          aria-label="Configurar perfil"
                          title="Configurar perfil"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                          </svg>
                        </button>
                      )}

                      {userId !== currentUser?.id && (
                        <button
                          className={styles.messageButton}
                          onClick={handleContactClick}
                          aria-label={`Enviar mensaje a ${profile.fullName || 'usuario'}`}
                          title="Enviar mensaje"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M22 2L11 13" />
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {profile.role && (
                    <div className={styles.badgeContainer}>
                      <Badge role={profile.role} />
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Muted className={styles.bio}>
                    {profile.description || 'Sin descripción disponible'}
                  </Muted>
                </motion.div>

                {(profile.phone ||
                  profile.city ||
                  profile.birthDate ||
                  profile.gender) && (
                  <motion.div className={styles.contactInfo} variants={itemVariants}>
                    {profile.phone && (
                      <div className={styles.contactItem}>
                        <Small className={styles.contactLabel}>Teléfono:</Small>
                        <Small className={styles.contactValue}>{profile.phone}</Small>
                      </div>
                    )}
                    {profile.city && (
                      <div className={styles.contactItem}>
                        <Small className={styles.contactLabel}>Ubicación:</Small>
                        <Small className={styles.contactValue}>{profile.city}</Small>
                      </div>
                    )}
                    {profile.birthDate && (
                      <div className={styles.contactItem}>
                        <Small className={styles.contactLabel}>Fecha de Nacimiento:</Small>
                        <Small className={styles.contactValue}>{profile.birthDate}</Small>
                      </div>
                    )}
                    {profile.gender && (
                      <div className={styles.contactItem}>
                        <Small className={styles.contactLabel}>Género:</Small>
                        <Small className={styles.contactValue}>{profile.gender}</Small>
                      </div>
                    )}
                  </motion.div>
                )}

                {profile.stack && profile.stack.length > 0 && (
                  <motion.div className={styles.stackSection} variants={itemVariants}>
                    <h3 className={styles.sectionTitle}>Stack de Herramientas</h3>
                    <motion.div
                      ref={stackContainerRef}
                      className={styles.stackTags}
                      initial={false}
                      animate={{ maxHeight: showAllTechs ? '1000px' : '40px' }}
                      transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      {profile.stack.map(tech => (
                        <span key={tech} className={styles.stackTag}>
                          {tech}
                        </span>
                      ))}
                    </motion.div>
                    {isStackOverflowing && (
                      <button
                        onClick={() => setShowAllTechs(!showAllTechs)}
                        className={styles.toggleTechsButton}
                      >
                        {showAllTechs ? 'Ver menos' : 'Ver más'}
                      </button>
                    )}
                  </motion.div>
                )}

                <motion.div className={styles.divider} variants={itemVariants} />

                {socialLinks.length > 0 && (
                  <motion.div className={styles.socialLinks} variants={itemVariants}>
                    {socialLinks.map(link => (
                      <AddedLinkItem key={link.id} link={link} showActions={false} />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ProfileCard;
