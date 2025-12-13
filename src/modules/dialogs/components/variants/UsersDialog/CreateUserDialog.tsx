/**
 * Create User Dialog
 *
 * Admin-only dialog for creating new users via Clerk SDK.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '../../DialogPrimitives';
import { DialogFooter, DialogActions } from '../../molecules';
import { panelVariants } from '../../../config/animations';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import styles from './UsersDialog.module.scss';
import { User, Mail, Lock, AtSign, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  isAdmin: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  password?: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  isAdmin: false,
};

export function CreateUserDialog({
  isOpen,
  onOpenChange,
  onUserCreated,
}: CreateUserDialogProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { success: showSuccess, error: showError } = useSonnerToast();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen]);

  // Update field value
  const handleFieldChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'El formato del email no es válido';
      }
    }

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Solo se permiten letras, números y guiones bajos';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      showSuccess(`Usuario "${formData.firstName} ${formData.lastName}" creado exitosamente`);
      onUserCreated();
    } catch (error) {
      console.error('Error creating user:', error);
      showError(
        'Error al crear usuario',
        error instanceof Error ? error.message : 'No se pudo crear el usuario'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, showSuccess, showError, onUserCreated]);

  // Cancel and close
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Render form content
  const formContent = (
    <div className={styles.form}>
      {/* First Name */}
      <div className={styles.formGroup}>
        <label htmlFor="firstName" className={styles.label}>
          <User size={14} />
          Nombre
        </label>
        <input
          id="firstName"
          type="text"
          value={formData.firstName}
          onChange={(e) => handleFieldChange('firstName', e.target.value)}
          className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
          placeholder="Juan"
          disabled={isSubmitting}
        />
        {errors.firstName && (
          <span className={styles.errorText}>{errors.firstName}</span>
        )}
      </div>

      {/* Last Name */}
      <div className={styles.formGroup}>
        <label htmlFor="lastName" className={styles.label}>
          <User size={14} />
          Apellido
        </label>
        <input
          id="lastName"
          type="text"
          value={formData.lastName}
          onChange={(e) => handleFieldChange('lastName', e.target.value)}
          className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
          placeholder="Pérez"
          disabled={isSubmitting}
        />
        {errors.lastName && (
          <span className={styles.errorText}>{errors.lastName}</span>
        )}
      </div>

      {/* Email */}
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          <Mail size={14} />
          Email de acceso
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
          placeholder="usuario@ejemplo.com"
          disabled={isSubmitting}
        />
        {errors.email && (
          <span className={styles.errorText}>{errors.email}</span>
        )}
      </div>

      {/* Username */}
      <div className={styles.formGroup}>
        <label htmlFor="username" className={styles.label}>
          <AtSign size={14} />
          Nombre de usuario
        </label>
        <input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => handleFieldChange('username', e.target.value.toLowerCase())}
          className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
          placeholder="juanperez"
          disabled={isSubmitting}
        />
        {errors.username && (
          <span className={styles.errorText}>{errors.username}</span>
        )}
      </div>

      {/* Password */}
      <div className={styles.formGroup}>
        <label htmlFor="password" className={styles.label}>
          <Lock size={14} />
          Contraseña inicial
        </label>
        <div className={styles.passwordWrapper}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            className={`${styles.input} ${styles.passwordInput} ${errors.password ? styles.inputError : ''}`}
            placeholder="Mínimo 8 caracteres"
            disabled={isSubmitting}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <span className={styles.errorText}>{errors.password}</span>
        )}
        <span className={styles.helperText}>
          El usuario podrá cambiar su contraseña desde su configuración
        </span>
      </div>

      {/* Admin Switch */}
      <div className={styles.switchGroup}>
        <div className={styles.switchLabel}>
          <ShieldCheck size={16} className={styles.switchIcon} />
          <div>
            <span className={styles.switchTitle}>Permisos de Administrador</span>
            <span className={styles.switchDescription}>
              Permite gestionar usuarios, configuraciones y acceso total al sistema
            </span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={formData.isAdmin}
          className={`${styles.switch} ${formData.isAdmin ? styles.switchActive : ''}`}
          onClick={() => handleFieldChange('isAdmin', !formData.isAdmin)}
          disabled={isSubmitting}
        >
          <span className={styles.switchThumb} />
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        size="md"
        closeOnOverlayClick={false}
        showCloseButton={!isSubmitting}
      >
        {isMobile ? (
          // Mobile layout
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Crear Nuevo Usuario</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Completa el formulario para crear un nuevo usuario en el sistema
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <ResponsiveDialogBody>
              {formContent}
            </ResponsiveDialogBody>

            <ResponsiveDialogFooter>
              <DialogActions
                onCancel={handleCancel}
                onSubmit={handleSubmit}
                cancelText="Cancelar"
                submitText="Crear Usuario"
                isLoading={isSubmitting}
                submitVariant="primary"
              />
            </ResponsiveDialogFooter>
          </>
        ) : (
          // Desktop layout
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={styles.dialogInner}
              >
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>Crear Nuevo Usuario</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>
                    Completa el formulario para crear un nuevo usuario en el sistema
                  </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>

                <div className={styles.formContent}>
                  {formContent}
                </div>

                <DialogFooter>
                  <DialogActions
                    onCancel={handleCancel}
                    onSubmit={handleSubmit}
                    cancelText="Cancelar"
                    submitText="Crear Usuario"
                    isLoading={isSubmitting}
                    submitVariant="primary"
                  />
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
