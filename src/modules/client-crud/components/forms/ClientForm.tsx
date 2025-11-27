/**
 * Client Form Component
 * Main form for creating/editing clients with wizard steps
 */

'use client';

import { motion } from 'framer-motion';
import { CrystalInput, CrystalTextarea, CrystalDropdown } from '@/components/ui/inputs';
import { FormSection } from '@/modules/task-crud/components/forms/FormSection';
import { PLACEHOLDERS, INDUSTRIES } from '../../config';
import { ClientFormData } from '../../types/form';
import { ClientTasksTable } from '../ClientTasksTable';
import Image from 'next/image';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ClientFormProps {
  currentStep: number;
  formData: ClientFormData;
  errors: Partial<Record<keyof ClientFormData, string>>;
  imagePreview: string;
  isReadOnly: boolean;
  isSubmitting: boolean;
  isAdmin: boolean;
  clientId?: string; // For showing tasks table
  footer?: React.ReactNode; // Add this line
  onFieldChange: <K extends keyof ClientFormData>(field: K, value: ClientFormData[K]) => void;
  onImageClick: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProjectChange: (index: number, value: string) => void;
  onAddProject: () => void;
  onRemoveProject: (index: number) => void;
}

export function ClientForm({
  currentStep,
  formData,
  errors,
  imagePreview,
  isReadOnly,
  isSubmitting,
  isAdmin,
  clientId,
  footer, // Add this line
  onFieldChange,
  onImageClick,
  onImageChange,
  onProjectChange,
  onAddProject,
  onRemoveProject,
}: ClientFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Step 1: Basic Information */}
      {(isReadOnly || currentStep === 0) && (
        <FormSection>
          {/* Image Upload */}
          <motion.div variants={fadeInUp} className="md:col-span-2 flex justify-center">
            <div
              className={`relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors ${
                !isReadOnly ? 'cursor-pointer' : ''
              }`}
              onClick={!isReadOnly ? onImageClick : undefined}
            >
              <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              {!isReadOnly && (
                <input
                  id="client-image-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  style={{ display: 'none' }}
                  onChange={onImageChange}
                  disabled={isSubmitting}
                />
              )}
            </div>
          </motion.div>

          {/* Client Name */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <CrystalInput
              label="Nombre del Cliente *"
              type="text"
              id="client-name"
              required
              placeholder={PLACEHOLDERS.NAME}
              value={formData.name}
              onChange={(value) => onFieldChange('name', value)}
              disabled={isReadOnly || isSubmitting}
              error={errors.name}
            />
          </motion.div>

          {/* Industry */}
          <motion.div variants={fadeInUp} className="md:col-span-1">
            <CrystalDropdown
              label="Industria"
              id="industry"
              placeholder={PLACEHOLDERS.INDUSTRY}
              items={INDUSTRIES.map(ind => ({ value: ind, label: ind }))}
              value={formData.industry || ''}
              onChange={(value) => onFieldChange('industry', value)}
              disabled={isReadOnly || isSubmitting}
            />
          </motion.div>

          {/* Tax ID (RFC) */}
          <motion.div variants={fadeInUp} className="md:col-span-1">
            <CrystalInput
              label="RFC"
              type="text"
              id="taxId"
              placeholder={PLACEHOLDERS.TAX_ID}
              value={formData.taxId || ''}
              onChange={(value) => onFieldChange('taxId', value)}
              disabled={isReadOnly || isSubmitting}
            />
          </motion.div>
        </FormSection>
      )}

      {/* Step 2: Contact Information */}
      {(isReadOnly || currentStep === 1) && (
        <FormSection>
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información de Contacto</h3>
          </motion.div>

          {/* Email */}
          <motion.div variants={fadeInUp} className="md:col-span-1">
            <CrystalInput
              label="Email de Contacto"
              type="email"
              id="email"
              placeholder={PLACEHOLDERS.EMAIL}
              value={formData.email || ''}
              onChange={(value) => onFieldChange('email', value)}
              disabled={isReadOnly || isSubmitting}
              error={errors.email}
            />
          </motion.div>

          {/* Phone */}
          <motion.div variants={fadeInUp} className="md:col-span-1">
            <CrystalInput
              label="Teléfono de Contacto"
              type="tel"
              id="phone"
              placeholder={PLACEHOLDERS.PHONE}
              value={formData.phone || ''}
              onChange={(value) => onFieldChange('phone', value)}
              disabled={isReadOnly || isSubmitting}
            />
          </motion.div>

          {/* Website */}
          <motion.div variants={fadeInUp} className="md:col-span-1">
            <CrystalInput
              label="Sitio Web"
              type="url"
              id="website"
              placeholder={PLACEHOLDERS.WEBSITE}
              value={formData.website || ''}
              onChange={(value) => onFieldChange('website', value)}
              disabled={isReadOnly || isSubmitting}
              error={errors.website}
            />
          </motion.div>

          {/* Address */}
          <motion.div variants={fadeInUp} className="md:col-span-1">
            <CrystalInput
              label="Dirección Fiscal"
              type="text"
              id="address"
              placeholder={PLACEHOLDERS.ADDRESS}
              value={formData.address || ''}
              onChange={(value) => onFieldChange('address', value)}
              disabled={isReadOnly || isSubmitting}
            />
          </motion.div>

          {/* Notes */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <CrystalTextarea
              label="Notas Adicionales"
              id="notes"
              placeholder={PLACEHOLDERS.NOTES}
              value={formData.notes || ''}
              onChange={(value) => onFieldChange('notes', value)}
              disabled={isReadOnly || isSubmitting}
              rows={3}
            />
          </motion.div>
        </FormSection>
      )}

      {/* Step 3: Projects */}
      {(isReadOnly || currentStep === 2) && (
        <FormSection>
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Proyectos</label>
            <div className="flex flex-col gap-2">
              {(formData.projects || ['']).map((project, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <CrystalInput
                    type="text"
                    placeholder={`Proyecto ${index + 1}`}
                    value={project}
                    onChange={(value) => onProjectChange(index, value)}
                    disabled={isReadOnly || isSubmitting}
                  />
                  {!isReadOnly && (formData.projects || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveProject(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      disabled={isSubmitting}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={onAddProject}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                  disabled={isSubmitting}
                >
                  + Añadir otro proyecto
                </button>
              )}
            </div>
          </motion.div>
        </FormSection>
      )}

      {/* Tasks Table - Only visible in view mode */}
      {isReadOnly && clientId && (
        <FormSection>
          <ClientTasksTable clientId={clientId} isAdmin={isAdmin} />
        </FormSection>
      )}

      {/* Render Footer */}
      {footer}
    </div>
  );
}
