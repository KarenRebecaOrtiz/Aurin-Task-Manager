/**
 * @module config/utils/validation
 * @description Funciones de validación para formularios de configuración
 */

import { FormErrors, PasswordValidationResult } from '../types';

/**
 * Valida un nombre completo
 */
export const validateFullName = (fullName?: string): string | undefined => {
  if (!fullName || fullName.trim() === '') {
    return 'El nombre es obligatorio';
  }
  return undefined;
};

/**
 * Valida un rol
 */
export const validateRole = (role?: string): string | undefined => {
  if (!role || role.trim() === '') {
    return 'El rol es obligatorio';
  }
  return undefined;
};

/**
 * Valida un número de teléfono (debe tener 10 dígitos)
 */
export const validatePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    return 'El teléfono debe tener 10 dígitos';
  }
  return undefined;
};

/**
 * Valida una fecha de nacimiento (formato DD/MM/AAAA)
 */
export const validateBirthDate = (birthDate?: string): string | undefined => {
  if (!birthDate) return undefined;
  
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
    return 'La fecha debe tener el formato DD/MM/AAAA';
  }
  return undefined;
};

/**
 * Valida una URL de portfolio (sin protocolo)
 */
export const validatePortfolio = (portfolio?: string): string | undefined => {
  if (!portfolio) return undefined;
  
  if (!/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(portfolio)) {
    return 'El portafolio debe ser una URL válida (sin https://)';
  }
  return undefined;
};

/**
 * Valida el tamaño de una imagen de perfil (máximo 5MB)
 */
export const validateProfilePhotoSize = (file?: File | null): string | undefined => {
  if (!file) return undefined;
  
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return 'La foto de perfil no debe exceder 5MB';
  }
  return undefined;
};

/**
 * Valida el tamaño de una imagen de portada (máximo 10MB)
 */
export const validateCoverPhotoSize = (file?: File | null): string | undefined => {
  if (!file) return undefined;
  
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return 'La foto de portada no debe exceder 10MB';
  }
  return undefined;
};

/**
 * Valida todos los campos del formulario de configuración
 */
export const validateConfigForm = (formData: {
  fullName?: string;
  role?: string;
  phone?: string;
  birthDate?: string;
  portfolio?: string;
  profilePhotoFile?: File | null;
  coverPhotoFile?: File | null;
}): FormErrors => {
  const errors: FormErrors = {};

  const fullNameError = validateFullName(formData.fullName);
  if (fullNameError) errors.fullName = fullNameError;

  const roleError = validateRole(formData.role);
  if (roleError) errors.role = roleError;

  const phoneError = validatePhone(formData.phone);
  if (phoneError) errors.phone = phoneError;

  const birthDateError = validateBirthDate(formData.birthDate);
  if (birthDateError) errors.birthDate = birthDateError;

  const portfolioError = validatePortfolio(formData.portfolio);
  if (portfolioError) errors.portfolio = portfolioError;

  const profilePhotoError = validateProfilePhotoSize(formData.profilePhotoFile);
  if (profilePhotoError) errors.profilePhoto = profilePhotoError;

  const coverPhotoError = validateCoverPhotoSize(formData.coverPhotoFile);
  if (coverPhotoError) errors.coverPhoto = coverPhotoError;

  return errors;
};

/**
 * Verifica si hay errores en el formulario
 */
export const hasFormErrors = (errors: FormErrors): boolean => {
  return Object.keys(errors).length > 0;
};

/**
 * Calcula la fuerza de una contraseña
 * Retorna un valor de 0 a 5 y una lista de errores
 */
export const calculatePasswordStrength = (password: string): PasswordValidationResult => {
  let strength = 0;
  const errors: string[] = [];

  // Longitud mínima de 8 caracteres
  if (password.length >= 8) {
    strength += 1;
  } else {
    errors.push('Debe tener al menos 8 caracteres');
  }

  // Debe incluir una mayúscula
  if (/[A-Z]/.test(password)) {
    strength += 1;
  } else {
    errors.push('Debe incluir una mayúscula');
  }

  // Debe incluir una minúscula
  if (/[a-z]/.test(password)) {
    strength += 1;
  } else {
    errors.push('Debe incluir una minúscula');
  }

  // Debe incluir un número
  if (/[0-9]/.test(password)) {
    strength += 1;
  } else {
    errors.push('Debe incluir un número');
  }

  // Debe incluir un carácter especial
  if (/[^A-Za-z0-9]/.test(password)) {
    strength += 1;
  } else {
    errors.push('Debe incluir un carácter especial');
  }

  return {
    isValid: strength >= 3,
    strength: Math.min(strength, 5),
    errors,
  };
};

/**
 * Valida que dos contraseñas coincidan
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): boolean => {
  return password === confirmPassword;
};

/**
 * Valida una contraseña completa (fuerza y coincidencia)
 */
export const validatePassword = (
  newPassword: string,
  confirmPassword: string
): PasswordValidationResult => {
  const strengthResult = calculatePasswordStrength(newPassword);
  const passwordsMatch = validatePasswordMatch(newPassword, confirmPassword);

  return {
    ...strengthResult,
    passwordsMatch,
  };
};

/**
 * Valida un email
 */
export const validateEmail = (email?: string): string | undefined => {
  if (!email) return undefined;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'El email no es válido';
  }
  return undefined;
};

/**
 * Valida una URL de red social
 */
export const validateSocialUrl = (url?: string, platform?: string): string | undefined => {
  if (!url) return undefined;
  
  // Permitir URLs sin protocolo
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  if (!urlPattern.test(url)) {
    return `La URL de ${platform || 'red social'} no es válida`;
  }
  return undefined;
};
