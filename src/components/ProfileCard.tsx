'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import UserAvatar from './ui/UserAvatar';
import styles from './ProfileCard.module.scss';

interface SocialLink {
  id: 'github' | 'linkedin' | 'twitter' | 'instagram' | 'dribbble';
  url: string;
  label: string;
}

interface UserProfile {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  phone?: string;
  city?: string;
  birthDate?: string;
  gender?: string;
  portfolio?: string;
  description?: string;
  stack?: string[];
  teams?: string[];
  profilePhoto?: string;
  coverPhoto?: string;
  status?: string;
  // Nuevos campos para redes sociales
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    dribbble?: string;
  };
}

interface ProfileCardProps {
  userId: string;
  imageUrl: string;
  onClose: () => void;
}

// Iconos SVG simples para redes sociales
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

const ProfileCard = ({ userId, imageUrl, onClose }: ProfileCardProps) => {
  const { user: currentUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // Para abrir MessageSidebar
  const { openMessageSidebar } = useSidebarStateStore();

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  // Animaciones para el modal
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId || !currentUser || userId === currentUser.id) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile({ id: userId, ...data });
        } else {
          setProfile(null);
        }
        setLoading(false);
        setIsVisible(true);
      },
      (err) => {
        console.error('[ProfileCard] Error fetching user profile:', err);
        setProfile(null);
        setLoading(false);
        setIsVisible(true);
      }
    );

    return () => unsubscribe();
  }, [userId, isLoaded, currentUser]);

  // Función para obtener redes sociales del perfil
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

  // Función para abrir chat con el usuario
  const handleContactClick = () => {
    if (!profile || !currentUser) return;
    
    const conversationId = `conversation_${currentUser.id}_${profile.id}`;
    openMessageSidebar(currentUser.id, {
      id: profile.id,
      imageUrl: profile.profilePhoto || imageUrl,
      fullName: profile.fullName || 'Usuario',
      role: profile.role || 'Sin rol',
    }, conversationId);
    
    // Cerrar el profile card
    handleCloseButtonClick();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }
  };

  const handleCloseButtonClick = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  if (loading || !isLoaded) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            className={styles.overlay} 
            onClick={handleOverlayClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className={styles.card}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={styles.loadingContainer}>
                <p>Cargando perfil...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (!profile || userId === currentUser?.id) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            className={styles.overlay} 
            onClick={handleOverlayClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className={styles.card}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <button
                onClick={handleCloseButtonClick}
                className={styles.closeButton}
                aria-label="Cerrar perfil"
              >
                ✕
              </button>
              <div className={styles.errorContainer}>
                <p>Perfil no disponible</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const avatarUrl = imageUrl || profile.profilePhoto || '';
  const socialLinks = getSocialLinks();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className={styles.overlay} 
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className={styles.card}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <button
              onClick={handleCloseButtonClick}
              className={styles.closeButton}
              aria-label="Cerrar perfil"
            >
              ✕
            </button>
            
            {/* Glassmorphism Profile Card */}
            <div className={styles.profileCard}>
              <div className={styles.avatarContainer}>
                <UserAvatar 
                  userId={userId}
                  imageUrl={avatarUrl}
                  userName={profile.fullName || 'Usuario'}
                  size="xlarge"
                  showStatus={true}
                />
              </div>

              <h2 className={styles.name}>{profile.fullName || 'Sin nombre'}</h2>
              <p className={styles.title}>{profile.role || 'Sin rol'}</p>
              <p className={styles.bio}>{profile.description || 'Sin descripción disponible'}</p>

              {/* Información de Contacto */}
              {(profile.phone || profile.city || profile.birthDate || profile.gender || profile.portfolio) && (
                <div className={styles.contactInfo}>
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
                </div>
              )}

              {/* Stack de Tecnologías */}
              {profile.stack && profile.stack.length > 0 && (
                <div className={styles.stackSection}>
                  <h3 className={styles.sectionTitle}>Stack de Tecnologías</h3>
                  <div className={styles.stackTags}>
                    {profile.stack.slice(0, 10).map((tech, index) => (
                      <span key={index} className={styles.stackTag}>
                        {tech}
                      </span>
                    ))}
                    {profile.stack.length > 10 && (
                      <span className={styles.stackMore}>
                        +{profile.stack.length - 10} más
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Equipos */}
              {profile.teams && profile.teams.length > 0 && (
                <div className={styles.teamsSection}>
                  <h3 className={styles.sectionTitle}>Equipos</h3>
                  <div className={styles.teamsTags}>
                    {profile.teams.map((team, index) => (
                      <span key={index} className={styles.teamTag}>
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.divider} />

              {/* Redes Sociales - Solo si existen */}
              {socialLinks.length > 0 && (
                <div className={styles.socialLinks}>
                  {socialLinks.map((item) => (
                    <SocialButton 
                      key={item.id} 
                      item={item} 
                      setHoveredItem={setHoveredItem} 
                      hoveredItem={hoveredItem} 
                    />
                  ))}
                </div>
              )}

              <ActionButton onContact={handleContactClick} />
            </div>
            
            <div className={styles.backgroundGlow} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Sub-componentes
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

interface ActionButtonProps {
  onContact: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onContact }) => (
  <button
    onClick={onContact}
    className={styles.actionButton}
  >
    <span>Enviar Mensaje</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </svg>
  </button>
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