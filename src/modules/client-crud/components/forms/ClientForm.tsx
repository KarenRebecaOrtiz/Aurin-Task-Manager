/**
 * Client Form Component
 * Main form for creating/editing clients with wizard steps
 */

'use client';

import { motion } from 'framer-motion';
import { CrystalInput, CrystalTextarea, CrystalDropdown } from '@/components/ui/inputs';
import { FormSection } from '@/modules/task-crud/components/forms/FormSection';
import { SwitchToggle } from '@/components/ui/switch-toggle';
import { PLACEHOLDERS, INDUSTRIES } from '../../config';
import { ClientFormData } from '../../types/form';
import { ClientTasksTable } from '../ClientTasksTable';
import Image from 'next/image';
import { Calendar } from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ClientFormProps {
  formData: ClientFormData;
  errors: Partial<Record<keyof ClientFormData, string>>;
  imagePreview: string;
  isReadOnly: boolean;
  isSubmitting: boolean;
  isAdmin: boolean;
  clientId?: string;
  onFieldChange: <K extends keyof ClientFormData>(field: K, value: ClientFormData[K]) => void;
  onImageClick: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProjectChange: (index: number, value: string) => void;
  onAddProject: () => void;
  onRemoveProject: (index: number) => void;
}

export function ClientForm({
  formData,
  errors,
  imagePreview,
  isReadOnly,
  isSubmitting,
  isAdmin,
  clientId,
  onFieldChange,
  onImageClick,
  onImageChange,
  onProjectChange,
  onAddProject,
  onRemoveProject,
}: ClientFormProps) {
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      {/* Basic Information */}
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

          {/* Active Status */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-700">Estado del Cliente</label>
                <span className="text-xs text-gray-500 mt-0.5">
                  {isReadOnly ? (
                    formData.isActive ? 'Cliente activo en el sistema' : 'Cliente inactivo'
                  ) : (
                    'Activa o desactiva este cliente'
                  )}
                </span>
              </div>
              {isReadOnly ? (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  formData.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {formData.isActive ? 'Activo' : 'Inactivo'}
                </span>
              ) : (
                <SwitchToggle
                  checked={formData.isActive ?? true}
                  onCheckedChange={(checked) => onFieldChange('isActive', checked)}
                  disabled={isSubmitting}
                />
              )}
            </div>
          </motion.div>
        </FormSection>

      {/* Contact Information */}
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

      {/* Projects */}
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

      {/* Metadata - Only visible in view mode */}
      {isReadOnly && clientId && (formData.createdAt || formData.lastModified) && (
        <FormSection>
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Información del Registro
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.createdAt && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Creado</span>
                    <span className="text-sm text-gray-700 font-medium">
                      {new Date(formData.createdAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {formData.lastModified && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Última modificación</span>
                    <span className="text-sm text-gray-700 font-medium">
                      {new Date(formData.lastModified).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
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
    </form>
  );
}
