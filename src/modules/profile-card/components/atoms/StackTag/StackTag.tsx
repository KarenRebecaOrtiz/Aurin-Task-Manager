// TODO: Componente simple para renderizar tag de tecnología
// TODO: Props: tech (string)
// TODO: Aplicar estilos glassmorphism desde StackTag.module.scss
// TODO: Soporte para tema dark

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
