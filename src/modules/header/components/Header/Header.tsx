'use client';

import { useUser } from '@clerk/nextjs';
import { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { HeaderProps } from '../../types';
import { useSubtitleContent, useHeaderNavigation, useLogoInteractions } from '../../hooks';
import { LogoSection, WelcomeSection, HeaderActions } from './components';
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
  const { isAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  
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
  const {
    handleLogoClick,
    handleLogoMouseEnter,
    handleLogoMouseLeave,
  } = useLogoInteractions(isDarkMode, handleContainerChange);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.logoAndWelcomeContainer}>
        <LogoSection
          isDarkMode={isDarkMode}
          onLogoClick={handleLogoClick}
          onLogoMouseEnter={handleLogoMouseEnter}
          onLogoMouseLeave={handleLogoMouseLeave}
        />
        <WelcomeSection
          userName={userName}
          isAdmin={isAdmin}
          subtitle={subtitle}
          onChangeContainer={handleContainerChange}
        />
      </div>

      <HeaderActions
        personalLocations={personalLocations}
        isAdmin={isAdmin}
        onChangeContainer={handleContainerChange}
      />
    </div>
  );
};

export default Header;
