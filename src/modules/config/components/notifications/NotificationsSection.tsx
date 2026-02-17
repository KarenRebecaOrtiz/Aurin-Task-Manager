'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Small, Muted } from '@/components/ui/Typography';
import { useProfileFormStore } from '../../stores';
import { usePushNotifications } from '@/modules/push-notifications/client/hooks/usePushNotifications';
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
  const { isSupported, isSubscribed, isDenied, subscribe, unsubscribe, isLoading: pushLoading } = usePushNotifications();

  const handleToggleChange = useCallback((key: string, checked: boolean) => {
    updateFormData({
      emailPreferences: {
        ...formData?.emailPreferences,
        [key]: checked,
      },
    });
  }, [formData?.emailPreferences, updateFormData]);

  const handlePushToggleChange = useCallback((key: string, checked: boolean) => {
    updateFormData({
      pushPreferences: {
        ...formData?.pushPreferences,
        [key]: checked,
      },
    });
  }, [formData?.pushPreferences, updateFormData]);

  const handlePushMasterToggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
      updateFormData({ pushNotificationsEnabled: false });
    } else {
      const success = await subscribe();
      if (success) {
        updateFormData({ pushNotificationsEnabled: true });
      }
    }
  }, [isSubscribed, subscribe, unsubscribe, updateFormData]);

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

      {/* Push Notifications Section */}
      {isSupported && (
        <motion.div
          className={styles.sectionContent}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.sectionIcon}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Notificaciones Push
            </h2>
            <div className={styles.stackDescription}>
              {isDenied
                ? 'Las notificaciones push fueron bloqueadas. Puedes habilitarlas desde la configuracion de tu navegador.'
                : 'Recibe alertas instantaneas en tu dispositivo cuando ocurran eventos importantes.'}
            </div>
          </div>

          {/* Master push toggle */}
          <div className={styles.fieldGroupToggler}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleContent}>
                <Small className={styles.toggleLabel}>
                  {isSubscribed ? 'Push activas' : 'Activar notificaciones push'}
                </Small>
                <Muted className={styles.toggleDescription}>
                  {isSubscribed
                    ? 'Recibes alertas push en este dispositivo'
                    : 'Haz click para activar las notificaciones push en este dispositivo'}
                </Muted>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={isSubscribed}
                  onChange={handlePushMasterToggle}
                  disabled={!isOwnProfile || pushLoading || isDenied}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            {/* Individual push preferences (only visible when subscribed) */}
            {isSubscribed && notificationOptions.map(({ key, label, description }) => (
              <div key={`push-${key}`} className={styles.toggleRow}>
                <div className={styles.toggleContent}>
                  <Small className={styles.toggleLabel}>{label}</Small>
                  <Muted className={styles.toggleDescription}>{description}</Muted>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={formData.pushPreferences?.[key as keyof typeof formData.pushPreferences] ?? true}
                    onChange={(e) => handlePushToggleChange(key, e.target.checked)}
                    disabled={!isOwnProfile}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.section>
  );
};
