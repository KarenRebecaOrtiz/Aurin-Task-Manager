'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { Cog } from '@/components/animate-ui/icons';
import { useFirestoreUser } from '../../../hooks';
import { SettingsDrawer } from '@/modules/header/components/ui/AvatarDropdown';
import styles from '../Header.module.scss';

export const MobilePillHeader: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { firestoreUser } = useFirestoreUser();
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);

  const userName = firestoreUser?.fullName || (isLoaded && user ? user.firstName || 'Usuario' : 'Usuario');
  const userImage = user?.imageUrl || '/default-avatar.png';

  const handleSettingsClick = () => {
    setIsSettingsDrawerOpen(true);
  };

  const handleCloseSettingsDrawer = () => {
    setIsSettingsDrawerOpen(false);
  };

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

      {/* Botón configuración - redondo */}
      <button
        className={styles.mobileCreateTaskButton}
        onClick={handleSettingsClick}
        aria-label="Configuración"
        title="Configuración"
      >
        <Cog className={styles.mobileCreateTaskIcon} animateOnHover />
      </button>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={handleCloseSettingsDrawer}
        userId={user?.id}
      />
    </div>
  );
};

export default MobilePillHeader;
