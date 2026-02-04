/**
 * ClientCell Component
 * Displays client information with avatar/image or gradient
 * Used in TasksTable and ArchiveTable
 * Clicking on the avatar opens the ClientDialog modal
 *
 * Priority: Image > Gradient > Initials
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Client } from '@/types';
import { ClientDialog } from '@/modules/client-crud';
import { GradientAvatar } from '@/components/ui/gradient-avatar';
import { useAuth } from '@/contexts/AuthContext';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAdmin } = useAuth();

  const handleAvatarClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo administradores pueden abrir el diálogo de edición de cuenta
    if (client && isAdmin) {
      setIsModalOpen(true);
    }
  }, [client, isAdmin]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      // Solo administradores pueden abrir el diálogo de edición de cuenta
      if (client && isAdmin) {
        setIsModalOpen(true);
      }
    }
  }, [client, isAdmin]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleClientUpdated = useCallback(async () => {
    if (onClientUpdate && client) {
      await onClientUpdate(client);
    }
  }, [client, onClientUpdate]);

  if (!client) {
    return <span className={styles.noClient}>—</span>;
  }

  return (
    <>
      <div
        className={`${styles.clientWrapper} ${className || ''} ${isAdmin ? styles.clickable : ''}`}
        onClick={handleAvatarClick}
        role={isAdmin ? "button" : undefined}
        tabIndex={isAdmin ? 0 : undefined}
        onKeyDown={isAdmin ? handleKeyDown : undefined}
        title={isAdmin ? `Editar cuenta de ${client.name}` : client.name}
      >
        <GradientAvatar
          imageUrl={client.imageUrl}
          gradientId={client.gradientId}
          gradientColors={client.gradientColors}
          name={client.name || 'Client'}
          size="md"
          className={styles.clientImage}
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
