/**
 * ClientCell Component
 * Displays client information with avatar/image
 * Used in TasksTable and ArchiveTable
 */

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './ClientCell.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

interface ClientCellProps {
  client: Client | null | undefined;
  className?: string;
}

/**
 * ClientCell Component
 * Renders client avatar or fallback text
 */
const ClientCell: React.FC<ClientCellProps> = ({ client, className }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  if (!client) {
    return <span className={styles.noClient}>Sin cuenta</span>;
  }

  return (
    <div className={`${styles.clientWrapper} ${className || ''}`}>
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
  );
};

export default ClientCell;
