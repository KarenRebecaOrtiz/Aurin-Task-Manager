import React from 'react';
import { Settings, Send } from 'lucide-react';
import styles from './ActionButton.module.scss';

interface ActionButtonProps {
  variant: 'config' | 'message';
  onClick: () => void;
  ariaLabel: string;
  title: string;
}

const ICON_MAP = {
  config: Settings,
  message: Send,
} as const;

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  onClick,
  ariaLabel,
  title,
}) => {
  const Icon = ICON_MAP[variant];

  return (
    <button
      className={styles.actionButton}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      <Icon size={16} />
    </button>
  );
};
