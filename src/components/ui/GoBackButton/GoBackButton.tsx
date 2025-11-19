
'use client';

import React from 'react';
import Image from 'next/image';
import styles from './GoBackButton.module.scss';

interface GoBackButtonProps {
  onClick: () => void;
}

const GoBackButton: React.FC<GoBackButtonProps> = ({ onClick }) => {
  return (
    <button className={styles.goBackButton} onClick={onClick} title="Volver a Tareas">
      <Image
        src="/arrow-left.svg"
        alt="Go Back"
        width={20}
        height={20}
        className={styles.icon}
      />
    </button>
  );
};

export default GoBackButton;
