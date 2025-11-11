'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import LocationDropdown from '../ui/LocationDropdown';
import LocationMap from '../ui/LocationMap';
import { useProfileFormStore } from '../../stores';
import type { PersonalLocation } from '../../types';
import styles from './LocationsSection.module.scss';

interface LocationsSectionProps {
  userId: string;
  isOwnProfile: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string, error?: string) => void;
}

export const LocationsSection: React.FC<LocationsSectionProps> = ({
  userId,
  isOwnProfile,
  onSuccess,
  onError,
}) => {
  const { formData, updateFormData } = useProfileFormStore();

  const handleHomeLocationChange = useCallback((location: PersonalLocation | undefined) => {
    updateFormData({ homeLocation: location });
  }, [updateFormData]);

  const handleSecondaryLocationChange = useCallback((location: PersonalLocation | undefined) => {
    updateFormData({ secondaryLocation: location });
  }, [updateFormData]);

  if (!formData) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionContent}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Image 
              src="/map-pinned.svg" 
              alt="Ubicaciones" 
              width={20} 
              height={20} 
              className={styles.sectionIcon} 
            />
            Ubicaciones Personalizadas
          </h2>
          <div className={styles.stackDescription}>
            Configura tus ubicaciones frecuentes para que el sistema pueda detectar automáticamente dónde estás (casa, oficina o fuera).
          </div>
          <div className={styles.privacyNote}>
            Tus direcciones no se comparten con nadie y están cifradas de extremo a extremo con tecnología AES-256. Solo tú puedes verlas.
            El resto del equipo únicamente verá si estás en &ldquo;Casa&rdquo;, &ldquo;Oficina&rdquo; o &ldquo;Fuera&rdquo;, sin conocer tu ubicación exacta.
          </div>
        </div>
        
        {/* Ubicación de Casa */}
        <div className={styles.fieldGroup}>
          <div>
            <h3 className={styles.subsectionTitle}>Ubicación de Casa</h3>
            <div className={styles.subsectionDescription}>
              Esta es tu ubicación principal, por ejemplo donde haces home office o trabajas remotamente.
            </div>
          </div>
          <LocationDropdown
            value={formData.homeLocation}
            onChange={handleHomeLocationChange}
            placeholder="Busca tu dirección de casa..."
            label="Casa"
            disabled={!isOwnProfile}
            required={false}
          />
          {/* Mapa de la ubicación de casa */}
          {formData.homeLocation && (
            <div className={styles.locationMapContainer}>
              <LocationMap location={formData.homeLocation} />
              <div className={styles.securityNote}>
                Esta dirección está protegida con cifrado AES-256. Nadie en el sistema tiene acceso a tu dirección exacta.
              </div>
            </div>
          )}
        </div>
        
        {/* Ubicación Alternativa */}
        <div className={styles.fieldGroup}>
          <div>
            <h3 className={styles.subsectionTitle}>Ubicación Alternativa</h3>
            <div className={styles.subsectionDescription}>
              Puedes añadir una segunda ubicación si trabajas desde más de un lugar.
            </div>
          </div>
          <LocationDropdown
            value={formData.secondaryLocation}
            onChange={handleSecondaryLocationChange}
            placeholder="Busca tu ubicación secundaria (café, coworking, etc.)..."
            label="Ubicación Secundaria"
            disabled={!isOwnProfile}
            required={false}
          />
          {/* Mapa de la ubicación alternativa */}
          {formData.secondaryLocation && (
            <div className={styles.locationMapContainer}>
              <LocationMap location={formData.secondaryLocation} />
            </div>
          )}
        </div>

        <div className={styles.privacyDisclaimer}>
          <div className={styles.privacyDisclaimerTitle}>
            Privacidad garantizada
          </div>
          <div className={styles.privacyDisclaimerText}>
            Tus direcciones están cifradas con algoritmos seguros y almacenadas en Firestore bajo los estándares de cifrado nativo de Google.
            Incluso si accedes a tu documento desde Firestore, los datos están encriptados y son ilegibles sin tu clave secreta.
            Solo tú puedes ver y modificar tu información de ubicación.
          </div>
        </div>
      </div>
    </section>
  );
};
