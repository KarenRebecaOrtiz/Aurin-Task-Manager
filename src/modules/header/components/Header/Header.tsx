'use client';

import { useUser } from '@clerk/nextjs';
import { useRef } from 'react';
import { HeaderProps } from '../../types';
import { useSubtitleContent, useHeaderNavigation } from '../../hooks';
import { WelcomeSection, HeaderActions } from './components';
import styles from './Header.module.scss';

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  isArchiveTableOpen = false,
  onChangeContainer,
  isCreateTaskOpen = false,
  isEditTaskOpen = false,
  hasUnsavedChanges = false,
  personalLocations,
}) => {
  const { user, isLoaded } = useUser();
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Computed values
  const userName = isLoaded && user ? user.firstName || 'Usuario' : 'Usuario';
  
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
      <div className={styles.welcomeContainer}>
        <WelcomeSection
          userName={userName}
          subtitle={subtitle}
          onChangeContainer={handleContainerChange}
        />
      </div>

      <HeaderActions
        personalLocations={personalLocations}
        onChangeContainer={handleContainerChange}
      />
    </div>
  );
};

export default Header;
