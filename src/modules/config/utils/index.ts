/**
 * @module config/utils
 * @description Exportaciones centralizadas de todas las utilidades del módulo de configuración
 */

// Validación
export {
  validateFullName,
  validateRole,
  validatePhone,
  validateBirthDate,
  validatePortfolio,
  validateProfilePhotoSize,
  validateCoverPhotoSize,
  validateConfigForm,
  hasFormErrors,
  calculatePasswordStrength,
  validatePasswordMatch,
  validatePassword,
  validateEmail,
  validateSocialUrl,
} from './validation';

// Formateo
export {
  formatPhoneNumber,
  cleanPhoneNumber,
  formatDate,
  parseDate,
  formatUrl,
  removeProtocol,
  formatFullName,
  truncateText,
  formatFileSize,
  formatCountryCode,
  formatFullPhoneNumber,
  extractCountryCode,
  extractPhoneNumber,
  formatStackDisplay,
  formatTeamsDisplay,
  normalizeForSearch,
  formatRelativeTime,
} from './formatters';

// Procesamiento de imágenes
export {
  validateImageFile,
  uploadProfileImage,
  uploadCoverImage,
  deleteImageFromGCS,
  extractFilePathFromUrl,
  isClerkImage,
  isDefaultImage,
  createImagePreview,
  resizeImage,
  compressImageIfNeeded,
  IMAGE_SIZE_LIMITS,
  ALLOWED_IMAGE_FORMATS,
} from './imageProcessing';

export type { ImageType } from './imageProcessing';

// Helpers de formulario
export {
  handleFormInputKeyDown,
  handleNumericInput,
  handleAlphaInput,
  handleAlphanumericInput,
  preventFormSubmitOnEnter,
  handleCheckboxChange,
  handleSelectChange,
  cleanFormData,
  hasFormChanged,
  resetForm,
  getChangedFields,
  debounce,
  throttle,
} from './formHelpers';
