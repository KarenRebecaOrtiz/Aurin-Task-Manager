'use client';

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ClientAvatar } from '@/modules/shared/components/atoms/Avatar/ClientAvatar';
import { Client } from '@/types';
import styles from './TableCell.module.scss';
import { ClientDialog } from '@/modules/client-crud';

export interface ClientCellProps {
  client?: Client;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClientUpdate?: () => void;
}

export const ClientCell: React.FC<ClientCellProps> = ({
  client,
  showName = false,
  size = 'md',
  className = '',
  onClientUpdate,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAvatarClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (client) {
      setIsModalOpen(true);
    }
  }, [client]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleClientUpdated = useCallback(() => {
    if (onClientUpdate) {
      onClientUpdate();
    }
  }, [onClientUpdate]);

  if (!client) {
    return <span className={styles.noClient}>Sin cuenta</span>;
  }

  // Ensure client has required projects field
  const clientWithDefaults = {
    ...client,
    projects: client.projects || []
  };

  return (
    <>
      <div className={`${styles.clientCell} ${className}`}>
        <ClientAvatar
          src={client.imageUrl}
          alt={client.name}
          fallback={client.name.substring(0, 2).toUpperCase()}
          size={size}
          onClick={handleAvatarClick}
          client={clientWithDefaults}
        />
        {showName && <span className={styles.clientName}>{client.name}</span>}
      </div>

      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <ClientDialog
          isOpen={isModalOpen}
          onOpenChange={handleModalClose}
          clientId={client.id}
          mode="view"
          onClientUpdated={handleClientUpdated}
        />,
        document.body
      )}
    </>
  );
};
