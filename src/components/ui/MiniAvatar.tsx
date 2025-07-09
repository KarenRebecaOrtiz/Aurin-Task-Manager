'use client';

import React from 'react';
import Image from 'next/image';
import styles from './MiniAvatar.module.scss';

interface MiniAvatarProps {
  imageUrl?: string;
  userName: string;
  size?: 'tiny' | 'small' | 'medium';
}

const MiniAvatar: React.FC<MiniAvatarProps> = ({ 
  imageUrl, 
  userName, 
  size = 'small' 
}) => {
  const getDimensions = () => {
    switch (size) {
      case 'tiny':
        return { width: 16, height: 16 };
      case 'medium':
        return { width: 32, height: 32 };
      case 'small':
      default:
        return { width: 24, height: 24 };
    }
  };

  const dimensions = getDimensions();
  const displayName = userName || 'U';

  return (
    <div className={`${styles.miniAvatar} ${styles[size]}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`Avatar de ${displayName}`}
          width={dimensions.width}
          height={dimensions.height}
          className={styles.miniAvatarImage}
          onError={(e) => {
            e.currentTarget.src = '/empty-image.png';
          }}
        />
      ) : (
        <div className={styles.miniAvatarPlaceholder}>
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default MiniAvatar; 