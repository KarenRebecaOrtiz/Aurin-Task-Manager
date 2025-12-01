'use client';

import { useUser } from '@clerk/nextjs';
import { useRef } from 'react';
import { HeaderProps } from '../../types';
import { useSubtitleContent, useHeaderNavigation, useFirestoreUser } from '../../hooks';
import { WelcomeSection, HeaderActions, MobilePillHeader } from './components';
import styles from './Header.module.scss';

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  isArchiveTableOpen = false,
  onChangeContainer,
  isCreateTaskOpen = false,
  isEditTaskOpen = false,
  hasUnsavedChanges = false,
}) => {
  const { user, isLoaded } = useUser();
  const { firestoreUser } = useFirestoreUser();
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Computed values
  const userName = firestoreUser?.fullName || (isLoaded && user ? user.firstName || 'Usuario' : 'Usuario');
  
  // Custom hooks
  const subtitle = useSubtitleContent(selectedContainer, isArchiveTableOpen);
  const { handleContainerChange } = useHeaderNavigation(
    onChangeContainer,
    isCreateTaskOpen,
    isEditTaskOpen,
    hasUnsavedChanges
  );

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      {/* Mobile Pill Header - solo visible en < 768px */}
      <MobilePillHeader />

      {/* Desktop/Tablet Content - oculto en < 768px */}
      <div className={styles.welcomeContainer}>
        <WelcomeSection
          userName={userName}
          subtitle={subtitle}
          onChangeContainer={handleContainerChange}
        />
      </div>

      <HeaderActions
        onChangeContainer={handleContainerChange}
      />
    </div>
  );
};

export default Header;
