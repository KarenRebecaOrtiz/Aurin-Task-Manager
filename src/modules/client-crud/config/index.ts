/**
 * Client CRUD Configuration
 * Centralized constants and configuration
 */

export const PLACEHOLDERS = {
  NAME: 'Ej. Clínica Azul, Tienda Koala',
  EMAIL: 'contacto@empresa.com',
  PHONE: '+52 123 456 7890',
  WEBSITE: 'https://www.empresa.com',
  ADDRESS: 'Calle, Número, Colonia, Ciudad',
  INDUSTRY: 'Ej. Salud, Retail, Tecnología',
  TAX_ID: 'Ej. ABC123456XYZ',
  NOTES: 'Información adicional sobre el cliente...',
  PROJECT: 'Nombre del proyecto',
} as const;

export const TOAST_MESSAGES = {
  SESSION_EXPIRED: {
    title: 'Sesión expirada',
    description: 'Por favor, inicia sesión nuevamente.',
    variant: 'error' as const,
  },
  INVALID_IMAGE: {
    title: 'Formato inválido',
    description: 'Por favor, selecciona un archivo de imagen válido (jpg, jpeg, png, gif).',
    variant: 'error' as const,
  },
  REQUIRED_NAME: {
    title: 'Campo requerido',
    description: 'Por favor, ingresa el nombre del cliente.',
    variant: 'error' as const,
  },
} as const;

export const UI_CONSTANTS = {
  TOTAL_STEPS: 3,
  IMAGE_PREVIEW_DEFAULT: '/empty-image.png',
  VALID_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
} as const;

export const INDUSTRIES = [
  'Salud',
  'Retail',
  'Tecnología',
  'Educación',
  'Finanzas',
  'Manufactura',
  'Servicios',
  'Construcción',
  'Alimentos y Bebidas',
  'Transporte',
  'Entretenimiento',
  'Otro',
] as const;
