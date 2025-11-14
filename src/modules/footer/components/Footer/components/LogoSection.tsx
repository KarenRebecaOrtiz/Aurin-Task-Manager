import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Footer.module.scss';

export const LogoSection: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={styles.logoContainer}>
      <Image
        src={isDarkMode ? '/logoDark.svg' : '/logoLight.svg'}
        alt="Logo"
        width={90}
        height={34}
        priority
        style={{
          transition: 'all 0.3s ease',
          opacity: 0.7,
          filter: isDarkMode 
            ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' 
            : 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.2))'
        }}
      />
    </div>
  );
};
