'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { SocialIcon } from './SocialIcon';
import { NETWORK_CONFIG } from './network-config';
import type { SocialLink } from './types';
import styles from './AddedLinkItem.module.scss';

interface AddedLinkItemProps {
  link: SocialLink;
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
  showActions?: boolean;
}

export function AddedLinkItem({
  link,
  onEdit,
  onRemove,
  disabled,
  showActions = true,
}: AddedLinkItemProps) {
  const config = NETWORK_CONFIG[link.networkId];
  if (!config) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={styles.item}
    >
      <div className={styles.iconWrapper}>
        <SocialIcon networkId={link.networkId} size={18} />
      </div>

      <div className={styles.content}>
        <p className={styles.networkLabel}>{config.label}</p>
        <p className={styles.username}>
          {config.prefix}
          {link.username}
        </p>
      </div>

      <div className={styles.actions}>
        <a
          href={link.fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.actionButton} ${styles.link}`}
          aria-label={`Visit ${config.label} profile`}
        >
          <ExternalLink size={14} />
        </a>
        {showActions && onEdit && onRemove && (
          <>
            <button
              type="button"
              onClick={() => onEdit(link.id)}
              className={styles.actionButton}
              aria-label="Edit link"
              disabled={disabled}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(link.id)}
              className={`${styles.actionButton} ${styles.deleteButton}`}
              aria-label="Remove link"
              disabled={disabled}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
