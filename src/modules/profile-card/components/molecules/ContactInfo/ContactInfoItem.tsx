// TODO: Componente para item individual de contacto
// TODO: Props: label (string), value (string)
// TODO: Usar componente Small de Typography
// TODO: Aplicar estilos desde ContactInfo.module.scss

import React from 'react';
import { Small } from '@/components/ui/Typography';
import styles from './ContactInfo.module.scss';

interface ContactInfoItemProps {
  label: string;
  value: string;
}

export const ContactInfoItem: React.FC<ContactInfoItemProps> = ({ label, value }) => {
  return (
    <div className={styles.contactItem}>
      <Small className={styles.contactLabel}>{label}</Small>
      <Small className={styles.contactValue}>{value}</Small>
    </div>
  );
};
