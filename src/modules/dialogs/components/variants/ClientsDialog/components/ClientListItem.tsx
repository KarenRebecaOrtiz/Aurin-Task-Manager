/**
 * ClientListItem Component
 *
 * Renders a single client item in the list with avatar, info, and action button.
 * Memoized for performance optimization.
 */

'use client';

import { memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Building2, Mail, Globe, Briefcase, MoreHorizontal } from 'lucide-react';
import { ClientListItemProps } from '../types';
import styles from '../../UsersDialog/UsersDialog.module.scss';
import clientStyles from '../ClientsDialog.module.scss';

export const ClientListItem = memo(function ClientListItem({
  client,
  isDeleting,
  onMenuOpen,
  buttonRef,
  getClientInitials,
}: ClientListItemProps) {
  // Render avatar based on client data
  const renderAvatar = () => {
    if (client.imageUrl && !client.imageUrl.includes('empty-image')) {
      return (
        <Image
          src={client.imageUrl}
          alt={client.name}
          width={40}
          height={40}
          className={styles.avatarImage}
        />
      );
    }

    // Gradient avatar
    if (client.gradientColors && client.gradientColors.length >= 3) {
      return (
        <div
          className={styles.avatarPlaceholder}
          style={{
            background: `linear-gradient(135deg, ${client.gradientColors[0]} 0%, ${client.gradientColors[1]} 50%, ${client.gradientColors[2]} 100%)`,
          }}
        />
      );
    }

    // Initials fallback
    return (
      <div className={styles.avatarPlaceholder}>
        {getClientInitials(client.name)}
      </div>
    );
  };

  // Render secondary info (email, website, or project count)
  const renderSecondaryInfo = () => {
    if (client.email) {
      return (
        <>
          <Mail size={12} />
          {client.email}
        </>
      );
    }

    if (client.website) {
      return (
        <>
          <Globe size={12} />
          {client.website}
        </>
      );
    }

    const projectCount = client.projects?.length || 0;
    return (
      <>
        <Building2 size={12} />
        {projectCount} proyecto{projectCount !== 1 ? 's' : ''}
      </>
    );
  };

  return (
    <motion.div
      className={styles.userItem}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDeleting ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Avatar */}
      <div className={styles.userAvatar}>{renderAvatar()}</div>

      {/* Info */}
      <div className={styles.userInfo}>
        <div className={styles.userName}>
          {client.name}
          {client.industry && (
            <span className={styles.adminBadge}>
              <Briefcase size={10} />
              {client.industry}
            </span>
          )}
        </div>
        <div className={styles.userEmail}>{renderSecondaryInfo()}</div>
      </div>

      {/* Action Button */}
      <button
        ref={buttonRef}
        className={clientStyles.actionButton}
        onClick={(e) => {
          e.stopPropagation();
          onMenuOpen(client, e.currentTarget);
        }}
        disabled={isDeleting}
        aria-label={`Acciones para ${client.name}`}
      >
        {isDeleting ? (
          <span className={styles.spinner} />
        ) : (
          <MoreHorizontal size={18} />
        )}
      </button>
    </motion.div>
  );
});
