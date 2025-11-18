'use client';

import React from 'react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import {
  CrystalInput,
  CrystalTextarea,
  CrystalSelect,
  CrystalSearchableDropdown,
  CrystalPhoneSelect,
} from '@/components/ui';
import { useProfileForm } from '../../hooks';
import { UNIQUE_TECHNOLOGIES } from '../../constants';
import { formatPhoneNumber } from '../../utils';
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
  const { user: currentUser } = useUser();
  const {
    formData,
    errors,
    handleInputChange,
    handleStackChange,
    handlePhoneLadaChange,
    handlePhoneChange,
  } = useProfileForm({ userId, onSuccess, onError });

  if (!formData) return null;

  const handleGenericInputChange = (name: string) => (value: string) => {
    const event = { target: { name, value } } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(event);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + '/' + value.slice(5, 9);
    }
    e.target.value = value;
    handleInputChange(e);
  };

  return (
    <>
      {/* Información General */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Image src="/circle-user-round.svg" alt="Información" width={20} height={20} className={styles.sectionIcon} />
              Información General
            </h2>
            <div className={styles.stackDescription}>
              Completa tu información personal básica para que otros puedan conocerte mejor.
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <CrystalInput
              label="Nombre Completo"
              name="fullName"
              value={formData.fullName}
              onChange={handleGenericInputChange('fullName')}
              placeholder="Escribe tu nombre completo"
              disabled={!isOwnProfile}
              onKeyDown={(e) => handleInputKeyDown(e, 'fullName')}
              error={errors.fullName}
            />
            <CrystalInput
              label="Rol o Cargo"
              name="role"
              value={formData.role}
              onChange={handleGenericInputChange('role')}
              placeholder="¿Cuál es tu cargo actual?"
              disabled={!isOwnProfile}
              onKeyDown={(e) => handleInputKeyDown(e, 'role')}
              error={errors.role}
            />
          </div>
          <div className={styles.fieldGroup}>
            <CrystalTextarea
              value={formData.description || ''}
              onChange={(e) => {
                handleInputChange({
                  target: { name: 'description', value: e.target.value, type: 'text' }
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              placeholder="Breve descripción personal"
              disabled={!isOwnProfile}
              maxLength={180}
              showCharacterCount
              label="Acerca de ti"
              error={errors.description}
            />
          </div>
          <div className={styles.fieldGroupRow}>
            <CrystalInput
              label="Correo Electrónico"
              name="email"
              value={currentUser?.primaryEmailAddress?.emailAddress || ''}
              onChange={() => {}}
              placeholder="correo@ejemplo.com"
              disabled
            />
            <CrystalInput
              label="Fecha de Nacimiento"
              name="birthDate"
              value={formData.birthDate || ''}
              onChange={(value) => handleDateChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)}
              placeholder="DD/MM/AAAA"
              disabled={!isOwnProfile}
              maxLength={10}
              onKeyDown={(e) => handleInputKeyDown(e, 'birthDate')}
              error={errors.birthDate}
            />
          </div>
          <div className={styles.fieldGroupRow}>
            <div className={styles.frame239182}>
              <div className={styles.label}>Teléfono de Contacto</div>
              <div className={styles.phoneInputContainer}>
                <CrystalPhoneSelect
                  value={formData.phoneLada || '+52'}
                  onChange={handlePhoneLadaChange}
                  disabled={!isOwnProfile}
                />
                <CrystalInput
                  name="phone"
                  value={formatPhoneNumber(formData.phone || '')}
                  onChange={(value) => handlePhoneChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)}
                  placeholder="XXX-XXX-XX-XX"
                  disabled={!isOwnProfile}
                  maxLength={15}
                  onKeyDown={(e) => handleInputKeyDown(e, 'phone')}
                  error={errors.phone}
                />
              </div>
            </div>
            <CrystalInput
              label="Ciudad de Residencia"
              name="city"
              value={formData.city || ''}
              onChange={handleGenericInputChange('city')}
              placeholder="Ciudad, País"
              disabled={!isOwnProfile}
              onKeyDown={(e) => handleInputKeyDown(e, 'city')}
            />
          </div>
          <div className={styles.fieldGroupRow}>
            <CrystalSelect
              label="Género"
              name="gender"
              value={formData.gender || ''}
              onChange={handleInputChange}
              disabled={!isOwnProfile}
            >
              <option value="">Selecciona una opción</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
              <option value="Prefiero no decirlo">Prefiero no decirlo</option>
            </CrystalSelect>
            <CrystalInput
              label="Portafolio en Línea"
              name="portfolio"
              value={formData.portfolio || ''}
              onChange={handleGenericInputChange('portfolio')}
              placeholder="miportafolio.com"
              disabled={!isOwnProfile}
              error={errors.portfolio}
            />
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Image src="/layers.svg" alt="Stack" width={20} height={20} className={styles.sectionIcon} />
              Stack Tecnológico
            </h2>
            <div className={styles.stackDescription}>
              Selecciona las tecnologías y herramientas que usas frecuentemente (máximo 40).
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <CrystalSearchableDropdown
              label="Tecnologías"
              items={UNIQUE_TECHNOLOGIES.map(tech => ({
                id: tech,
                name: tech
              }))}
              selectedItems={formData.stack || []}
              onSelectionChange={handleStackChange}
              placeholder="Selecciona tecnologías..."
              searchPlaceholder="Buscar tecnologías..."
              disabled={!isOwnProfile}
              multiple={true}
              maxItems={40}
              emptyMessage="No se encontraron tecnologías"
            />
          </div>
        </div>
      </section>

      {/* Redes Sociales */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>
            <Image src="/share-2.svg" alt="Redes Sociales" width={20} height={20} className={styles.sectionIcon} />
            Redes Sociales
          </h2>
          <div className={styles.fieldGroup}>
            <div className={styles.stackDescription}>
              Agrega tus perfiles de redes sociales para que otros puedan conectarse contigo.
            </div>
          </div>
          <div className={styles.socialLinksGrid}>
            <CrystalInput
              label="GitHub"
              name="github"
              value={formData.github || ''}
              onChange={handleGenericInputChange('github')}
              placeholder="usuario"
              disabled={!isOwnProfile}
            />
            <CrystalInput
              label="LinkedIn"
              name="linkedin"
              value={formData.linkedin || ''}
              onChange={handleGenericInputChange('linkedin')}
              placeholder="usuario"
              disabled={!isOwnProfile}
            />
            <CrystalInput
              label="Twitter/X"
              name="twitter"
              value={formData.twitter || ''}
              onChange={handleGenericInputChange('twitter')}
              placeholder="@usuario"
              disabled={!isOwnProfile}
            />
            <CrystalInput
              label="Instagram"
              name="instagram"
              value={formData.instagram || ''}
              onChange={handleGenericInputChange('instagram')}
              placeholder="@usuario"
              disabled={!isOwnProfile}
            />
            <CrystalInput
              label="Facebook"
              name="facebook"
              value={formData.facebook || ''}
              onChange={handleGenericInputChange('facebook')}
              placeholder="usuario"
              disabled={!isOwnProfile}
            />
            <CrystalInput
              label="TikTok"
              name="tiktok"
              value={formData.tiktok || ''}
              onChange={handleGenericInputChange('tiktok')}
              placeholder="@usuario"
              disabled={!isOwnProfile}
            />
          </div>
        </div>
      </section>
    </>
  );
};
