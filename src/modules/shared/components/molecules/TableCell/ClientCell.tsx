'use client';

import React from 'react';
import { ClientAvatar } from '@/modules/shared/components/atoms/Avatar/ClientAvatar';
import styles from './TableCell.module.scss';

export interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

export interface ClientCellProps {
  client?: Client;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isVerified?: boolean;
}

export const ClientCell: React.FC<ClientCellProps> = ({
  client,
  showName = false,
  size = 'md',
  className = '',
  isVerified = false,
}) => {
  if (!client) {
    return <span className={styles.noClient}>Sin cuenta</span>;
  }

  return (
    <div className={`${styles.clientCell} ${className}`}>
      <ClientAvatar
        src={client.imageUrl}
        alt={client.name}
        fallback={client.name.substring(0, 2).toUpperCase()}
        size={size}
        isVerified={isVerified}
      />
      {showName && <span className={styles.clientName}>{client.name}</span>}
    </div>
  );
};
