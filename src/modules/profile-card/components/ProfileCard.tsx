'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { UserAvatar } from '@/modules/shared/components/atoms/Avatar/UserAvatar';
import Badge from '@/components/Badge';
import StreakCounter from './StreakCounter/StreakCounter';

import { useProfile } from '../hooks/useProfile';
import type { ProfileCardProps, SocialLink } from '../types';
import styles from './ProfileCard.module.scss';
import {
  overlayVariants,
  modalCenterVariants,
  containerVariants,
  itemVariants,
  transitions
} from '@/modules/modal/config/animations';

// Iconos SVG simples para redes sociales (mantenidos igual)
const SocialIcons = {
  github: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  linkedin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  twitter: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  dribbble: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.816zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>
    </svg>
  ),
};

const ProfileCard = ({ isOpen, userId, onClose, onChangeContainer }: ProfileCardProps) => {
  const { user: currentUser } = useUser();
  const { profile, isLoading, error } = useProfile(userId);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const { openMessageSidebar } = useSidebarStateStore();

  // Body scroll lock effect
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

  const getSocialLinks = (): SocialLink[] => {
    if (!profile?.socialLinks) return [];
    
    const links: SocialLink[] = [];
    const socialNetworks: Array<keyof typeof profile.socialLinks> = [
      'github', 'linkedin', 'twitter', 'instagram', 'dribbble'
    ];
    
    socialNetworks.forEach(network => {
      const url = profile.socialLinks?.[network];
      if (url) {
        links.push({
          id: network,
          url,
          label: network.charAt(0).toUpperCase() + network.slice(1)
        });
      }
    });
    
    return links;
  };

  const handleContactClick = () => {
    if (!profile || !currentUser) return;
    
    if (userId === currentUser.id) {
      onClose();
      return;
    }
    
    const conversationId = `conversation_${currentUser.id}_${profile.id}`;
    openMessageSidebar(currentUser.id, {
      id: profile.id,
      imageUrl: profile.profilePhoto || '',
      fullName: profile.fullName || 'Usuario',
      role: profile.role || 'Sin rol',
    }, conversationId);
    
    onClose();
  };

  const handleConfigClick = () => {
    onClose();
    if (onChangeContainer) {
      onChangeContainer('config');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  if (isLoading) {
    return createPortal(
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className={styles.overlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitions.fast}
            onClick={handleOverlayClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <motion.div
              className={styles.card}
              variants={modalCenterVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transitions.normal}
              onClick={(e) => e.stopPropagation()}
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
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitions.fast}
            onClick={handleOverlayClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <motion.div
              className={styles.card}
              variants={modalCenterVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transitions.normal}
              onClick={(e) => e.stopPropagation()}
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
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={transitions.fast}
          onClick={handleOverlayClick}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <motion.div
            className={styles.card}
            variants={modalCenterVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transitions.normal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.profileCard}>
                    <motion.div
                      className={styles.coverPhotoSection}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={transitions.ultraFast}
                    >
                      <div
                        className={styles.coverPhoto}
                        style={{
                          backgroundImage: `url(${profile.coverPhoto || '/empty-cover.png'})`
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
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <motion.div className={styles.headerSection} variants={itemVariants}>
                        <div className={styles.nameAndBadgeContainer}>
                          <h2 className={styles.name}>{profile.fullName || 'Sin nombre'}</h2>
                          
                          <div className={styles.actionButtons}>
                            <StreakCounter className={styles.streakCounter} userId={userId} />
                            
                            {userId === currentUser?.id && (
                              <button
                                className={styles.configButton}
                                onClick={handleConfigClick}
                                aria-label="Configurar perfil"
                                title="Configurar perfil"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
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
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 2L11 13"/>
                                  <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
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

                      <motion.p className={styles.bio} variants={itemVariants}>
                        {profile.description || 'Sin descripción disponible'}
                      </motion.p>

                    {(profile.phone || profile.city || profile.birthDate || profile.gender || profile.portfolio) && (
                      <motion.div className={styles.contactInfo} variants={itemVariants}>
                        {profile.phone && (
                          <div className={styles.contactItem}>
                            <span className={styles.contactLabel}>Teléfono:</span>
                            <span className={styles.contactValue}>{profile.phone}</span>
                          </div>
                        )}
                        {profile.city && (
                          <div className={styles.contactItem}>
                            <span className={styles.contactLabel}>Ubicación:</span>
                            <span className={styles.contactValue}>{profile.city}</span>
                          </div>
                        )}
                        {profile.birthDate && (
                          <div className={styles.contactItem}>
                            <span className={styles.contactLabel}>Fecha de Nacimiento:</span>
                            <span className={styles.contactValue}>{profile.birthDate}</span>
                          </div>
                        )}
                        {profile.gender && (
                          <div className={styles.contactItem}>
                            <span className={styles.contactLabel}>Género:</span>
                            <span className={styles.contactValue}>{profile.gender}</span>
                          </div>
                        )}
                        {profile.portfolio && (
                          <div className={styles.contactItem}>
                            <span className={styles.contactLabel}>Portafolio:</span>
                            <a 
                              href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.portfolioLink}
                            >
                              {profile.portfolio.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {profile.stack && profile.stack.length > 0 && (
                      <motion.div className={styles.stackSection} variants={itemVariants}>
                        <h3 className={styles.sectionTitle}>Stack de Tecnologías</h3>
                        <div className={styles.stackTags}>
                          {profile.stack.map((tech, index) => (
                            <span key={index} className={styles.stackTag}>
                              {tech}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {profile.teams && profile.teams.length > 0 && (
                      <motion.div className={styles.teamsSection} variants={itemVariants}>
                        <h3 className={styles.sectionTitle}>Equipos</h3>
                        <div className={styles.teamsTags}>
                          {profile.teams.map((team, index) => (
                            <span key={index} className={styles.teamTag}>
                              {team}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <motion.div className={styles.divider} variants={itemVariants} />

                    {socialLinks.length > 0 && (
                      <motion.div className={styles.socialLinks} variants={itemVariants}>
                        {socialLinks.map((item) => (
                          <SocialButton 
                            key={item.id} 
                            item={item} 
                            setHoveredItem={setHoveredItem} 
                            hoveredItem={hoveredItem} 
                          />
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

interface SocialButtonProps {
  item: SocialLink;
  setHoveredItem: (id: string | null) => void;
  hoveredItem: string | null;
}

const SocialButton: React.FC<SocialButtonProps> = ({ item, setHoveredItem, hoveredItem }) => (
  <div className={styles.socialButtonContainer}>
    <a
      href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.socialButton}
      onMouseEnter={() => setHoveredItem(item.id)}
      onMouseLeave={() => setHoveredItem(null)}
      aria-label={item.label}
    >
      <div className={styles.socialIcon}>
        {SocialIcons[item.id]}
      </div>
    </a>
    <Tooltip item={item} hoveredItem={hoveredItem} />
  </div>
);

interface TooltipProps {
  item: SocialLink;
  hoveredItem: string | null;
}

const Tooltip: React.FC<TooltipProps> = ({ item, hoveredItem }) => (
  <div 
    role="tooltip"
    className={`${styles.tooltip} ${hoveredItem === item.id ? styles.tooltipVisible : ''}`}
  >
    {item.label}
    <div className={styles.tooltipArrow} />
  </div>
);

export default ProfileCard;
