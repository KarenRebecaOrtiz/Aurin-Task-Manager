'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TeamsTable from './TeamsTable';
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
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Animaciones con Framer Motion - más sutiles y finas
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

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const fieldVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

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
        setIsVisible(true);
      },
      (err) => {
        console.error('[ProfileCard] Error fetching user profile:', err);
        setAlert({ type: 'error', message: 'Error al cargar el perfil', error: err.message });
        setProfile(null);
        setLoading(false);
        setIsVisible(true);
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
              profilePhoto: doc.data().profilePhoto || '',
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
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            className={styles.ProfileCardOverlay} 
            onClick={handleOverlayClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className={styles.ProfileCardFrameMain} 
              ref={modalRef}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={styles.ProfileCardFrameInner}>
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
            className={styles.ProfileCardOverlay} 
            onClick={handleOverlayClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className={styles.ProfileCardFrameMain} 
              ref={modalRef}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
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
            </motion.div>
            {alert?.type === 'error' && (
              <FailAlert message={alert.message} error={alert.error || 'Error desconocido'} onClose={handleAlertClose} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const avatarUrl = imageUrl || profile.profilePhoto || '';
  const coverPhotoUrl = profile.coverPhoto || '/empty-cover.png';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className={styles.ProfileCardOverlay} 
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className={styles.ProfileCardFrameMain} 
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <button
              onClick={handleCloseButtonClick}
              className={styles.ProfileCardCloseButton}
              aria-label="Cerrar perfil"
            >
              ✕
            </button>
            <motion.div 
              className={styles.frame239189}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
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
                      onError={(e) => (e.currentTarget.src = '')}
                    />
                  </div>
                  <div className={styles.frame239179}>
                    <div className={styles.mainName}>{profile.fullName || 'Sin nombre'}</div>
                    <div className={styles.exampleMailCom}>{profile.email || 'Sin correo'}</div>
                  </div>
                </div>
              </div>
              <motion.div 
                className={styles.content}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.section className={styles.section} variants={sectionVariants}>
                  <h2 className={styles.sectionTitle}>Información General</h2>
                  <div className={styles.sectionContent}>
                    <motion.div className={styles.fieldGroupRow} variants={fieldVariants}>
                      <div className={styles.frame239182}>
                        <div className={styles.label}>Nombre Completo</div>
                        <div className={styles.input}>{profile.fullName || 'No especificado'}</div>
                      </div>
                      <div className={styles.frame239183}>
                        <div className={styles.label}>Rol o Cargo</div>
                        <div className={styles.input}>{profile.role || 'No especificado'}</div>
                      </div>
                    </motion.div>
                    <motion.div className={styles.fieldGroupRow} variants={fieldVariants}>
                      <div className={styles.frame239182}>
                        <div className={styles.label}>Acerca de ti</div>
                        <div className={styles.input}>{profile.description || 'No especificado'}</div>
                      </div>
                    </motion.div>
                    <motion.div className={styles.fieldGroupRow} variants={fieldVariants}>
                      <div className={styles.frame239182}>
                        <div className={styles.label}>Correo Electrónico</div>
                        <div className={styles.input}>{profile.email || 'No especificado'}</div>
                      </div>
                      <div className={styles.frame239183}>
                        <div className={styles.label}>Fecha de Nacimiento</div>
                        <div className={styles.input}>{profile.birthDate || 'No especificado'}</div>
                      </div>
                    </motion.div>
                    <motion.div className={styles.fieldGroupRow} variants={fieldVariants}>
                      <div className={styles.frame239182}>
                        <div className={styles.label}>Teléfono de Contacto</div>
                        <div className={styles.input}>{formatPhoneNumber(profile.phone)}</div>
                      </div>
                      <div className={styles.frame239183}>
                        <div className={styles.label}>Ciudad de Residencia</div>
                        <div className={styles.input}>{profile.city || 'No especificado'}</div>
                      </div>
                    </motion.div>
                    <motion.div className={styles.fieldGroupRow} variants={fieldVariants}>
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
                    </motion.div>
                  </div>
                </motion.section>
                <motion.section className={styles.section} variants={sectionVariants}>
                  <h2 className={styles.sectionTitle}>Stack Tecnológico</h2>
                      <div className={styles.stackDescription}>
                        Tecnologías y herramientas que domina el usuario.
                      </div>
                  <div className={styles.sectionContentNoPadding}>
                    <motion.div className={styles.fieldGroup} variants={fieldVariants}>

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
                    </motion.div>
                  </div>
                </motion.section>
                <motion.section className={styles.section} variants={sectionVariants}>
                  <h2 className={styles.sectionTitle}>Equipos de Trabajo</h2>
                  <div className={styles.sectionContent}>
                    <div className={styles.teamsDescription}>
                      Equipos a los que pertenece el usuario.
                    </div>
                    {profile.teams && profile.teams.length > 0 ? (
                      <TeamsTable
                        teams={profile.teams.map(teamName => ({
                          name: teamName,
                          members: teamMembers[teamName] || []
                        }))}
                        currentUserId={currentUser?.id}
                      />
                    ) : (
                      <div className={styles.noDataMessage}>No pertenece a ningún equipo</div>
                    )}
                  </div>
                </motion.section>
              </motion.div>
            </motion.div>
          </motion.div>
          {alert?.type === 'success' && (
            <SuccessAlert message={alert.message} onClose={handleAlertClose} />
          )}
          {alert?.type === 'error' && (
            <FailAlert message={alert.message} error={alert.error || 'Error desconocido'} onClose={handleAlertClose} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileCard;