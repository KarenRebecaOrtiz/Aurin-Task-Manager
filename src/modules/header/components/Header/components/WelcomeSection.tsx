import React from 'react';
import { WelcomeSectionProps } from '../../../types';
import { TextShimmer } from '../../../components/ui/TextShimmer';
import AvatarDropdown from '../../../components/ui/AvatarDropdown';
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
        <div className={styles.title}>
          <div className={styles.welcome}>
            <span className={styles.welcomeText} suppressHydrationWarning>
              Te damos la bienvenida de nuevo,{' '}
              <TextShimmer as="span" className={styles.userNameShimmer} suppressHydrationWarning>
                {userName}
              </TextShimmer>
            </span>
          </div>
        </div>
        <div className={styles.text}>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
};
