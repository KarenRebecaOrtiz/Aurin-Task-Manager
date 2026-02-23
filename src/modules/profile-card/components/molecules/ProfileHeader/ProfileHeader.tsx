import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useUser } from '@/lib/demo/clerk-mock';
import { UserAvatar } from '@/modules/shared/components/atoms/Avatar/UserAvatar';
import Badge from '@/components/Badge';
import { ActionButton } from '../../atoms/ActionButton/ActionButton';
import { transitions } from '@/modules/dialogs';
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
  const shouldReduceMotion = useReducedMotion();
  const isOwnProfile = userId === currentUserId;

  const avatarUrl = profile.profilePhoto ||
    (isOwnProfile && currentUser?.imageUrl ? currentUser.imageUrl : '');

  const coverSrc = profile.coverPhoto || '/empty-cover.png';

  return (
    <>
      <motion.div
        className={styles.coverPhotoSection}
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transitions.fast}
      >
        <div
          className={styles.coverPhoto}
          role="img"
          aria-label={`Foto de portada de ${profile.fullName || 'usuario'}`}
          style={{ backgroundImage: `url(${coverSrc})` }}
        />
      </motion.div>

      <motion.div
        className={styles.profilePhotoOverlay}
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...transitions.fast, delay: shouldReduceMotion ? 0 : 0.03 }}
      >
        <UserAvatar
          userId={userId}
          imageUrl={avatarUrl}
          userName={profile.fullName || 'Usuario'}
          size="2xl"
          showStatus={false}
        />
      </motion.div>

      <motion.div
        className={styles.headerSection}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transitions.fast, delay: shouldReduceMotion ? 0 : 0.06 }}
      >
        <div className={styles.nameAndBadgeContainer}>
          <h2 className={styles.name}>{profile.fullName || 'Sin nombre'}</h2>

          <div className={styles.actionButtons}>
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

        {profile.role && (
          <div className={styles.badgeContainer}>
            <Badge role={profile.role} />
          </div>
        )}
      </motion.div>
    </>
  );
};
