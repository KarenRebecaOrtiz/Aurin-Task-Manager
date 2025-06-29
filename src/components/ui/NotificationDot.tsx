import React from 'react';
import styles from './NotificationDot.module.scss';

interface NotificationDotProps {
  count: number;
  className?: string;
}

const NotificationDot: React.FC<NotificationDotProps> = ({
  count,
  className = '',
}) => {
  if (count <= 0) return null;

  return (
    <div className={`${styles.notificationDot} ${styles.red} ${styles.medium} ${className}`}>
      <span className={styles.ping}></span>
      <span className={styles.number}>{count}</span>
    </div>
  );
};

export default NotificationDot; 