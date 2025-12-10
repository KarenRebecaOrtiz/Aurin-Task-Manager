
import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { UserAvatar } from '@/modules/shared/components/atoms/Avatar/UserAvatar';
import Badge from '@/components/Badge';
import { ActionButton } from '../../atoms/ActionButton/ActionButton';
import { itemVariants, transitions } from '@/modules/dialogs';
import type { UserProfile } from '../../../types';
import styles from './ProfileHeader.module.scss';

interface ProfileHeaderProps {
  profile: UserProfile;
  userId: string;
  currentUserId?: string;
  onConfigClick?: () => void;
  onMessageClick: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  userId,
  currentUserId,
  onConfigClick,
  onMessageClick,
}) => {
  const { user: currentUser } = useUser();
  const isOwnProfile = userId === currentUserId;

  // For own profile: fallback to Clerk image if no custom photo
  // For other profiles: use their photo or empty
  const avatarUrl = profile.profilePhoto ||
    (isOwnProfile && currentUser?.imageUrl ? currentUser.imageUrl : '');

  return (
    <>
      {/* TODO: Cover Photo Section */}
      <motion.div
        className={styles.coverPhotoSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transitions.fast}
      >
        <div
          className={styles.coverPhoto}
          style={{
            backgroundImage: `url(${profile.coverPhoto || '/empty-cover.png'})`,
          }}
        />
      </motion.div>

      {/* TODO: Profile Photo Overlay */}
      <motion.div
        className={styles.profilePhotoOverlay}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...transitions.fast, delay: 0.03 }}
      >
        <UserAvatar
          userId={userId}
          imageUrl={avatarUrl}
          userName={profile.fullName || 'Usuario'}
          size="2xl"
          showStatus={false}
        />
      </motion.div>

      {/* TODO: Header Section con nombre, badge y botones */}
      <motion.div className={styles.headerSection} variants={itemVariants}>
        <div className={styles.nameAndBadgeContainer}>
          <h2 className={styles.name}>{profile.fullName || 'Sin nombre'}</h2>

          <div className={styles.actionButtons}>
      

            {/* Botón mensaje solo para otros usuarios */}
            {!isOwnProfile && (
              <ActionButton
                variant="message"
                onClick={onMessageClick}
                ariaLabel={`Enviar mensaje a ${profile.fullName || 'usuario'}`}
                title="Enviar mensaje"
              />
            )}
          </div>
        </div>

        {/* TODO: Badge de rol si existe */}
        {profile.role && (
          <div className={styles.badgeContainer}>
            <Badge role={profile.role} />
          </div>
        )}
      </motion.div>
    </>
  );
};
