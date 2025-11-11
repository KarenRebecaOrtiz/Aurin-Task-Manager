import React from 'react';
import { HeaderActionsProps } from '../../../types';
import GeoClock from '../../../components/ui/GeoClock';
import ToDoDynamic from '../../../components/ui/ToDoDynamic';
import AvailabilityToggle from '../../../components/ui/AvailabilityToggle';
import AvatarDropdown from '../../../components/ui/AvatarDropdown';
import AdviceInput from '../../../components/ui/AdviceInput';
import styles from '../Header.module.scss';

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  personalLocations,
  isAdmin,
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
      <div className={styles.adviceContainer}>
        <AdviceInput isAdmin={isAdmin} />
      </div>
    </div>
  );
};
