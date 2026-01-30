/**
 * ClientFormSimple - Simplified client form following design reference
 * Reuses existing UI components: CrystalInput, CrystalDropdown, GradientAvatarSelector, Button
 */

'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CrystalInput, CrystalDropdown } from '@/components/ui/inputs';
import { GradientAvatarSelector } from '@/modules/teams/components/atoms';
import { ClientFormData } from '../../types/form';
import { INDUSTRIES } from '../../config';
import styles from './ClientFormSimple.module.scss';

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

interface ClientFormSimpleProps {
  formData: ClientFormData;
  errors: Partial<Record<keyof ClientFormData, string>>;
  isSubmitting: boolean;
  onFieldChange: <K extends keyof ClientFormData>(field: K, value: ClientFormData[K]) => void;
  onGradientSelect: (gradientId: string, colors?: string[]) => void;
  onImageUpload: (url: string) => void;
  onRFCBlur?: () => void;
}

export function ClientFormSimple({
  formData,
  errors,
  isSubmitting,
  onFieldChange,
  onGradientSelect,
  onImageUpload,
  onRFCBlur,
}: ClientFormSimpleProps) {
  // Check if there's a valid image (not empty-image placeholder)
  const hasValidImage = useMemo(() => {
    return formData.imageUrl && !formData.imageUrl.includes('empty-image');
  }, [formData.imageUrl]);

  // Check if there's a gradient selected
  const hasGradient = useMemo(() => {
    return formData.gradientColors && formData.gradientColors.length >= 3;
  }, [formData.gradientColors]);

  // Render the header avatar based on current selection
  const renderHeaderAvatar = () => {
    if (hasValidImage) {
      return (
        <div className={styles.headerAvatar}>
          <Image
            src={formData.imageUrl!}
            alt={formData.name || 'Cliente'}
            width={25}
            height={25}
            className={styles.headerAvatarImage}
          />
        </div>
      );
    }

    if (hasGradient) {
      return (
        <div
          className={styles.headerAvatar}
          style={{
            background: `linear-gradient(135deg, ${formData.gradientColors![0]} 0%, ${formData.gradientColors![1]} 50%, ${formData.gradientColors![2]} 100%)`
          }}
        />
      );
    }

    // Empty gray avatar
    return <div className={`${styles.headerAvatar} ${styles.headerAvatarEmpty}`} />;
  };

  return (
    <motion.form
      className={styles.form}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Header with avatar + title */}
      <motion.div variants={fadeInUp} className={styles.header}>
        {renderHeaderAvatar()}
        <h2 className={styles.headerTitle}>
          {formData.name || 'Nuevo Cliente'}
        </h2>
      </motion.div>

      <div className={styles.divider} />

      {/* Avatar/Gradient Selector */}
      <motion.div variants={fadeInUp} className={styles.avatarSection}>
        <span className={styles.sectionLabel}>Logo ó color.</span>
        <div className={styles.avatarSelector}>
          <GradientAvatarSelector
            selectedGradientId={formData.gradientId || 'default'}
            onSelect={onGradientSelect}
            customImageUrl={formData.imageUrl}
            onImageUpload={onImageUpload}
          />
        </div>
      </motion.div>

      {/* Name + Industry Row */}
      <motion.div variants={fadeInUp} className={styles.row}>
        <div className={styles.field}>
          <CrystalInput
            label="Nombre del Cliente *"
            type="text"
            id="client-name"
            required
            placeholder="Tech Solutions S.A. de C.V"
            value={formData.name}
            onChange={(value) => onFieldChange('name', value)}
            disabled={isSubmitting}
            error={errors.name}
            variant="no-icon"
          />
        </div>

        <div className={styles.field}>
          <CrystalDropdown
            label="Industria"
            placeholder="Selecciona una opción"
            items={INDUSTRIES.map(ind => ({ id: ind, name: ind }))}
            selectedItems={formData.industry ? [formData.industry] : []}
            onSelectionChange={(selected) => onFieldChange('industry', selected[0] || '')}
            disabled={isSubmitting}
          />
        </div>
      </motion.div>

      <div className={styles.divider} />

      {/* Email */}
      <motion.div variants={fadeInUp} className={styles.field}>
        <CrystalInput
          label="Email de contacto"
          type="email"
          id="email"
          placeholder="contacto@empresa.com"
          value={formData.email || ''}
          onChange={(value) => onFieldChange('email', value)}
          disabled={isSubmitting}
          error={errors.email}
          variant="no-icon"
        />
      </motion.div>

      {/* Phone + Website Row */}
      <motion.div variants={fadeInUp} className={styles.row}>
        <div className={styles.fieldSmall}>
          <CrystalInput
            label="Teléfono"
            type="tel"
            id="phone"
            placeholder="55 1234 5678"
            value={typeof formData.phone === 'string' ? formData.phone : formData.phone?.number || ''}
            onChange={(value) => onFieldChange('phone', value)}
            disabled={isSubmitting}
            error={errors.phone}
            variant="no-icon"
          />
        </div>

        <div className={styles.field}>
          <CrystalInput
            label="Sitio Web"
            type="url"
            id="website"
            placeholder="www.sitioweb.com"
            value={formData.website || ''}
            onChange={(value) => onFieldChange('website', value)}
            disabled={isSubmitting}
            error={errors.website}
            variant="no-icon"
          />
        </div>
      </motion.div>

      {/* Fiscal Section Header */}
      <motion.div variants={fadeInUp} className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Datos Fiscales y Ubicación</h3>
      </motion.div>

      <div className={styles.divider} />

      {/* RFC + Address Row */}
      <motion.div variants={fadeInUp} className={styles.row}>
        <div className={styles.field}>
          <CrystalInput
            label="RFC / Tax ID"
            type="text"
            id="taxId"
            placeholder="Ej. GHY8901017E6"
            value={formData.taxId || ''}
            onChange={(value) => onFieldChange('taxId', value.toUpperCase())}
            onBlur={onRFCBlur}
            maxLength={13}
            disabled={isSubmitting}
            error={errors.taxId}
            variant="no-icon"
          />
        </div>

        <div className={styles.field}>
          <CrystalInput
            label="Dirección Fiscal"
            type="text"
            id="address"
            placeholder="Calle, Número, Colonia, C.P."
            value={formData.address || ''}
            onChange={(value) => onFieldChange('address', value)}
            disabled={isSubmitting}
            variant="no-icon"
          />
        </div>
      </motion.div>
    </motion.form>
  );
}

export default ClientFormSimple;
