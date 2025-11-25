
import React from 'react';
import styles from './SectionTitle.module.scss';

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ children, className }) => {
  return (
    <h3 className={`${styles.sectionTitle} ${className || ''}`}>
      {children}
    </h3>
  );
};
