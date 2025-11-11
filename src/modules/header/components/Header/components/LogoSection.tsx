import React from 'react';
import Image from 'next/image';
import { LogoSectionProps } from '../../../types';
import styles from '../Header.module.scss';

export const LogoSection: React.FC<LogoSectionProps> = ({
  isDarkMode,
  onLogoClick,
  onLogoMouseEnter,
  onLogoMouseLeave,
}) => {
  return (
    <div 
      className={styles.logoContainer}
      onClick={onLogoClick}
      onMouseEnter={onLogoMouseEnter}
      onMouseLeave={onLogoMouseLeave}
    >
      <Image
        src={isDarkMode ? '/logoDark.svg' : '/logoLight.svg'}
        alt="Logo"
        width={180}
        height={68}
        priority
        style={{
          transition: 'all 0.3s ease',
          filter: isDarkMode 
            ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
            : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))'
        }}
      />
    </div>
  );
};
