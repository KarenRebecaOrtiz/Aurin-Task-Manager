
import React from 'react';
import { motion } from 'framer-motion';
import { ContactInfoItem } from './ContactInfoItem';
import { itemVariants } from '@/modules/dialogs';
import styles from './ContactInfo.module.scss';

interface ContactInfoProps {
  phone?: string;
  city?: string;
  birthDate?: string;
  gender?: string;
}

export const ContactInfo: React.FC<ContactInfoProps> = ({
  phone,
  city,
  birthDate,
  gender,
}) => {
  // TODO: No renderizar si no hay información de contacto
  const hasContactInfo = phone || city || birthDate || gender;

  if (!hasContactInfo) {
    return null;
  }

  return (
    <motion.div className={styles.contactInfo} variants={itemVariants}>
      {/* TODO: Renderizar cada campo solo si existe */}
      {phone && <ContactInfoItem label="Teléfono:" value={phone} />}
      {city && <ContactInfoItem label="Ubicación:" value={city} />}
      {birthDate && <ContactInfoItem label="Fecha de Nacimiento:" value={birthDate} />}
      {gender && <ContactInfoItem label="Género:" value={gender} />}
    </motion.div>
  );
};
