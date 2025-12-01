'use client';

import React from "react";
import styles from './Badge.module.scss';

interface BadgeProps {
  role: string;
  link?: string;
}

export const Badge = ({ role, link }: BadgeProps) => {
  const Wrapper = link ? 'a' : 'div';
  const wrapperProps = link ? {
    href: link,
    target: "_blank",
    rel: "noopener noreferrer"
  } : {};

  return (
    <Wrapper
      className={styles.badge}
      {...wrapperProps}
    >
      <div className={styles.badgeContainer}>
        <span className={styles.badgeText}>{role}</span>
      </div>
    </Wrapper>
  );
};

export default Badge; 