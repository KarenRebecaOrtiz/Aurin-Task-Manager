'use client';

// PRIORIDAD DE DATOS:
// 1. Clerk: imageUrl, firstName, lastName (datos primarios de usuario)
// 2. Firestore: status (estado en línea) y role (rol del usuario) únicamente

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import Splide from '@splidejs/splide';
import '@splidejs/splide/css/core';
import styles from './UserSwiper.module.scss';
import UserAvatar from './ui/UserAvatar';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useDataStore } from '@/stores/dataStore';

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

const UserSwiper = ({ onOpenProfile, onMessageSidebarOpen, className }: UserSwiperProps) => {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const splideRef = useRef<HTMLDivElement>(null);
  const splideInstance = useRef<Splide | null>(null);

  // Consumir usuarios del dataStore centralizado
  const { users: storeUsers, isLoadingUsers } = useStore(
    useDataStore,
    useShallow((state) => ({
      users: state.users,
      isLoadingUsers: state.isLoadingUsers,
    }))
  );

  // Convertir usuarios del store al formato que necesita UserSwiper
  const users: ClerkUser[] = storeUsers.map((storeUser) => ({
    id: storeUser.id,
    imageUrl: storeUser.imageUrl,
    firstName: storeUser.fullName.split(' ')[0] || '',
    lastName: storeUser.fullName.split(' ').slice(1).join(' ') || '',
    status: 'Disponible', // Default status, se puede obtener de Firestore si es necesario
  }));

  useEffect(() => {
    // Actualizar loading state basado en el estado del store
    setIsLoading(isLoadingUsers);
  }, [isLoadingUsers]);

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

    // Usar datos del store centralizado
    const storeUser = storeUsers.find(u => u.id === clerkUser.id);
    if (!storeUser) {
      console.error('[UserSwiper] User not found in store:', clerkUser.id);
      return;
    }

    const userForChat: User = {
      id: storeUser.id,
      imageUrl: storeUser.imageUrl,
      fullName: storeUser.fullName,
      role: storeUser.role,
    };

    onMessageSidebarOpen(userForChat);
    console.log('[UserSwiper] Opened MessageSidebar for user:', {
      userId: userForChat.id,
      fullName: userForChat.fullName,
      role: userForChat.role,
      dataSource: 'Centralized dataStore',
    });
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
    <div className={`${styles.swiperContainer} ${className || ''}`} style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      {/* Viñetado izquierdo */}
      <div className={styles.vignetteLeft}></div>
      
      {/* Viñetado derecho */}
      <div className={styles.vignetteRight}></div>
      
      <section
        ref={splideRef}
        className="splide"
        aria-label="Carrusel de Perfiles de Usuarios"
        
      >
        <div className="splide__track" style={{ 
          paddingTop: '20px', 
          paddingBottom: '20px', 
          paddingLeft: '0px', 
          paddingRight: '0px', 
          overflow: 'visible!important' 
        }}>
          <ul className="splide__list" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
            {users.map((user) => (
              <li key={user.id} >
                <div
                  className={styles.card}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(user)}
                  onKeyDown={(e) => handleCardKeyDown(e, user)}
                  aria-label={`Enviar mensaje a ${user.firstName || 'Usuario'}`}
                  
                >
                  <div className={styles.cardInfo} >
                    <div className={styles.avatarWrapper} >
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
                    <div className={styles.cardText} >
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
                        {user.status || 'Disponible'}
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