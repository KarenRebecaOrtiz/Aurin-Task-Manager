'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EditProfile from './EditProfile';
import styles from './ProfileCard.module.scss';

interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  phone?: string | null;
  city?: string;
  birthday?: string;
  gender?: string;
  portfolio?: string;
  about?: string;
  tools?: string[];
  teams?: string[];
  coverPhoto?: string;
  status?: string;
}

interface ProfileCardProps {
  userId: string;
  imageUrl: string;
  onClose: () => void;
}

const statusColors = {
  Disponible: '#178d00',
  Ocupado: '#d32f2f',
  'Por terminar': '#f57c00',
  Fuera: '#616161',
};

const ProfileCard = ({ userId, imageUrl, onClose }: ProfileCardProps) => {
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile({ id: userId, ...docSnap.data() } as UserProfile);
          console.log('[ProfileCard] User profile fetched:', docSnap.data());
        } else {
          console.log('[ProfileCard] No user document found for ID:', userId);
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ProfileCard] Error fetching user profile:', err);
        setProfile(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [isEditing]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }
  };

  const handleCloseButtonClick = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: onClose,
    });
  };

  const handleEditClick = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setIsEditing(true);
        gsap.fromTo(
          modalRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' }
        );
      },
    });
  };

  if (isEditing) {
    return <EditProfile userId={userId} imageUrl={imageUrl} onClose={onClose} />;
  }

  if (loading) {
    return (
      <div className={styles.ProfileCardOverlay} onClick={handleOverlayClick}>
        <div className={styles.ProfileCardFrameMain}>
          <div className={styles.ProfileCardFrameInner}>
            <p>Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.ProfileCardOverlay} onClick={handleOverlayClick}>
        <div className={styles.ProfileCardFrameMain}>
          <div className={styles.ProfileCardFrameInner}>
            <p>Perfil no encontrado.</p>
            <button className={styles.ProfileCardButton} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const userName = profile.displayName || 'Usuario';
  const avatarUrl = imageUrl || '/default-avatar.png';

  return (
    <div className={styles.ProfileCardOverlay} onClick={handleOverlayClick}>
      <div ref={modalRef} className={styles.ProfileCardFrameMain}>
        <button
          onClick={handleCloseButtonClick}
          className={styles.ProfileCardCloseButton}
          aria-label="Cerrar perfil"
        >
          ✕
        </button>
        <div className={styles.ProfileCardFrameInner}>
          <div className={`${styles.ProfileCardCoverPhoto} ${!profile.coverPhoto || profile.coverPhoto === '/empty-cover.png' ? styles.ProfileCardEmptyState : ''}`}>
            <Image
              src={profile.coverPhoto || '/empty-cover.png'}
              alt="Foto de portada"
              fill
              style={{ objectFit: 'cover' }}
              priority
              onError={() => (profile.coverPhoto = '/empty-cover.png')}
            />
          </div>
          <div className={styles.ProfileCardFrameContent}>
            <div className={styles.ProfileCardContentWrapper}>
              <div className={styles.ProfileCard}>
                <div className={styles.ProfileCardAvatar}>
                  {avatarUrl ? (
                    <Image
                      draggable="false"
                      src={avatarUrl}
                      alt={userName}
                      width={120}
                      height={120}
                      style={{ borderRadius: '1000px' }}
                    />
                  ) : (
                    <div className={styles.ProfileCardAvatarPlaceholder}>
                      <span>Sin foto</span>
                    </div>
                  )}
                </div>
                <div className={styles.ProfileCardInputColumns}>
                  <div className={styles.ProfileCardInputColumn}>
                    <div className={styles.ProfileCardInputWrapper}>
                      <p className={styles.ProfileCardInputName}>{profile.displayName || 'Sin nombre'}</p>
                    </div>
                    <div className={styles.ProfileCardInputWrapper}>
                      <p className={styles.ProfileCardInputRole}>{profile.role || 'Sin rol'}</p>
                      <div className={styles.ProfileCardAboutSection}>
                        <div className={styles.ProfileCardInputWrapper}>
                          <label className={styles.ProfileCardLabelLarge}>Sobre mí</label>
                          <p className={styles.ProfileCardTextarea}>{profile.about || 'No especificado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.ProfileCardInfoGrid}>
                    <div className={styles.ProfileCardInputColumn}>
                      <div className={styles.ProfileCardInputWrapperSmall}>
                        <Image src="/mail.svg" alt="Correo" width={16} height={16} />
                        <div>
                          <label className={styles.ProfileCardLabel}>Correo</label>
                          <p className={styles.ProfileCardInput}>{profile.email || 'Sin correo'}</p>
                        </div>
                      </div>
                      <div className={styles.ProfileCardInputWrapperSmall}>
                        <Image src="/birthday.svg" alt="Cumpleaños" width={16} height={16} />
                        <div>
                          <label className={styles.ProfileCardLabel}>Cumpleaños</label>
                          <p className={styles.ProfileCardInput}>{profile.birthday || 'No especificado'}</p>
                        </div>
                      </div>
                    </div>
                    <div className={styles.ProfileCardInputColumn}>
                      <div className={styles.ProfileCardInputWrapperSmall}>
                        <Image src="/phone.svg" alt="Teléfono" width={16} height={16} />
                        <div>
                          <label className={styles.ProfileCardLabel}>Teléfono</label>
                          <p className={styles.ProfileCardInput}>{profile.phone ? `${profile.phone}` : 'No especificado'}</p>
                        </div>
                      </div>
                      <div className={styles.ProfileCardInputWrapperSmall}>
                        <Image src="/gender.svg" alt="Género" width={16} height={16} />
                        <div>
                          <label className={styles.ProfileCardLabel}>Género</label>
                          <p className={styles.ProfileCardInput}>{profile.gender || 'No especificado'}</p>
                        </div>
                      </div>
                    </div>
                    <div className={styles.ProfileCardInputColumn}>
                      <div className={styles.ProfileCardInputWrapperSmall}>
                        <Image src="/location.svg" alt="Ciudad" width={16} height={16} />
                        <div>
                          <label className={styles.ProfileCardLabel}>Ciudad</label>
                          <p className={styles.ProfileCardInput}>{profile.city || 'No especificado'}</p>
                        </div>
                      </div>
                      <div className={styles.ProfileCardInputWrapperSmall}>
                        <Image src="/link.svg" alt="Portafolio" width={16} height={16} />
                        <div>
                          <label className={styles.ProfileCardLabel}>Portafolio</label>
                          <p className={styles.ProfileCardInput}>
                            {profile.portfolio ? (
                              <a
                                href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.ProfileCardPortfolioLink}
                              >
                                {profile.portfolio}
                              </a>
                            ) : (
                              'Sin portafolio'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.ProfileCardAboutToolsContainer}>
                  <div className={styles.ProfileCardToolsSection}>
                    <div className={styles.ProfileCardInputWrapper}>
                      <label className={styles.ProfileCardLabel}>Herramientas</label>
                      <div className={styles.ProfileCardTags}>
                        {profile.tools && profile.tools.length > 0 ? (
                          profile.tools.map((tool, index) => (
                            <div key={index} className={styles.ProfileCardTag}>
                              {tool}
                            </div>
                          ))
                        ) : (
                          <p>No especificado</p>
                        )}
                      </div>
                    </div>
                    <div className={styles.ProfileCardInputWrapper}>
                      <label className={styles.ProfileCardLabel}>Equipos</label>
                      <div className={styles.ProfileCardTags}>
                        {profile.teams && profile.teams.length > 0 ? (
                          profile.teams.map((team, index) => (
                            <div key={index} className={styles.ProfileCardTag}>
                              {team}
                            </div>
                          ))
                        ) : (
                          <p>No especificado</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {isOwnProfile && (
                  <div className={styles.ProfileCardButtonWrapper}>
                    <button onClick={handleEditClick} className={styles.ProfileCardButton}>
                      Editar Perfil
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;