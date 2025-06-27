'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import Splide from '@splidejs/splide';
import '@splidejs/splide/css/core';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './UserSwiper.module.scss';
import UserAvatar from './ui/UserAvatar';

interface ClerkUser {
  id: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface UserSwiperProps {
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
  onMessageSidebarOpen: (user: User) => void;
  className?: string;
}

const statusColors = {
  'Disponible': '#28a745',
  'Ocupado': '#dc3545',
  'Por terminar': '#ff6f00',
  'Fuera': '#616161',
};

const CACHE_KEY = 'cached_users';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const UserSwiper = ({ onOpenProfile, onMessageSidebarOpen, className }: UserSwiperProps) => {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const splideRef = useRef<HTMLDivElement>(null);
  const splideInstance = useRef<Splide | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};

    const getCachedUsers = (): ClerkUser[] | null => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { users, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return users;
    };

    const setCachedUsers = (users: ClerkUser[]) => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ users, timestamp: Date.now() })
      );
    };

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const cachedUsers = getCachedUsers();
        if (cachedUsers && user?.id) {
          const filteredCachedUsers = cachedUsers.filter((u) => u.id !== user.id);
          setUsers(filteredCachedUsers);
          setIsLoading(false);
          console.log('[UserSwiper] Loaded users from cache:', {
            count: filteredCachedUsers.length,
            userIds: filteredCachedUsers.map((u) => u.id),
          });
        }

        const response = await fetch('/api/users');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch users');
        }
        const clerkUsers: ClerkUser[] = await response.json();

        const updatedUsers = clerkUsers
          .filter((u) => u.id !== user?.id)
          .map((user) => ({
            ...user,
            status: 'Disponible',
          }));
        setUsers(updatedUsers);
        setCachedUsers(updatedUsers);
        setIsLoading(false);

        const usersRef = collection(db, 'users');
        unsubscribe = onSnapshot(
          usersRef,
          (snapshot) => {
            const statusMap: { [id: string]: string } = {};
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              const firestoreStatus = data.status || 'Disponible';
              statusMap[doc.id] = firestoreStatus;
            });
            
            setUsers((prevUsers) => {
              const newUsers = prevUsers
                .map((user) => ({
                  ...user,
                  status: statusMap[user.id] || 'Disponible',
                }));
              setCachedUsers(newUsers);
              return newUsers;
            });
          },
          (error) => {
            console.error('[UserSwiper] Firestore listener error:', error);
          }
        );

        console.log('[UserSwiper] Users fetched:', { count: updatedUsers.length });
      } catch (error) {
        console.error('[UserSwiper] Error fetching users:', error);
        setUsers([]);
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      fetchUsers();
    }

    return () => unsubscribe();
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (splideRef.current && users.length > 0) {
      splideInstance.current = new Splide(splideRef.current, {
        type: 'loop',
        perPage: 2,
        perMove: 1,
        gap: '0.5rem',
        autoWidth: true,
        focus: 'center',
        autoplay: true,
        interval: 3000,
        pauseOnHover: true,
        pauseOnFocus: true,
        drag: true,
        arrows: false,
        pagination: false,
        mediaQuery: 'min',
        breakpoints: {
          360: { perPage: 2, gap: '0.5rem' },
          480: { perPage: 3, gap: '0.75rem' },
          768: { perPage: 4, gap: '1rem', focus: 0 },
          992: { perPage: 5, gap: '1.25rem' },
          1200: { perPage: 6, gap: '1.5rem' },
        },
      }).mount();

      return () => {
        if (splideInstance.current) {
          splideInstance.current.destroy();
        }
      };
    }
  }, [users]);

  const handleCardClick = async (clerkUser: ClerkUser) => {
    if (!user?.id || clerkUser.id === user.id) {
      console.log('[UserSwiper] Cannot open chat with self or invalid user:', clerkUser.id);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', clerkUser.id));
      const role = userDoc.exists() ? userDoc.data().role || 'Miembro' : 'Miembro';

      const userForChat: User = {
        id: clerkUser.id,
        imageUrl: clerkUser.imageUrl || '',
        fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
        role,
      };

      onMessageSidebarOpen(userForChat);
      console.log('[UserSwiper] Opened MessageSidebar for user:', userForChat);
    } catch (error) {
      console.error('[UserSwiper] Error fetching user role:', error);
      const userForChat: User = {
        id: clerkUser.id,
        imageUrl: clerkUser.imageUrl || '',
        fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
        role: 'Miembro',
      };
      onMessageSidebarOpen(userForChat);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, clerkUser: ClerkUser) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(clerkUser);
    }
  };

  const handleAvatarKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, user: ClerkUser) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onOpenProfile({
        id: user.id,
        imageUrl: user.imageUrl || '',
      });
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loader}>Cargando...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return <div className={styles.loading}>No hay usuarios disponibles</div>;
  }

  return (
    <div className={`${styles.swiperContainer} ${className || ''}`}>
      {/* Viñetado izquierdo */}
      <div className={styles.vignetteLeft}></div>
      
      {/* Viñetado derecho */}
      <div className={styles.vignetteRight}></div>
      
      <section
        ref={splideRef}
        className="splide"
        aria-label="Carrusel de Perfiles de Usuarios"
      >
        <div className="splide__track" style={{ paddingTop: '30px', paddingBottom: '30px', paddingLeft: '0px', paddingRight: '0px', overflow: 'visible!important' }}>
          <ul className="splide__list">
            {users.map((user) => (
              <li key={user.id} className={`splide__slide ${styles.swiperSlide}`}>
                <div
                  className={styles.card}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(user)}
                  onKeyDown={(e) => handleCardKeyDown(e, user)}
                  aria-label={`Enviar mensaje a ${user.firstName || 'Usuario'}`}
                >
                  <div className={styles.cardInfo}>
                    <div className={styles.avatarWrapper}>
                      <button
                        className={styles.cardAvatar}
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProfile({
                            id: user.id,
                            imageUrl: user.imageUrl || '',
                          });
                        }}
                        onKeyDown={(e) => handleAvatarKeyDown(e, user)}
                        aria-label={`Ver perfil de ${user.firstName || 'Usuario'}`}
                      >
                        <UserAvatar
                          userId={user.id}
                          imageUrl={user.imageUrl}
                          userName={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario'}
                          size="medium"
                          showStatus={true}
                        />
                      </button>
                    </div>
                    <div className={styles.cardText}>
                      <div className={styles.cardTitle}>
                        {(user.firstName || user.lastName)
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : 'Sin nombre'}
                      </div>
                      <div
                        className={styles.cardStatus}
                        style={{
                          color: statusColors[user.status as keyof typeof statusColors] || '#333',
                        }}
                      >
                        {user.status || 'En la oficina'}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default UserSwiper;