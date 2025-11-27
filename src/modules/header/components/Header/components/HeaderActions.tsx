import React from 'react';
import { HeaderActionsProps } from '../../../types';
import { GeoClockWithTimer } from '../../../components/ui/GeoClock';
import { ToDoDynamic } from '../../ui/ToDoDynamic';
import AvailabilityToggle from '../../../components/ui/AvailabilityToggle';
import { AvatarDropdown } from '../../ui/AvatarDropdown';
import styles from '../Header.module.scss';

export const HeaderActions: React.FC<HeaderActionsProps> = () => {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.superiorHeader}>
        <GeoClockWithTimer />

        <div className={styles.todoContainer}>
          <ToDoDynamic />
        </div>

        <div className={styles.availabilityContainer}>
          <AvailabilityToggle />
        </div>

        <div className={styles.AvatarDesktop}>
          <AvatarDropdown />
        </div>
      </div>
    </div>
  );
};
