// TODO: Renderizar lista de enlaces sociales
// TODO: Props: socialLinks (SocialLink[])
// TODO: Usar AddedLinkItem del módulo config
// TODO: Solo renderizar si hay links
// TODO: Aplicar motion variants para animación

import React from 'react';
import { motion } from 'framer-motion';
import { AddedLinkItem } from '@/modules/config/components/social-links/AddedLinkItem';
import type { SocialLink } from '@/modules/config/components/social-links/types';
import { itemVariants } from '@/modules/dialog';
import styles from './SocialLinks.module.scss';

interface SocialLinksProps {
  socialLinks: SocialLink[];
}

export const SocialLinks: React.FC<SocialLinksProps> = ({ socialLinks }) => {
  // TODO: No renderizar si no hay links
  if (!socialLinks || socialLinks.length === 0) {
    return null;
  }

  return (
    <motion.div className={styles.socialLinks} variants={itemVariants}>
      {/* TODO: Mapear socialLinks usando AddedLinkItem con showActions=false */}
      {socialLinks.map(link => (
        <AddedLinkItem key={link.id} link={link} showActions={false} />
      ))}
    </motion.div>
  );
};
