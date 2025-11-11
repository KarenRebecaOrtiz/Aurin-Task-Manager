'use client';

import React from 'react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { BiographyInput } from '../ui/BiographyInput';
import { WebsiteInput } from '../ui/WebsiteInput';
import PhoneCountrySelect from '../ui/PhoneCountrySelect';
import SearchableDropdown from '../ui/SearchableDropdown';
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
            <div className={styles.frame239182}>
              <div className={styles.label}>Nombre Completo</div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Escribe tu nombre completo"
                className={styles.input}
                disabled={!isOwnProfile}
                onKeyDown={(e) => handleInputKeyDown(e, 'fullName')}
              />
              {errors.fullName && <p className={styles.errorText}>{errors.fullName}</p>}
            </div>
            <div className={styles.frame239183}>
              <div className={styles.label}>Rol o Cargo</div>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="¿Cuál es tu cargo actual?"
                className={styles.input}
                disabled={!isOwnProfile}
                onKeyDown={(e) => handleInputKeyDown(e, 'role')}
              />
              {errors.role && <p className={styles.errorText}>{errors.role}</p>}
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <BiographyInput
              value={formData.description || ''}
              onChange={(value) => {
                handleInputChange({
                  target: { name: 'description', value, type: 'text' }
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              placeholder="Breve descripción personal"
              disabled={!isOwnProfile}
              maxLength={180}
              label="Acerca de ti"
              className={styles.input}
            />
            {errors.description && <p className={styles.errorText}>{errors.description}</p>}
          </div>
          <div className={styles.fieldGroupRow}>
            <div className={styles.frame239182}>
              <div className={styles.label}>Correo Electrónico</div>
              <input
                type="text"
                value={currentUser?.primaryEmailAddress?.emailAddress || ''}
                placeholder="correo@ejemplo.com"
                className={styles.input}
                disabled
              />
            </div>
            <div className={styles.frame239183}>
              <div className={styles.label}>Fecha de Nacimiento</div>
              <input
                type="text"
                name="birthDate"
                value={formData.birthDate || ''}
                onChange={handleDateChange}
                placeholder="DD/MM/AAAA"
                className={styles.input}
                disabled={!isOwnProfile}
                maxLength={10}
                onKeyDown={(e) => handleInputKeyDown(e, 'birthDate')}
              />
              {errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
            </div>
          </div>
          <div className={styles.fieldGroupRow}>
            <div className={styles.frame239182}>
              <div className={styles.label}>Teléfono de Contacto</div>
              <div className={styles.phoneInputContainer}>
                <PhoneCountrySelect
                  value={formData.phoneLada || '+52'}
                  onChange={handlePhoneLadaChange}
                  disabled={!isOwnProfile}
                />
                <input
                  type="text"
                  name="phone"
                  value={formatPhoneNumber(formData.phone || '')}
                  onChange={handlePhoneChange}
                  placeholder="XXX-XXX-XX-XX"
                  className={styles.input}
                  disabled={!isOwnProfile}
                  maxLength={15}
                  onKeyDown={(e) => handleInputKeyDown(e, 'phone')}
                />
              </div>
              {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
            </div>
            <div className={styles.frame239183}>
              <div className={styles.label}>Ciudad de Residencia</div>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleInputChange}
                placeholder="Ciudad, País"
                className={styles.input}
                disabled={!isOwnProfile}
                onKeyDown={(e) => handleInputKeyDown(e, 'city')}
              />
            </div>
          </div>
          <div className={styles.fieldGroupRow}>
            <div className={styles.frame239182}>
              <div className={styles.label}>Género</div>
              <select
                name="gender"
                value={formData.gender || ''}
                onChange={handleInputChange}
                className={styles.input}
                disabled={!isOwnProfile}
              >
                <option value="">Selecciona una opción</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
                <option value="Prefiero no decirlo">Prefiero no decirlo</option>
              </select>
            </div>
            <div className={styles.frame239183}>
              <div className={styles.label}>Portafolio en Línea</div>
              <WebsiteInput
                value={formData.portfolio || ''}
                onChange={(value) => {
                  handleInputChange({
                    target: { name: 'portfolio', value, type: 'text' }
                  } as React.ChangeEvent<HTMLInputElement>);
                }}
                placeholder="miportafolio.com"
                disabled={!isOwnProfile}
                className={styles.input}
              />
              {errors.portfolio && <p className={styles.errorText}>{errors.portfolio}</p>}
            </div>
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
            <SearchableDropdown
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
              className={styles.stackSelect}
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
            <div className={styles.socialLinkField}>
              <div className={styles.label}>
                <Image src="/github.svg" alt="GitHub" width={16} height={16} />
                GitHub
              </div>
              <input
                type="text"
                name="github"
                value={formData.github || ''}
                onChange={handleInputChange}
                placeholder="usuario"
                className={styles.input}
                disabled={!isOwnProfile}
              />
            </div>
            <div className={styles.socialLinkField}>
              <div className={styles.label}>
                <Image src="/linkedin.svg" alt="LinkedIn" width={16} height={16} />
                LinkedIn
              </div>
              <input
                type="text"
                name="linkedin"
                value={formData.linkedin || ''}
                onChange={handleInputChange}
                placeholder="usuario"
                className={styles.input}
                disabled={!isOwnProfile}
              />
            </div>
            <div className={styles.socialLinkField}>
              <div className={styles.label}>
                <Image src="/twitter.svg" alt="Twitter" width={16} height={16} />
                Twitter/X
              </div>
              <input
                type="text"
                name="twitter"
                value={formData.twitter || ''}
                onChange={handleInputChange}
                placeholder="@usuario"
                className={styles.input}
                disabled={!isOwnProfile}
              />
            </div>
            <div className={styles.socialLinkField}>
              <div className={styles.label}>
                <Image src="/instagram.svg" alt="Instagram" width={16} height={16} />
                Instagram
              </div>
              <input
                type="text"
                name="instagram"
                value={formData.instagram || ''}
                onChange={handleInputChange}
                placeholder="@usuario"
                className={styles.input}
                disabled={!isOwnProfile}
              />
            </div>
            <div className={styles.socialLinkField}>
              <div className={styles.label}>
                <Image src="/facebook.svg" alt="Facebook" width={16} height={16} />
                Facebook
              </div>
              <input
                type="text"
                name="facebook"
                value={formData.facebook || ''}
                onChange={handleInputChange}
                placeholder="usuario"
                className={styles.input}
                disabled={!isOwnProfile}
              />
            </div>
            <div className={styles.socialLinkField}>
              <div className={styles.label}>
                <Image src="/tiktok.svg" alt="TikTok" width={16} height={16} />
                TikTok
              </div>
              <input
                type="text"
                name="tiktok"
                value={formData.tiktok || ''}
                onChange={handleInputChange}
                placeholder="@usuario"
                className={styles.input}
                disabled={!isOwnProfile}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
