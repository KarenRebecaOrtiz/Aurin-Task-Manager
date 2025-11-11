import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ADMIN_BADGE_ANIMATION } from '../../../constants';
import styles from '../Header.module.scss';

export const AdminBadge: React.FC = () => {
  return (
    <motion.div 
      className={styles.adminBadge}
      initial={ADMIN_BADGE_ANIMATION.initial}
      animate={ADMIN_BADGE_ANIMATION.animate}
      transition={ADMIN_BADGE_ANIMATION.transition}
      whileHover={ADMIN_BADGE_ANIMATION.whileHover}
      whileTap={ADMIN_BADGE_ANIMATION.whileTap}
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
  );
};
