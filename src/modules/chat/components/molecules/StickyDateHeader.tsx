"use client";

import React from "react";
import { getRelativeDateLabel } from "../../utils";
import styles from "../../styles/StickyDateHeader.module.scss";

interface StickyDateHeaderProps {
  date: Date;
}

/**
 * StickyDateHeader
 *
 * Header de fecha que se queda pegado en la parte superior
 * mientras se hace scroll por los mensajes de ese día
 */
export const StickyDateHeader: React.FC<StickyDateHeaderProps> = ({ date }) => {
  return (
    <div className={styles.stickyHeader}>
      <span className={styles.dateLabel}>{getRelativeDateLabel(date)}</span>
    </div>
  );
};
