'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './OnboardingStepper.module.scss'; // Reusing styles

interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  phone?: number | null;
  city?: string;
  birthday?: string;
  gender?: string;
  portfolio?: string;
  about?: string;
  tools?: string[];
  teams?: string[];
  coverPhoto?: string;
  profileImageUrl?: string;
  status?: string;
}

interface ProfileCardProps {
  userId: string;
  onClose: () => void;
}

const statusColors = {
  Disponible: '#178d00',
  Ocupado: '#d32f2f',
  'Por terminar': '#f57c00',
  Fuera: '#616161',
};

const ProfileCard = ({ userId, onClose }: ProfileCardProps) => {
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch user profile from Firestore
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

  // GSAP animation for modal
  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

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

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.frame2147225831}>
          <div className={styles.frame2147225915}>
            <p>Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.overlay}>
        <div className={styles.frame2147225831}>
          <div className={styles.frame2147225915}>
            <p>Perfil no encontrado.</p>
            <button className={styles.continuar} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const userName = profile.displayName || 'Usuario';
  const avatarUrl = profile.profileImageUrl && !profile.profileImageUrl.includes('default') ? profile.profileImageUrl : null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div ref={modalRef} className={styles.frame2147225831}>
        <div className={styles.frame2147225915}>
          <div className={`${styles.coverPhoto} ${!profile.coverPhoto || profile.coverPhoto === '/empty-cover.png' ? styles.emptyState : ''}`}>
            <Image
              src={profile.coverPhoto || '/empty-cover.png'}
              alt="Foto de portada"
              fill
              style={{ objectFit: 'cover' }}
              priority
              onError={() => profile.coverPhoto = '/empty-cover.png'}
            />
          </div>
          <div className={styles.frame2147225938}>
            <div className={styles.contentWrapper}>
              <div className={styles.card}>
                <div className={styles.avatar}>
                  {avatarUrl ? (
                    <Image
                      draggable="false"
                      src={avatarUrl}
                      alt={userName}
                      width={105}
                      height={105}
                      style={{ borderRadius: '1000px' }}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      <span>Sin foto</span>
                    </div>
                  )}
                </div>
                <div
                  className={styles.cardTitle}
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: statusColors[profile.status || 'Disponible'],
                    textAlign: 'center',
                  }}
                >
                  {profile.status || 'Disponible'}
                </div>
                <div className={styles.inputColumns}>
                  <div className={styles.inputColumn}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Nombre</label>
                      <p className={styles.input}>{profile.displayName || 'Sin nombre'}</p>
                    </div>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Rol</label>
                      <p className={styles.input}>{profile.role || 'Sin rol'}</p>
                    </div>
                  </div>
                  <div className={styles.inputColumn}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Correo</label>
                      <p className={styles.input}>{profile.email || 'Sin correo'}</p>
                    </div>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Cumpleaños</label>
                      <p className={styles.input}>{profile.birthday || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className={styles.inputColumn}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Teléfono</label>
                      <p className={styles.input}>{profile.phone ? `+${profile.phone}` : 'No especificado'}</p>
                    </div>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Género</label>
                      <p className={styles.input}>{profile.gender || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className={styles.inputColumn}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Ciudad</label>
                      <p className={styles.input}>{profile.city || 'No especificado'}</p>
                    </div>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Portafolio</label>
                      <p className={styles.input}>
                        {profile.portfolio ? (
                          <a
                            href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.portfolioLink}
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
                <div className={styles.aboutToolsContainer}>
                  <div className={styles.aboutSection}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Sobre mí</label>
                      <p className={styles.textarea}>{profile.about || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className={styles.toolsSection}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>Herramientas</label>
                      <div className={styles.tags}>
                        {profile.tools && profile.tools.length > 0 ? (
                          profile.tools.map((tool, index) => (
                            <div key={index} className={styles.tag}>
                              {tool}
                            </div>
                          ))
                        ) : (
                          <p>No especificado</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.teamsSection} style={{ minWidth: '100%' }}>
                  <div className={styles.inputWrapper} style={{ minWidth: '100%' }}>
                    <label className={styles.label}>Equipos</label>
                    <div className={styles.tags}>
                      {profile.teams && profile.teams.length > 0 ? (
                        profile.teams.map((team, index) => (
                          <div key={index} className={styles.tag}>
                            {team}
                          </div>
                        ))
                      ) : (
                        <p>No especificado</p>
                      )}
                    </div>
                  </div>
                </div>
                {isOwnProfile && (
                  <div className={styles.frame1000005615}>
                    <Link href="/edit-profile" className={styles.continuar}>
                      Editar Perfil
                    </Link>
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