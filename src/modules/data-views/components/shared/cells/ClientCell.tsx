/**
 * ClientCell Component
 * Displays client information with avatar/image
 * Used in TasksTable and ArchiveTable
 * Clicking on the avatar opens the ClientDialog modal
 */

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Client } from '@/types';
import { ClientDialog } from '@/modules/client-crud';
import styles from './ClientCell.module.scss';

interface ClientCellProps {
  client: Client | null | undefined;
  className?: string;
  onClientUpdate?: (client: Client) => Promise<void>;
}

/**
 * ClientCell Component
 * Renders client avatar or fallback text
 * Opens ClientDialog modal on click
 */
const ClientCell: React.FC<ClientCellProps> = ({ client, className, onClientUpdate }) => {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleAvatarClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    if (client) {
      setIsModalOpen(true);
    }
  }, [client]);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (client) {
      setIsModalOpen(true);
    }
  }, [client]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (client) {
        setIsModalOpen(true);
      }
    }
  }, [client]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleClientUpdated = useCallback(async () => {
    if (onClientUpdate && client) {
      await onClientUpdate(client);
    }
  }, [client, onClientUpdate]);

  if (!client) {
    return <span className={styles.noClient}>Sin cuenta</span>;
  }

  return (
    <>
      <div
        className={`${styles.clientWrapper} ${className || ''}`}
        onClick={handleImageClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        title={`Ver detalles de ${client.name}`}
      >
        <Image
          style={{ borderRadius: '999px' }}
          src={imageError ? '/empty-image.png' : (client.imageUrl?.trim() ? client.imageUrl : '/empty-image.png')}
          alt={client.name || 'Client Image'}
          width={40}
          height={40}
          className={styles.clientImage}
          onError={handleImageError}
          priority={false}
          loading="lazy"
        />
      </div>

      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <ClientDialog
          isOpen={isModalOpen}
          onOpenChange={handleCloseModal}
          clientId={client.id}
          mode="view"
          onClientUpdated={handleClientUpdated}
        />,
        document.body
      )}
    </>
  );
};

export default ClientCell;
