import React from 'react';
import { HeaderActionsProps } from '../../../types';
import GeoClock from '../../../components/ui/GeoClock';
import { ToDoDynamic } from '../../ui/ToDoDynamic';
import AvailabilityToggle from '../../../components/ui/AvailabilityToggle';
import AvatarDropdown from '../../../components/ui/AvatarDropdown';
import styles from '../Header.module.scss';

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  personalLocations,
  onChangeContainer,
}) => {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.superiorHeader}>
        <GeoClock personalLocations={personalLocations} />

        <div className={styles.todoContainer}>
          <ToDoDynamic />
        </div>

        <div className={styles.availabilityContainer}>
          <AvailabilityToggle />
        </div>

        <div className={styles.AvatarDesktop}>
          <AvatarDropdown onChangeContainer={onChangeContainer} />
        </div>
      </div>
    </div>
  );
};
