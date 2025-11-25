
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
