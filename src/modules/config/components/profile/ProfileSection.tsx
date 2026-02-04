'use client';

import React, { useMemo, memo } from 'react';
import Image from 'next/image';
import {
  CrystalInput,
  CrystalSearchableDropdown,
  CrystalCalendarDropdown,
  CrystalDropdown,
  CrystalTextarea,
} from '@/components/ui';
import { User, Hammer, Link } from '@/components/animate-ui/icons';
import { Mars, Venus, VenusAndMars, CircleDot } from 'lucide-react';
import { useProfileForm } from '../../hooks';
import { useConfigPageStore } from '../../stores';
import { PhoneInput, SaveActions } from '../ui';
import { UNIQUE_TECHNOLOGIES } from '../../constants';
import { formatPhoneNumber, parseDate } from '../../utils';
import { SocialLinksManager } from '../social-links';
import styles from './ProfileSection.module.scss';

/**
 * Convierte un string de fecha DD/MM/YYYY a objeto Date
 * Retorna undefined si el string está vacío o es inválido
 */
function birthDateStringToDate(dateString: string | undefined): Date | undefined {
  if (!dateString || dateString.trim() === '') return undefined;

  // Si ya es un formato ISO o Date-compatible, intentar parsear directo
  if (dateString.includes('-') || dateString.includes('T')) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // Parsear formato DD/MM/YYYY
  const parsed = parseDate(dateString);
  return parsed || undefined;
}

interface ProfileSectionProps {
  userId: string;
  isOwnProfile: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string, error?: string) => void;
  /** Si es true, no renderiza el SaveActions (para cuando se usa DialogFooter externo) */
  hideActions?: boolean;
}

export const ProfileSection: React.FC<ProfileSectionProps> = memo(({
  userId,
  isOwnProfile,
  onSuccess,
  onError,
  hideActions = false,
}) => {
  const { hasUnsavedChanges } = useConfigPageStore();
  const {
    formData,
    errors,
    isSaving,
    handleInputChange,
    handleStackChange,
    handlePhoneLadaChange,
    handlePhoneChange,
    handleSocialLinksChange,
    handleSubmit,
    handleDiscard,
  } = useProfileForm({ userId, onSuccess, onError });

  // Memoizar transformación del array de tecnologías (optimización crítica: ~800 items)
  const technologyItems = useMemo(
    () => UNIQUE_TECHNOLOGIES.map(tech => ({
      id: tech,
      name: tech
    })),
    []
  );

  const handleGenericInputChange = React.useCallback((name: string) => (value: string) => {
    const event = { target: { name, value } } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(event);
  }, [handleInputChange]);

  const handleTextareaChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const event = { target: { name: 'description', value: e.target.value } } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(event);
  }, [handleInputChange]);

  const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  }, []);

  const handleTextareaKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
    }
  }, []);

  const handlePhoneInputChange = React.useCallback((value: string) => {
    handlePhoneChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
  }, [handlePhoneChange]);

  const handleDateChange = React.useCallback((date: Date | undefined) => {
    // Convertir Date a string formato DD/MM/YYYY para almacenamiento
    let dateString = '';
    if (date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      dateString = `${day}/${month}/${year}`;
    }
    const event = { target: { name: 'birthDate', value: dateString } } as any;
    handleInputChange(event);
  }, [handleInputChange]);

  const handleGenderChange = React.useCallback((selectedIds: string[]) => {
    const event = { target: { name: 'gender', value: selectedIds[0] || '' } } as React.ChangeEvent<HTMLSelectElement>;
    handleInputChange(event);
  }, [handleInputChange]);

  if (!formData) return null;

  const initialSocialLinks = [
    formData.github ? { networkId: 'github', username: formData.github } : null,
    formData.linkedin ? { networkId: 'linkedin', username: formData.linkedin } : null,
    formData.twitter ? { networkId: 'twitter', username: formData.twitter } : null,
    formData.instagram ? { networkId: 'instagram', username: formData.instagram } : null,
    formData.facebook ? { networkId: 'facebook', username: formData.facebook } : null,
    formData.tiktok ? { networkId: 'tiktok', username: formData.tiktok } : null,
    formData.whatsapp ? { networkId: 'whatsapp', username: formData.whatsapp } : null,
  ].filter((link): link is { networkId: string; username: string } => link !== null);

  const genderOptions = [
    { id: 'Masculino', name: 'Masculino', lucideIcon: <Mars size={20} /> },
    { id: 'Femenino', name: 'Femenino', lucideIcon: <Venus size={20} /> },
    { id: 'Otro', name: 'Otro', lucideIcon: <VenusAndMars size={20} /> },
    { id: 'Prefiero no decirlo', name: 'Prefiero no decirlo', lucideIcon: <CircleDot size={20} /> },
  ];

  return (
    <>
      {/* Información General */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <div className={styles.sectionIcon}>
                <User size={20} animateOnHover loop />
              </div>
              Información General
            </h2>
            <div className={styles.stackDescription}>
              Completa tu información personal básica para que otros puedan conocerte mejor.
            </div>
          </div>
          <div className={styles.fieldGroupRow}>
            <CrystalInput
              label="Nombre Completo"
              name="fullName"
              value={formData.fullName}
              onChange={handleGenericInputChange('fullName')}
              placeholder="Escribe tu nombre completo"
              disabled={!isOwnProfile}
              onKeyDown={handleInputKeyDown}
              error={errors.fullName}
              variant="no-icon"
            />
            <CrystalInput
              label="Rol o Cargo"
              name="role"
              value={formData.role}
              onChange={handleGenericInputChange('role')}
              placeholder="¿Cuál es tu cargo actual?"
              disabled={!isOwnProfile}
              onKeyDown={handleInputKeyDown}
              error={errors.role}
              variant="no-icon"
            />
          </div>
          <div className={styles.fieldGroupFull}>
            <CrystalTextarea
              label="Acerca de ti"
              name="description"
              value={formData.description || ''}
              onChange={handleTextareaChange}
              placeholder="Breve descripción personal"
              disabled={!isOwnProfile}
              maxLength={180}
              onKeyDown={handleTextareaKeyDown}
              error={errors.description}
              showCharacterCount={true}
            />
          </div>
          <div className={styles.fieldGroupRow}>
            <CrystalCalendarDropdown
              label="Fecha de Nacimiento"
              value={birthDateStringToDate(formData.birthDate)}
              onChange={handleDateChange}
              placeholder="DD/MM/AAAA"
              disabled={!isOwnProfile}
              error={errors.birthDate}
            />
            <CrystalDropdown
              label="Género"
              items={genderOptions}
              selectedItems={formData.gender ? [formData.gender] : []}
              onSelectionChange={handleGenderChange}
              placeholder="Selecciona una opción"
              disabled={!isOwnProfile}
              multiple={false}
            />
          </div>
          <div className={styles.fieldGroupRow}>
            <CrystalInput
              label="Ciudad de Residencia"
              name="city"
              value={formData.city || ''}
              onChange={handleGenericInputChange('city')}
              placeholder="Ciudad, País"
              disabled={!isOwnProfile}
              onKeyDown={handleInputKeyDown}
              variant="no-icon"
            />

            <PhoneInput
              label="Teléfono de Contacto"
              ladaValue={formData.phoneLada || '+52'}
              phoneValue={formatPhoneNumber(formData.phone || '')}
              onLadaChange={handlePhoneLadaChange}
              onPhoneChange={handlePhoneInputChange}
              disabled={!isOwnProfile}
              error={errors.phone}
              placeholder="XXX-XXX-XX-XX"
              maxLength={15}
              onKeyDown={handleInputKeyDown}
            />

          </div>
       
        </div>
      </section>

      {/* Stack */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <div className={styles.sectionIcon}>
                <Hammer size={20} animateOnHover loop />
              </div>
              Stack de Herramientas
            </h2>
            <div className={styles.stackDescription}>
              Selecciona las herramientas y herramientas que usas frecuentemente (máximo 40).
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <CrystalSearchableDropdown
              label=""
              items={technologyItems}
              selectedItems={formData.stack || []}
              onSelectionChange={handleStackChange}
              placeholder="Selecciona herramientas..."
              searchPlaceholder="Buscar herramientas..."
              disabled={!isOwnProfile}
              multiple={true}
              maxItems={40}
              emptyMessage="No se encontraron herramientas"
            />
          </div>
        </div>
      </section>

      {/* Redes Sociales */}
      {isOwnProfile && (
        <section className={styles.section}>
          <div className={styles.sectionContent}>
            <SocialLinksManager
              initialLinks={initialSocialLinks}
              onChange={handleSocialLinksChange}
              disabled={!isOwnProfile}
            />
          </div>
        </section>
      )}

      {/* Save Actions - Solo para usuarios propios y cuando no se ocultan las acciones */}
      {isOwnProfile && !hideActions && (
        <SaveActions
          hasChanges={hasUnsavedChanges}
          isSaving={isSaving}
          onSave={handleSubmit}
          onDiscard={handleDiscard}
        />
      )}
    </>
  );
});

ProfileSection.displayName = 'ProfileSection';
