'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProfileCard from './ProfileCard'; // Import the updated ProfileCard
import 'swiper/css';
import styles from './UserSwiper.module.scss';

interface ClerkUser {
  id: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  status?: string; // Firestore status
}

const statusColors = {
  Disponible: '#178d00',
  Ocupado: '#d32f2f',
  'Por terminar': '#f57c00',
  Fuera: '#616161',
};

const UserSwiper = () => {
  const { isLoaded } = useUser();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null); // Store selected user object

  // Fetch users from Clerk and set up real-time Firestore listener
  useEffect(() => {
    let unsubscribe = () => {};

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch users');
        }
        const clerkUsers: ClerkUser[] = await response.json();

        // Initialize users with default status
        setUsers(clerkUsers.map(user => ({ ...user, status: 'Disponible' })));

        // Set up real-time listener for user statuses
        const usersRef = collection(db, 'users');
        unsubscribe = onSnapshot(usersRef, (snapshot) => {
          const statusMap: { [id: string]: string } = {};
          snapshot.forEach(doc => {
            statusMap[doc.id] = doc.data().status || 'Disponible';
          });

          // Update users state with new statuses
          setUsers(prevUsers =>
            prevUsers.map(user => ({
              ...user,
              status: statusMap[user.id] || user.status || 'Disponible',
            }))
          );
          console.log('[UserSwiper] User statuses updated:', statusMap);
        }, (error) => {
          console.error('[UserSwiper] Firestore listener error:', error);
        });

        console.log('[UserSwiper] Users fetched:', { count: clerkUsers.length });
      } catch (error) {
        console.error('[UserSwiper] Error fetching users:', error);
        setUsers([]);
      }
    };

    if (isLoaded) {
      fetchUsers();
    }

    // Clean up Firestore listener
    return () => unsubscribe();
  }, [isLoaded]);

  if (!isLoaded || users.length === 0) {
    return <div className={styles.loading}>Cargando usuarios...</div>;
  }

  return (
    <div className={styles.swiperContainer}>
      <Swiper
        slidesPerView={'auto'}
        spaceBetween={8}
        centeredSlides={true}
        loop={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        grabCursor={true}
        modules={[Autoplay]}
        breakpoints={{
          320: { slidesPerView: 'auto', spaceBetween: 10, centeredSlides: true },
          480: { slidesPerView: 'auto', spaceBetween: 12, centeredSlides: false },
          640: { slidesPerView: 3, spaceBetween: 16 },
          768: { slidesPerView: 4, spaceBetween: 20 },
          1024: { slidesPerView: 5, spaceBetween: 24 },
          1280: { slidesPerView: 6, spaceBetween: 28 },
          1440: { slidesPerView: 7, spaceBetween: 32 },
        }}
        className={styles.swiper}
      >
        {users.map((user) => (
          <SwiperSlide key={user.id} className={styles.swiperSlide}>
            <div
              className={styles.card}
              role="article"
              aria-label={`Perfil de ${user.firstName || 'Usuario'}`}
              onClick={() => setSelectedUser(user)} // Store entire user object
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.cardInfo}>
                <div className={`${styles.cardAvatar} ${styles[`status-${user.status?.replace(' ', '-') || 'Disponible'}`]}`}>
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
                <div className={styles.cardTitle} style={{ fontSize: '14px', fontWeight: '600' }}>
                  {(user.firstName || user.lastName)
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : 'Sin nombre'}
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      {selectedUser && (
        <ProfileCard
          userId={selectedUser.id}
          imageUrl={selectedUser.imageUrl || '/default-avatar.png'} // Pass Clerk's imageUrl
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default UserSwiper;