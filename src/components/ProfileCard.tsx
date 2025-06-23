'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Table from './Table';
import SuccessAlert from './SuccessAlert';
import FailAlert from './FailAlert';
import styles from './ProfileCard.module.scss';

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
}

interface User {
  id: string;
  fullName: string;
  role?: string;
  profilePhoto?: string;
}

interface ProfileCardProps {
  userId: string;
  imageUrl: string;
  onClose: () => void;
}

const ProfileCard = ({ userId, imageUrl, onClose }: ProfileCardProps) => {
  const { user: currentUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ [team: string]: User[] }>({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string; error?: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !userId || !currentUser || userId === currentUser.id) {
      if (userId === currentUser?.id) {
        setAlert({ type: 'error', message: 'No puedes ver tu propio perfil aquí' });
        setLoading(false);
      }
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile({ id: userId, ...data });
          console.log('[ProfileCard] User profile fetched:', data);
        } else {
          setAlert({ type: 'error', message: 'Perfil no encontrado' });
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ProfileCard] Error fetching user profile:', err);
        setAlert({ type: 'error', message: 'Error al cargar el perfil', error: err.message });
        setProfile(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, isLoaded, currentUser]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!profile?.teams?.length) {
        setTeamMembers({});
        return;
      }

      try {
        const membersByTeam: { [team: string]: User[] } = {};
        for (const team of profile.teams) {
          const q = query(collection(db, 'users'), where('teams', 'array-contains', team));
          const querySnapshot = await getDocs(q);
          membersByTeam[team] = querySnapshot.docs
            .map((doc) => ({
              id: doc.id,
              fullName: doc.data().fullName || 'Sin nombre',
              role: doc.data().role || 'Sin rol',
              profilePhoto: doc.data().profilePhoto || '/default-avatar.png',
            }))
            .filter((member) => member.id !== userId);
        }
        setTeamMembers(membersByTeam);
      } catch (err) {
        console.error('[ProfileCard] Error fetching team members:', err);
        setAlert({ type: 'error', message: 'Error al cargar los miembros del equipo', error: err.message });
      }
    };

    if (profile) {
      fetchTeamMembers();
    }
  }, [profile, userId]);

  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }

    const sections = document.querySelectorAll(`.${styles.section}`);
    sections.forEach((section) => {
      gsap.fromTo(
        section,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    const fields = document.querySelectorAll(`.${styles.fieldGroup}, .${styles.fieldGroupRow}`);
    fields.forEach((field) => {
      gsap.fromTo(
        field,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: field,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    const tables = document.querySelectorAll(`.${styles.teamTableContainer}`);
    tables.forEach((table) => {
      gsap.fromTo(
        table,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: table,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    });
  }, [profile]);

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

  const handleAlertClose = () => {
    setAlert(null);
  };

  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return 'No especificado';
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return phone;
    return `(${digits.slice(0, 2)})-${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7)}`;
  };

  if (loading || !isLoaded) {
    return (
      <div className={styles.ProfileCardOverlay} onClick={handleOverlayClick}>
        <div className={styles.ProfileCardFrameMain} ref={modalRef}>
          <div className={styles.ProfileCardFrameInner}>
            <p>Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || userId === currentUser?.id) {
    return (
      <div className={styles.ProfileCardOverlay} onClick={handleOverlayClick}>
        <div className={styles.ProfileCardFrameMain} ref={modalRef}>
          <button
            onClick={handleCloseButtonClick}
            className={styles.ProfileCardCloseButton}
            aria-label="Cerrar perfil"
          >
            ✕
          </button>
          <div className={styles.ProfileCardFrameInner}>
            <p>{alert?.message || 'Perfil no disponible'}</p>
            <button className={styles.ProfileCardButton} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
        {alert?.type === 'error' && (
          <FailAlert message={alert.message} error={alert.error || 'Error desconocido'} onClose={handleAlertClose} />
        )}
      </div>
    );
  }

  const avatarUrl = imageUrl || profile.profilePhoto || '/default-avatar.png';
  const coverPhotoUrl = profile.coverPhoto || '/empty-cover.png';

  const teamTableColumns = [
    {
      key: 'profilePhoto',
      label: 'Foto',
      width: '100px',
      mobileVisible: true,
      render: (member: User) => (
        <Image
          src={member.profilePhoto || '/default-avatar.png'}
          alt={member.fullName}
          width={40}
          height={40}
          className={styles.teamAvatar}
        />
      ),
    },
    {
      key: 'fullName',
      label: 'Nombre',
      width: 'auto',
      mobileVisible: true,
    },
    {
      key: 'role',
      label: 'Rol',
      width: 'auto',
      mobileVisible: true,
    },
  ];

  return (
    <div className={styles.ProfileCardOverlay} onClick={handleOverlayClick}>
      <div className={styles.ProfileCardFrameMain} ref={modalRef}>
        <button
          onClick={handleCloseButtonClick}
          className={styles.ProfileCardCloseButton}
          aria-label="Cerrar perfil"
        >
          ✕
        </button>
        <div className={styles.frame239189}>
          <div
            className={styles.frame239197}
            style={{ backgroundImage: `url(${coverPhotoUrl})` }}
            data-empty={!profile.coverPhoto || profile.coverPhoto === '/empty-cover.png'}
          />
          <div className={styles.frame2}>
            <div className={styles.frame1}>
              <div className={styles.profilePhotoContainer}>
                <Image
                  src={avatarUrl}
                  alt={profile.fullName || 'Usuario'}
                  width={94}
                  height={94}
                  className={styles.ellipse11}
                  onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
                />
              </div>
              <div className={styles.frame239179}>
                <div className={styles.mainName}>{profile.fullName || 'Sin nombre'}</div>
                <div className={styles.exampleMailCom}>{profile.email || 'Sin correo'}</div>
              </div>
            </div>
          </div>
          <div className={styles.content}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Información General</h2>
              <div className={styles.sectionContent}>
                <div className={styles.fieldGroup}>
                  <div className={styles.frame239182}>
                    <div className={styles.label}>Nombre Completo</div>
                    <div className={styles.input}>{profile.fullName || 'No especificado'}</div>
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.label}>Rol o Cargo</div>
                    <div className={styles.input}>{profile.role || 'No especificado'}</div>
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <div className={styles.frame239182}>
                    <div className={styles.label}>Acerca de ti</div>
                    <div className={styles.input}>{profile.description || 'No especificado'}</div>
                  </div>
                </div>
                <div className={styles.fieldGroupRow}>
                  <div className={styles.frame239182}>
                    <div className={styles.label}>Correo Electrónico</div>
                    <div className={styles.input}>{profile.email || 'No especificado'}</div>
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.label}>Fecha de Nacimiento</div>
                    <div className={styles.input}>{profile.birthDate || 'No especificado'}</div>
                  </div>
                </div>
                <div className={styles.fieldGroupRow}>
                  <div className={styles.frame239182}>
                    <div className={styles.label}>Teléfono de Contacto</div>
                    <div className={styles.input}>{formatPhoneNumber(profile.phone)}</div>
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.label}>Ciudad de Residencia</div>
                    <div className={styles.input}>{profile.city || 'No especificado'}</div>
                  </div>
                </div>
                <div className={styles.fieldGroupRow}>
                  <div className={styles.frame239182}>
                    <div className={styles.label}>Género</div>
                    <div className={styles.input}>{profile.gender || 'No especificado'}</div>
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.label}>Portafolio en Línea</div>
                    <div className={styles.input}>
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
                        'No especificado'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Stack Tecnológico</h2>
              <div className={styles.sectionContent}>
                <div className={styles.fieldGroup}>
                  <div className={styles.stackDescription}>
                    Tecnologías y herramientas que domina el usuario.
                  </div>
                  <div className={styles.ProfileCardTags}>
                    {profile.stack && profile.stack.length > 0 ? (
                      profile.stack.map((tool, index) => (
                        <div key={index} className={styles.ProfileCardTag}>
                          {tool}
                        </div>
                      ))
                    ) : (
                      <div className={styles.noDataMessage}>No hay tecnologías especificadas</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Equipos de Trabajo</h2>
              <div className={styles.sectionContent}>
                <div className={styles.teamsDescription}>
                  Equipos a los que pertenece el usuario y sus miembros.
                </div>
                {profile.teams && profile.teams.length > 0 ? (
                  profile.teams.map((team) => (
                    <div key={team} className={styles.teamTableContainer}>
                      <div className={styles.teamHeader}>
                        <h3 className={styles.teamHeading}>{team}</h3>
                        <div className={styles.teamMemberCount}>
                          {teamMembers[team]?.length || 0} miembro{(teamMembers[team]?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <p className={styles.teamSubheading}>
                        Otros miembros del equipo {team}
                      </p>
                      {teamMembers[team] && teamMembers[team].length > 0 ? (
                        <Table
                          data={teamMembers[team]}
                          columns={teamTableColumns}
                          itemsPerPage={5}
                        />
                      ) : (
                        <div className={styles.noTeamMembers}>
                          No hay otros miembros visibles en este equipo
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.noDataMessage}>No pertenece a ningún equipo</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      {alert?.type === 'success' && (
        <SuccessAlert message={alert.message} onClose={handleAlertClose} />
      )}
      {alert?.type === 'error' && (
        <FailAlert message={alert.message} error={alert.error || 'Error desconocido'} onClose={handleAlertClose} />
      )}
    </div>
  );
};

export default ProfileCard;