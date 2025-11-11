'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import styles from './TableCell.module.scss';

export interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

export interface ClientCellProps {
  client?: Client;
  showName?: boolean;
  size?: number;
  className?: string;
}

export const ClientCell: React.FC<ClientCellProps> = ({
  client,
  showName = false,
  size = 40,
  className = '',
}) => {
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/empty-image.png';
  }, []);

  if (!client) {
    return <span className={styles.noClient}>Sin cuenta</span>;
  }

  return (
    <div className={`${styles.clientCell} ${className}`}>
      <Image
        src={client.imageUrl || '/empty-image.png'}
        alt={client.name || 'Client Image'}
        width={size}
        height={size}
        className={styles.clientImage}
        onError={handleImageError}
      />
      {showName && <span className={styles.clientName}>{client.name}</span>}
    </div>
  );
};
