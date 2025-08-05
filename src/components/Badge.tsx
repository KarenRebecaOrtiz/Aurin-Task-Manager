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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 15" className={styles.badgeSvg}>
          <rect width="60" height="15" rx="5" fill="#d3df48" />
          <text 
            fontFamily="Helvetica-Bold, Helvetica" 
            fontSize="6" 
            fontWeight="bold" 
            fill="#333" 
            x="30" 
            y="10" 
            textAnchor="middle"
          >
            {role}
          </text>
        </svg>
      </div>
    </Wrapper>
  );
};

export default Badge; 