'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Small, Muted } from '@/components/ui/Typography';
import { useProfileFormStore } from '../../stores';
import styles from './NotificationsSection.module.scss';

interface NotificationsSectionProps {
  isOwnProfile: boolean;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  isOwnProfile,
}) => {
  const { formData, updateFormData } = useProfileFormStore();

  const handleToggleChange = useCallback((key: string, checked: boolean) => {
    updateFormData({
      emailPreferences: {
        ...formData?.emailPreferences,
        [key]: checked,
      },
    });
  }, [formData?.emailPreferences, updateFormData]);

  if (!formData) return null;

  const notificationOptions = [
    { 
      key: 'messages', 
      label: 'Mensajes del equipo', 
      description: 'Recibe notificaciones cuando alguien te envía mensajes grupales o privados' 
    },
    { 
      key: 'creation', 
      label: 'Nuevas tareas', 
      description: 'Te avisamos cuando se crean tareas que te afectan o en tus proyectos' 
    },
    { 
      key: 'edition', 
      label: 'Cambios en tareas', 
      description: 'Notificaciones sobre cambios de estado, prioridad, fechas o asignaciones' 
    },
    { 
      key: 'timers', 
      label: 'Registros de tiempo', 
      description: 'Avisos sobre registros de tiempo en tareas y proyectos' 
    },
  ];

  return (
    <motion.section 
      className={styles.section} 
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className={styles.sectionContent}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Image 
              src="/mail.svg" 
              alt="Notificaciones Email" 
              width={20} 
              height={20} 
              className={styles.sectionIcon}
            />
            Notificaciones por Email
          </h2>
          <div className={styles.stackDescription}>
            Personaliza qué notificaciones quieres recibir por email. Las notificaciones in-app siempre están activas.
          </div>
        </div>
        
        <div className={styles.fieldGroupToggler}>
          {notificationOptions.map(({ key, label, description }) => (
            <div key={key} className={styles.toggleRow}>
              <div className={styles.toggleContent}>
                <Small className={styles.toggleLabel}>{label}</Small>
                <Muted className={styles.toggleDescription}>{description}</Muted>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={formData.emailPreferences?.[key as keyof typeof formData.emailPreferences] ?? true}
                  onChange={(e) => handleToggleChange(key, e.target.checked)}
                  disabled={!isOwnProfile}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
};
