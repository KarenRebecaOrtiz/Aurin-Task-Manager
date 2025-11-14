'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ClientAvatar } from '@/modules/shared/components/atoms/Avatar/ClientAvatar';
import styles from './TableCell.module.scss';

// Lazy load the modal to avoid bundle size issues
const AccountDetailsCard = dynamic(
  () => import('@/modules/data-views/clients/components/modals/AccountDetailsCard'),
  { ssr: false }
);

export interface Client {
  id?: string;
  name: string;
  imageUrl: string;
  projects: string[];
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  website?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

export interface ClientCellProps {
  client?: Client;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClientUpdate?: (client: Client) => Promise<void>;
}

export const ClientCell: React.FC<ClientCellProps> = ({
  client,
  showName = false,
  size = 'md',
  className = '',
  onClientUpdate,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAvatarClick = () => {
    if (client) {
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

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

      {isModalOpen && (
        <AccountDetailsCard
          isOpen={isModalOpen}
          onClose={handleModalClose}
          client={clientWithDefaults}
          mode="view"
          onSave={onClientUpdate}
        />
      )}
    </>
  );
};
