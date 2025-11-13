/**
 * ClientCell Component
 * Displays client information with avatar/image
 * Used in TasksTable and ArchiveTable
 * Clicking on the avatar opens the AccountDetailsCard modal
 */

import React, { useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from './ClientCell.module.scss';

// Lazy load the modal to avoid bundle size issues
const AccountDetailsCard = dynamic(
  () => import('@/modules/data-views/clients/components/modals/AccountDetailsCard'),
  { ssr: false }
);

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projects?: string[];
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

interface ClientCellProps {
  client: Client | null | undefined;
  className?: string;
  onClientUpdate?: (client: Client) => Promise<void>;
}

/**
 * ClientCell Component
 * Renders client avatar or fallback text
 * Opens AccountDetailsCard modal on click
 */
const ClientCell: React.FC<ClientCellProps> = ({ client, className, onClientUpdate }) => {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (client) {
      setIsModalOpen(true);
    }
  };

  if (!client) {
    return <span className={styles.noClient}>Sin cuenta</span>;
  }

  return (
    <>
      <div
        className={`${styles.clientWrapper} ${className || ''}`}
        onClick={handleAvatarClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAvatarClick(e as any);
          }
        }}
        title={`Ver detalles de ${client.name}`}
      >
        <Image
          style={{ borderRadius: '999px' }}
          src={imageError ? '/empty-image.png' : (client.imageUrl || '/empty-image.png')}
          alt={client.name || 'Client Image'}
          width={40}
          height={40}
          className={styles.clientImage}
          onError={handleImageError}
        />
      </div>

      {isModalOpen && (
        <AccountDetailsCard
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          client={client}
          mode="view"
          onSave={onClientUpdate}
        />
      )}
    </>
  );
};

export default ClientCell;
