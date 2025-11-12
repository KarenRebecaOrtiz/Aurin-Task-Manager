'use client';

import Image from 'next/image';
import styles from './ChangeViewButton.module.scss';

interface ChangeViewButtonProps {
  icon: string;
  label: string;
  tooltip: string;
  onClick: () => void;
  hideOnMobile?: boolean;
}

/**
 * ChangeViewButton - Botón para cambiar entre vistas (Kanban/Table/Archive)
 * Reutilizable con tooltip
 */
export const ChangeViewButton: React.FC<ChangeViewButtonProps> = ({
  icon,
  label,
  tooltip,
  onClick,
  hideOnMobile = false,
}) => {
  return (
    <div className={`${styles.buttonWithTooltip} ${hideOnMobile ? styles.hideOnMobile : ''}`}>
      <button
        className={styles.viewButton}
        onClick={onClick}
        aria-label={label}
        title={tooltip}
      >
        <Image
          src={icon}
          alt={label}
          width={16}
          height={16}
          draggable={false}
        />
      </button>
      <span className={styles.tooltip}>{tooltip}</span>
    </div>
  );
};

export default ChangeViewButton;
