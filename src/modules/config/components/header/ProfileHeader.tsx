'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { TextShimmer } from '@/modules/header';
import { useAuth } from '@/contexts/AuthContext';
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
  userId,
  isOwnProfile,
  onSuccess,
  onError,
}) => {
  const { user: currentUser } = useUser();
  const { isAdmin } = useAuth();
  const { formData } = useProfileFormStore();
  const { 
    handleProfilePhotoChange, 
    handleCoverPhotoChange,
    profilePhotoInputRef,
    coverPhotoInputRef
  } = useImageUpload({ onSuccess, onError });

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
            onClick={() => coverPhotoInputRef.current?.click()}
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
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/empty-image.png';
              }}
            />
            {isOwnProfile && (
              <button
                className={styles.editProfilePhotoButton}
                onClick={() => profilePhotoInputRef.current?.click()}
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
              <TextShimmer as="span" className={styles.mainNameText}>
                {formData.fullName || currentUser.fullName || 'Usuario'}
              </TextShimmer>
              {isAdmin && (
                <motion.div 
                  className={styles.adminBadge}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.5
                  }}
                  whileHover={{ 
                    scale: 1.15, 
                    rotate: 5,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={styles.adminBadgeInner}>
                    <Image
                      src="/verified.svg"
                      alt="Admin Verified"
                      width={16}
                      height={16}
                      className={styles.adminBadgeIcon}
                    />
                  </div>
                </motion.div>
              )}
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
