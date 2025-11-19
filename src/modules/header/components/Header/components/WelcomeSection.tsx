import React from 'react';
import { WelcomeSectionProps } from '../../../types';
import { AvatarDropdown } from '../../ui/AvatarDropdown';
import { H2, Muted } from '@/components/ui/Typography';
import styles from '../Header.module.scss';

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  userName,
  subtitle,
  onChangeContainer,
}) => {
  return (
    <div className={styles.lefContainer} style={{ justifyContent: 'start' }}>
      <div className={styles.AvatarMobile}>
        <AvatarDropdown onChangeContainer={onChangeContainer} />
      </div>
      <div className={styles.frame14}>
        <H2 className={styles.welcome}>
          Te damos la bienvenida de nuevo,{' '}
          <span className={styles.userNameShimmer} suppressHydrationWarning>
            {userName}
          </span>
        </H2>
        <Muted className={styles.subtitle}>{subtitle}</Muted>
      </div>
    </div>
  );
};
