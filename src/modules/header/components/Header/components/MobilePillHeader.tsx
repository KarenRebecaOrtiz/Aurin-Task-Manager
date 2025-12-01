'use client';

import React from 'react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { CirclePlus } from 'lucide-react';
import { useFirestoreUser } from '../../../hooks';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import styles from '../Header.module.scss';

export const MobilePillHeader: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { firestoreUser } = useFirestoreUser();
  const openCreateTask = useTasksPageStore((state) => state.openCreateTask);

  const userName = firestoreUser?.fullName || (isLoaded && user ? user.firstName || 'Usuario' : 'Usuario');
  const userImage = user?.imageUrl || '/default-avatar.png';

  return (
    <div className={styles.mobilePillContainer}>
      {/* Pill con avatar y nombre */}
      <div className={styles.mobilePill}>
        <div className={styles.mobilePillAvatar}>
          <Image
            src={userImage}
            alt="Avatar"
            width={28}
            height={28}
            className={styles.mobilePillAvatarImage}
          />
        </div>
        <span className={styles.mobilePillName}>{userName}</span>
      </div>

      {/* Botón crear tarea - redondo */}
      <button
        className={styles.mobileCreateTaskButton}
        onClick={openCreateTask}
        aria-label="Crear Nueva Tarea"
        title="Crear Nueva Tarea"
      >
        <CirclePlus className={styles.mobileCreateTaskIcon} />
      </button>
    </div>
  );
};

export default MobilePillHeader;
