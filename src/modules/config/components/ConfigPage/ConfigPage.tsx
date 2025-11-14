'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ExpandableTabs } from '@/components/ui/ExpandableTabs';
import { User, MapPin, Users, Shield, Mail } from 'lucide-react';
import { ConfigSkeletonLoader } from '@/modules/data-views/components/shared';
import { ProfileHeader } from '../header';
import { ProfileSection } from '../profile';
import { LocationsSection } from '../locations';
import { TeamsSection } from '../teams';
import { SecuritySection } from '../security';
import { NotificationsSection } from '../notifications';
import { SaveActions } from '../ui';
import { useConfigPageStore, useProfileFormStore } from '../../stores';
import { useProfileForm } from '../../hooks';
import type { Config } from '../../types';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import styles from './ConfigPage.module.scss';

interface ConfigPageProps {
  userId: string;
  onClose: () => void;
  onShowSuccessAlert?: (message: string) => void;
  onShowFailAlert?: (message: string, error?: string) => void;
}

export const ConfigPage: React.FC<ConfigPageProps> = ({
  userId,
  onClose,
  onShowSuccessAlert,
  onShowFailAlert,
}) => {
  const { user: currentUser, isLoaded } = useUser();
  const { activeTab, setActiveTab, tabChanges } = useConfigPageStore();
  const { setFormData } = useProfileFormStore();
  const [loading, setLoading] = useState(true);
  const { success, error } = useSonnerToast();

  // Create handlers that use both Sonner and legacy callbacks
  const handleSuccess = (message: string) => {
    success(message);
    if (onShowSuccessAlert) onShowSuccessAlert(message);
  };

  const handleError = (message: string, errorDetails?: string) => {
    error(message, errorDetails);
    if (onShowFailAlert) onShowFailAlert(message, errorDetails);
  };

  // Hook para manejar el guardado de configuración
  const { handleSubmit, handleDiscard, isSaving } = useProfileForm({
    userId,
    onSuccess: handleSuccess,
    onError: handleError,
  });

  // Definir los tabs de configuración
  const configTabs: Array<{ title: string; icon: any } | { type: "separator" }> = [
    { title: "Configuración de perfil", icon: User },
    { title: "Ubicaciones Personalizadas", icon: MapPin },
    { title: "Equipos", icon: Users },
    { title: "Ajustes de Perfil", icon: Shield },
    { type: "separator" },
    { title: "Notificaciones", icon: Mail },
  ];

  // Cargar datos del usuario desde Firestore
  useEffect(() => {
    if (!isLoaded || !userId || !currentUser) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Config & { id: string };
          setFormData({
            userId,
            notificationsEnabled: data.notificationsEnabled || false,
            darkMode: data.darkMode || false,
            emailAlerts: data.emailAlerts || false,
            taskReminders: data.taskReminders || false,
            highContrast: data.highContrast || false,
            grayscale: data.grayscale || false,
            soundEnabled: data.soundEnabled || false,
            fullName: data.fullName || currentUser.fullName || '',
            role: data.role || '',
            description: data.description || '',
            birthDate: data.birthDate || '',
            phone: data.phone?.startsWith('+') ? data.phone.split(' ').slice(1).join('') : data.phone || '',
            phoneLada: data.phone?.startsWith('+') ? data.phone.split(' ')[0] : '+52',
            city: data.city || '',
            gender: data.gender || '',
            portfolio: data.portfolio?.replace(/^https?:\/\//, '') || '',
            stack: data.stack || [],
            teams: data.teams || [],
            profilePhoto: data.profilePhoto || currentUser.imageUrl || '',
            coverPhoto: data.coverPhoto || '/empty-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            status: data.status || 'Disponible',
            emailPreferences: data.emailPreferences || { messages: true, creation: true, edition: true, timers: true },
            homeLocation: data.personalLocations?.home,
            secondaryLocation: data.personalLocations?.secondary,
            github: data.socialLinks?.github || '',
            linkedin: data.socialLinks?.linkedin || '',
            twitter: data.socialLinks?.twitter || '',
            instagram: data.socialLinks?.instagram || '',
            facebook: data.socialLinks?.facebook || '',
            tiktok: data.socialLinks?.tiktok || '',
          });
        } else {
          setFormData({
            userId,
            notificationsEnabled: false,
            darkMode: false,
            emailAlerts: false,
            taskReminders: false,
            highContrast: false,
            grayscale: false,
            soundEnabled: false,
            fullName: currentUser.fullName || '',
            role: '',
            description: '',
            birthDate: '',
            phone: '',
            phoneLada: '+52',
            city: '',
            gender: '',
            portfolio: '',
            stack: [],
            teams: [],
            profilePhoto: currentUser.imageUrl || '',
            coverPhoto: '/empty-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            status: 'Disponible',
            emailPreferences: { messages: true, creation: true, edition: true, timers: true },
            homeLocation: undefined,
            secondaryLocation: undefined,
            github: '',
            linkedin: '',
            twitter: '',
            instagram: '',
            facebook: '',
            tiktok: '',
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ConfigPage] Error fetching user config:', err);
        if (onShowFailAlert) {
          onShowFailAlert('Error al cargar el perfil', err.message);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currentUser, isLoaded, onShowFailAlert, setFormData]);

  if (loading || !isLoaded) {
    return <ConfigSkeletonLoader rows={5} />;
  }

  if (!currentUser) {
    return (
      <div className={styles.container}>
        <p>Configuración no disponible.</p>
        <button className={styles.closeButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUser.id === userId;

  return (
    <div className={styles.container}>
      {/* Header con fotos */}
      <ProfileHeader
        userId={userId}
        isOwnProfile={isOwnProfile}
        onSuccess={onShowSuccessAlert}
        onError={onShowFailAlert}
      />

      {/* Contenido principal */}
      <div className={styles.content}>
        {/* Tabs de configuración */}
        <div className={styles.configTabsContainer}>
          <ExpandableTabs
            tabs={configTabs as any}
            onChange={(index) => setActiveTab(index || 0)}
            className="mb-6"
            hideTextOnMobile={true}
          />
        </div>

        {/* Tab 0: Perfil */}
        {activeTab === 0 && (
          <>
            <ProfileSection
              userId={userId}
              isOwnProfile={isOwnProfile}
              onSuccess={onShowSuccessAlert}
              onError={onShowFailAlert}
            />
            {isOwnProfile && (
              <SaveActions
                hasChanges={tabChanges[0] || false}
                isSaving={isSaving}
                onSave={handleSubmit}
                onDiscard={handleDiscard}
              />
            )}
          </>
        )}

        {/* Tab 1: Ubicaciones */}
        {activeTab === 1 && (
          <>
            <LocationsSection
              userId={userId}
              isOwnProfile={isOwnProfile}
              onSuccess={onShowSuccessAlert}
              onError={onShowFailAlert}
            />
            {isOwnProfile && (
              <SaveActions
                hasChanges={tabChanges[1] || false}
                isSaving={isSaving}
                onSave={handleSubmit}
                onDiscard={handleDiscard}
              />
            )}
          </>
        )}

        {/* Tab 2: Equipos */}
        {activeTab === 2 && (
          <>
            <TeamsSection
              userId={userId}
              isOwnProfile={isOwnProfile}
              onSuccess={onShowSuccessAlert}
              onError={onShowFailAlert}
            />
            {isOwnProfile && (
              <SaveActions
                hasChanges={tabChanges[2] || false}
                isSaving={isSaving}
                onSave={handleSubmit}
                onDiscard={handleDiscard}
              />
            )}
          </>
        )}

        {/* Tab 3: Seguridad */}
        {activeTab === 3 && isOwnProfile && (
          <SecuritySection
            onSuccess={onShowSuccessAlert}
            onError={onShowFailAlert}
          />
        )}

        {/* Tab 5: Notificaciones */}
        {activeTab === 5 && (
          <>
            <NotificationsSection
              isOwnProfile={isOwnProfile}
            />
            {isOwnProfile && (
              <SaveActions
                hasChanges={tabChanges[5] || false}
                isSaving={isSaving}
                onSave={handleSubmit}
                onDiscard={handleDiscard}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
