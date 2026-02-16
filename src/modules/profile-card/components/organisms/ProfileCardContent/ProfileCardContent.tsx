import React from 'react';
import { motion } from 'framer-motion';
import { Muted } from '@/components/ui/Typography';
import { ProfileHeader } from '../../molecules/ProfileHeader/ProfileHeader';
import { ContactInfo } from '../../molecules/ContactInfo/ContactInfo';
import { StackSection } from '../../molecules/StackSection/StackSection';
import { SocialLinks } from '../../molecules/SocialLinks/SocialLinks';
import type { UserProfile } from '../../../types';
import type { SocialLink } from '@/modules/config/components/social-links/types';
import { contentVariants, itemVariants } from '@/modules/dialogs';
import styles from './ProfileCardContent.module.scss';

interface ProfileCardContentProps {
  profile: UserProfile;
  userId: string;
  currentUserId?: string;
  onConfigClick?: () => void;
  onMessageClick: () => void;
  socialLinks: SocialLink[];
}

export const ProfileCardContent: React.FC<ProfileCardContentProps> = ({
  profile,
  userId,
  currentUserId,
  onConfigClick,
  onMessageClick,
  socialLinks,
}) => {
  return (
    <div className={styles.profileCard}>
      <ProfileHeader
        profile={profile}
        userId={userId}
        currentUserId={currentUserId}
        onConfigClick={onConfigClick}
        onMessageClick={onMessageClick}
      />

      <motion.div
        className={styles.contentSection}
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div variants={itemVariants}>
          <Muted className={styles.bio}>
            {profile.description || 'Sin descripción disponible'}
          </Muted>
        </motion.div>

        <ContactInfo
          phone={profile.phone}
          city={profile.city}
          birthDate={profile.birthDate}
          gender={profile.gender}
        />

        <StackSection stack={profile.stack || []} />

        {socialLinks.length > 0 && (
          <>
            <motion.div className={styles.divider} variants={itemVariants} />
            <SocialLinks socialLinks={socialLinks} />
          </>
        )}
      </motion.div>
    </div>
  );
};
