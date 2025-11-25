'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { useImageUpload } from '../../hooks';
import { useProfileFormStore } from '../../stores';
import styles from './ProfileHeader.module.scss';

interface ProfileHeaderProps {
  userId: string;
  isOwnProfile: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string, error?: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isOwnProfile,
  onSuccess,
  onError,
}) => {
  const { user: currentUser } = useUser();
  const { formData } = useProfileFormStore();
  const { 
    handleProfilePhotoChange, 
    handleCoverPhotoChange,
    profilePhotoInputRef,
    coverPhotoInputRef
  } = useImageUpload({ onSuccess, onError });

  const handleCoverPhotoClick = React.useCallback(() => {
    coverPhotoInputRef.current?.click();
  }, [coverPhotoInputRef]);

  const handleProfilePhotoClick = React.useCallback(() => {
    profilePhotoInputRef.current?.click();
  }, [profilePhotoInputRef]);

  const handleImageError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/empty-image.png';
  }, []);

  if (!formData || !currentUser) return null;

  return (
    <>
      {/* Cover Photo */}
      <div 
        className={styles.coverPhoto} 
        style={{ backgroundImage: `url(${formData.coverPhoto || '/empty-cover.png'})` }}
      >
        {isOwnProfile && (
          <button
            className={styles.editCoverButton}
            onClick={handleCoverPhotoClick}
            aria-label="Editar foto de portada"
          >
            <Image
              src="/pencil.svg"
              alt="Editar"
              width={16}
              height={16}
            />
          </button>
        )}
        <input
          type="file"
          accept="image/*"
          ref={coverPhotoInputRef}
          style={{ display: 'none' }}
          onChange={handleCoverPhotoChange}
        />
      </div>

      {/* Profile Info */}
      <div className={styles.profileInfo}>
        <div className={styles.profileContent}>
          {/* Profile Photo */}
          <div className={styles.profilePhotoContainer}>
            <Image
              src={formData.profilePhoto || currentUser.imageUrl || '/empty-image.png'}
              alt="Foto de perfil"
              width={94}
              height={94}
              className={styles.profilePhoto}
              onError={handleImageError}
            />
            {isOwnProfile && (
              <button
                className={styles.editProfilePhotoButton}
                onClick={handleProfilePhotoClick}
                aria-label="Editar foto de perfil"
              >
                <Image
                  src="/pencil.svg"
                  alt="Editar"
                  width={16}
                  height={16}
                />
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              ref={profilePhotoInputRef}
              style={{ display: 'none' }}
              onChange={handleProfilePhotoChange}
            />
          </div>

          {/* Name and Email */}
          <div className={styles.userInfo}>
            <motion.div
              className={styles.mainName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
                delay: 0.2
              }}
            >
              {currentUser.username || 'Usuario'}
            </motion.div>
            <div className={styles.userEmail}>
              {currentUser.primaryEmailAddress?.emailAddress}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
