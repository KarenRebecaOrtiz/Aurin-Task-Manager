
import React from 'react';
import styles from './StackTag.module.scss';

interface StackTagProps {
  tech: string;
}

export const StackTag: React.FC<StackTagProps> = ({ tech }) => {
  return (
    <span className={styles.stackTag}>
      {tech}
    </span>
  );
};
