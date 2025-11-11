"use client";

import React from "react";
import styles from "../../styles/DatePill.module.scss";

interface DatePillProps {
  date: string;
}

/**
 * DatePill - Separador de fecha en el chat
 * Muestra la fecha de forma visual entre grupos de mensajes
 */
export const DatePill: React.FC<DatePillProps> = ({ date }) => {
  return (
    <div className={styles.container}>
      <div className={styles.pill}>
        <span className={styles.text}>{date}</span>
      </div>
    </div>
  );
};
