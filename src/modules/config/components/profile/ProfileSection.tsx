'use client';

import React from 'react';
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
import { useProfileFormStore } from '../../stores';
import { PhoneInput } from '../ui';
import { UNIQUE_TECHNOLOGIES } from '../../constants';
import { formatPhoneNumber } from '../../utils';
import { SocialLinksManager } from '../social-links';
import styles from './ProfileSection.module.scss';

interface ProfileSectionProps {
  userId: string;
  isOwnProfile: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string, error?: string) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  userId,
  isOwnProfile,
  onSuccess,
  onError,
}) => {
  const {
    formData,
    errors,
    handleInputChange,
    handleStackChange,
    handlePhoneLadaChange,
    handlePhoneChange,
  } = useProfileForm({ userId, onSuccess, onError });

  const { updateFormData } = useProfileFormStore();

  const handleGenericInputChange = React.useCallback((name: string) => (value: string) => {
    const event = { target: { name, value } } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(event);
  }, [handleInputChange]);

  const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  }, []);

  const handlePhoneInputChange = React.useCallback((value: string) => {
    handlePhoneChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
  }, [handlePhoneChange]);

  const handleDateChange = React.useCallback((date: Date | undefined) => {
    const event = { target: { name: 'birthDate', value: date } } as any;
    handleInputChange(event);
  }, [handleInputChange]);

  const handleGenderChange = React.useCallback((selectedIds: string[]) => {
    const event = { target: { name: 'gender', value: selectedIds[0] || '' } } as React.ChangeEvent<HTMLSelectElement>;
    handleInputChange(event);
  }, [handleInputChange]);

  const handleSocialLinksChange = React.useCallback((links: Array<{ networkId: string; username: string }>) => {
    const socialLinksMap: Record<string, string> = {};
    links.forEach(link => {
      socialLinksMap[link.networkId] = link.username;
    });
    updateFormData(socialLinksMap);
  }, [updateFormData]);

  if (!formData) return null;

  const initialSocialLinks = [
    formData.github ? { networkId: 'github', username: formData.github } : null,
    formData.linkedin ? { networkId: 'linkedin', username: formData.linkedin } : null,
    formData.twitter ? { networkId: 'twitter', username: formData.twitter } : null,
    formData.instagram ? { networkId: 'instagram', username: formData.instagram } : null,
    formData.facebook ? { networkId: 'facebook', username: formData.facebook } : null,
    formData.tiktok ? { networkId: 'tiktok', username: formData.tiktok } : null,
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
                <User size={20} animateOnHover loop style={{ color: 'white' }} />
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
              onChange={handleGenericInputChange('description')}
              placeholder="Breve descripción personal"
              disabled={!isOwnProfile}
              maxLength={180}
              onKeyDown={handleInputKeyDown}
              error={errors.description}
              showCharacterCount={true}
            />
          </div>
          <div className={styles.fieldGroupRow}>
            <CrystalCalendarDropdown
              label="Fecha de Nacimiento"
              value={formData.birthDate}
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
                <Hammer size={20} animateOnHover loop style={{ color: 'white' }} />
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
              items={UNIQUE_TECHNOLOGIES.map(tech => ({
                id: tech,
                name: tech
              }))}
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
    </>
  );
};
