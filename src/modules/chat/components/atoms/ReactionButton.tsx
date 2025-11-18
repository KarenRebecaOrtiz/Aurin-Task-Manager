"use client";

import React from "react";
import styles from "../../styles/ReactionButton.module.scss";

interface ReactionButtonProps {
  emoji: string;
  count: number;
  isActive: boolean; // Si el usuario actual reaccionó
  onClick: () => void;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  emoji,
  count,
  isActive,
  onClick,
}) => {
  return (
    <button
      className={`${styles.reactionButton} ${isActive ? styles.active : ""}`}
      onClick={onClick}
      aria-label={`Reacción ${emoji}`}
    >
      <span className={styles.emoji}>{emoji}</span>
      <span className={styles.count}>{count}</span>
    </button>
  );
};
