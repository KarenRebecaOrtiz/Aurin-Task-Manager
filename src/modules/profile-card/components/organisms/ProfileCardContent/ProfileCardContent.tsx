// TODO: Contenido completo del profile card
// TODO: Props: profile, userId, currentUserId, onConfigClick, onMessageClick, socialLinks
// TODO: Componer ProfileHeader, bio (Muted), ContactInfo, StackSection, divider, SocialLinks
// TODO: Incluir animaciones con framer-motion variants (contentVariants, itemVariants)
// TODO: Aplicar estilos desde ProfileCardContent.module.scss

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
      {/* TODO: ProfileHeader con cover photo, avatar, nombre, badge, botones */}
      <ProfileHeader
        profile={profile}
        userId={userId}
        currentUserId={currentUserId}
        onConfigClick={onConfigClick}
        onMessageClick={onMessageClick}
      />

      {/* TODO: Content section con bio, contacto, stack, social */}
      <motion.div
        className={styles.contentSection}
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* TODO: Bio section */}
        <motion.div variants={itemVariants}>
          <Muted className={styles.bio}>
            {profile.description || 'Sin descripción disponible'}
          </Muted>
        </motion.div>

        {/* TODO: Contact Info */}
        <ContactInfo
          phone={profile.phone}
          city={profile.city}
          birthDate={profile.birthDate}
          gender={profile.gender}
        />

        {/* TODO: Stack Section */}
        <StackSection stack={profile.stack || []} />

        {/* TODO: Divider */}
        <motion.div className={styles.divider} variants={itemVariants} />

        {/* TODO: Social Links */}
        <SocialLinks socialLinks={socialLinks} />
      </motion.div>
    </div>
  );
};
