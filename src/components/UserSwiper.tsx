'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Splide from '@splidejs/splide';
import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';
import '@splidejs/splide/css/core'; // Import core styles
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './UserSwiper.module.scss';

interface ClerkUser {
  id: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

interface UserSwiperProps {
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
}

const statusColors = {
  Disponible: '#178d00',
  Ocupado: '#d32f2f',
  'Por terminar': '#f57c00',
  Fuera: '#616161',
};

// Cache configuration
const CACHE_KEY = 'cached_users';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const UserSwiper = ({ onOpenProfile }: UserSwiperProps) => {
  const { isLoaded } = useUser();
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
        // Check cache first
        const cachedUsers = getCachedUsers();
        if (cachedUsers) {
          setUsers(cachedUsers);
          setIsLoading(false);
          console.log('[UserSwiper] Loaded users from cache:', {
            count: cachedUsers.length,
          });
        }

        const response = await fetch('/api/users');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch users');
        }
        const clerkUsers: ClerkUser[] = await response.json();

        const updatedUsers = clerkUsers.map((user) => ({
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
              statusMap[doc.id] = doc.data().status || 'Disponible';
            });

            setUsers((prevUsers) => {
              const newUsers = prevUsers.map((user) => ({
                ...user,
                status: statusMap[user.id] || user.status || 'Disponible',
              }));
              setCachedUsers(newUsers);
              return newUsers;
            });
            console.log('[UserSwiper] User statuses updated:', statusMap);
          },
          (error) => {
            console.error('[UserSwiper] Firestore listener error:', error);
          }
        );

        console.log('[UserSwiper] Users fetched:', { count: clerkUsers.length });
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
  }, [isLoaded]);

  useEffect(() => {
    if (splideRef.current && users.length > 0) {
      // Initialize Splide
      splideInstance.current = new Splide(splideRef.current, {
        type: 'loop', // Equivalent to Swiper's loop
        perPage: 7, // Default for large screens
        perMove: 1,
        gap: '2rem', // Space between slides
        autoWidth: true, // Allow slides to have their own width
        focus: 'center', // Center the active slide
        autoplay: true, // Enable autoplay
        interval: 3000, // Autoplay interval
        pauseOnHover: true, // Pause on hover
        pauseOnFocus: true, // Pause on focus
        drag: true, // Enable drag
        arrows: false, // Hide arrows (customize if needed)
        pagination: true, // Show pagination dots
        breakpoints: {
          1440: { perPage: 7, gap: '2rem' },
          1280: { perPage: 6, gap: '1.75rem' },
          1024: { perPage: 5, gap: '1.5rem' },
          768: { perPage: 4, gap: '1.25rem' },
          640: { perPage: 3, gap: '1rem' },
          480: { perPage: 2, gap: '0.75rem', focus: false },
          320: { perPage: 1, gap: '0.625rem', focus: 'center' },
        },
        classes: {
          pagination: `splide__pagination ${styles.swiperPagination}`,
        },
      }).mount();

      // Clean up Splide instance on unmount
      return () => {
        if (splideInstance.current) {
          splideInstance.current.destroy();
        }
      };
    }
  }, [users]);

  if (!isLoaded || isLoading) {
    return (
      <div className={styles.loading}>
        <div className="main">
          <div className="up">
            <div className="loaders">
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
              <div className="loader"></div>
            </div>
            <div className="loadersB">
              <div className="loaderA">
                <div className="ball0"></div>
              </div>
              <div className="loaderA">
                <div className="ball1"></div>
              </div>
              <div className="loaderA">
                <div className="ball2"></div>
              </div>
              <div className="loaderA">
                <div className="ball3"></div>
              </div>
              <div className="loaderA">
                <div className="ball4"></div>
              </div>
              <div className="loaderA">
                <div className="ball5"></div>
              </div>
              <div className="loaderA">
                <div className="ball6"></div>
              </div>
              <div className="loaderA">
                <div className="ball7"></div>
              </div>
              <div className="loaderA">
                <div className="ball8"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return <div className={styles.loading}>No hay usuarios disponibles</div>;
  }

  return (
    <div className={styles.swiperContainer}>
      <section
        ref={splideRef}
        className="splide"
        aria-label="User Profiles Carousel"
      >
        <div className="splide__track">
          <ul className="splide__list">
            {users.map((user) => (
              <li key={user.id} className={`splide__slide ${styles.swiperSlide}`}>
                <div
                  className={styles.card}
                  role="article"
                  aria-label={`Perfil de ${user.firstName || 'Usuario'}`}
                >
                  <div className={styles.cardInfo}>
                    <div
                      className={`${styles.cardAvatar} ${
                        styles[
                          `status-${
                            user.status?.replace(' ', '-') || 'Disponible'
                          }`
                        ]
                      }`}
                    >
                      <Image
                        src={user.imageUrl || '/default-avatar.png'}
                        alt={user.firstName || 'User avatar'}
                        width={48}
                        height={48}
                        className={styles.avatarImage}
                        onError={(e) => {
                          e.currentTarget.src = '/default-avatar.png';
                        }}
                      />
                    </div>
                    <div
                      className={styles.cardTitle}
                      style={{ fontSize: '14px', fontWeight: '600' }}
                    >
                      {(user.firstName || user.lastName)
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : 'Sin nombre'}
                    </div>
                    <button
                      className={styles.viewProfileButton}
                      onClick={() =>
                        onOpenProfile({
                          id: user.id,
                          imageUrl: user.imageUrl || '/default-avatar.png',
                        })
                      }
                      aria-label={`Ver perfil de ${user.firstName || 'Usuario'}`}
                    >
                      Ver Perfil
                    </button>
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