'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './UserAvatar.module.scss';

interface UserAvatarProps {
  userId: string;
  imageUrl?: string;
  userName?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showStatus?: boolean;
}

const statusColors = {
  'Disponible': '#178d00',
  'Ocupado': '#d32f2f',
  'Por terminar': '#f57c00',
  'Fuera': '#616161',
};

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  userId, 
  imageUrl, 
  userName, 
  size = 'medium',
  showStatus = true 
}) => {
  const [status, setStatus] = useState('Disponible');
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);

  // Listen to Firestore user document changes
  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status || 'Disponible');
        // Usar profilePhoto que es donde se guarda la imagen de Clerk
        if (data.profilePhoto) {
          setUserImageUrl(data.profilePhoto);
        }
      }
    }, (error) => {
      console.error('Error listening to user status:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Use provided imageUrl as priority, then Firestore image as fallback
  const finalImageUrl = imageUrl || userImageUrl;
  const statusColor = statusColors[status as keyof typeof statusColors] || statusColors['Disponible'];
  const displayName = userName || 'U';

  // Get dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 32 };
      case 'large':
        return { width: 55, height: 55 };
      case 'xlarge':
        return { width: 96, height: 96 };
      case 'medium':
      default:
        return { width: 46, height: 46 }; // Original size used in sidebars
    }
  };

  const dimensions = getDimensions();

  return (
    <div className={`${styles.avatarContainer} ${styles[size]}`}>
      {finalImageUrl ? (
        <Image
          src={finalImageUrl}
          alt={displayName}
          width={dimensions.width}
          height={dimensions.height}
          className={styles.avatarImage}
          onError={(e) => {
            // Si la imagen falla, usar una imagen de Clerk por defecto
            e.currentTarget.src = `https://img.clerk.com/${userId}`;
          }}
        />
      ) : (
        <div className={styles.avatarPlaceholder}>
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      {showStatus && (
        <div
          className={styles.statusDot}
          style={{ backgroundColor: statusColor }}
        />
      )}
    </div>
  );
};

export default UserAvatar; 