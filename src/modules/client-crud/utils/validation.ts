/**
 * @module client-crud/utils/validation
 * @description Funciones de validación para formularios de cliente
 *
 * Incluye validaciones para:
 * - RFC Mexicano (Persona Física y Moral)
 * - Email
 * - Teléfono (con código de país estructurado)
 * - URL de sitio web
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Structured phone number with country code
 * Compatible with PhoneNumberInput component
 */
export interface PhoneNumber {
  /** ISO country code (e.g., "MX", "US") */
  country: string;
  /** Phone number without country code */
  number: string;
}

/**
 * Mexican RFC (Registro Federal de Contribuyentes) structure
 */
export interface RFCData {
  /** Full RFC string */
  value: string;
  /** Type of taxpayer */
  type: 'persona_fisica' | 'persona_moral';
  /** Whether the RFC is valid */
  isValid: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * RFC Patterns:
 * - Persona Física (Individual): 4 letters + 6 digits (birthdate YYMMDD) + 3 alphanumeric (homoclave)
 *   Example: RODR850101ABC (13 characters)
 * - Persona Moral (Company): 3 letters + 6 digits + 3 alphanumeric
 *   Example: ABC850101XY9 (12 characters)
 */
const RFC_PATTERNS = {
  // Persona Física: 4 letters (including Ñ and &) + 6 digits + 3 alphanumeric
  PERSONA_FISICA: /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i,
  // Persona Moral: 3 letters + 6 digits + 3 alphanumeric
  PERSONA_MORAL: /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/i,
  // Generic RFC (either type)
  GENERIC: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const URL_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a Mexican RFC (Tax ID)
 * @param rfc - The RFC string to validate
 * @returns Validation result with error message if invalid
 */
export function validateRFC(rfc?: string): { isValid: boolean; error?: string; type?: 'persona_fisica' | 'persona_moral' } {
  if (!rfc || rfc.trim() === '') {
    return { isValid: true }; // RFC is optional
  }

  const cleanRFC = rfc.trim().toUpperCase();

  // Check length first
  if (cleanRFC.length !== 12 && cleanRFC.length !== 13) {
    return {
      isValid: false,
      error: 'El RFC debe tener 12 caracteres (empresa) o 13 caracteres (persona física)'
    };
  }

  // Check pattern
  if (cleanRFC.length === 13 && RFC_PATTERNS.PERSONA_FISICA.test(cleanRFC)) {
    return { isValid: true, type: 'persona_fisica' };
  }

  if (cleanRFC.length === 12 && RFC_PATTERNS.PERSONA_MORAL.test(cleanRFC)) {
    return { isValid: true, type: 'persona_moral' };
  }

  return {
    isValid: false,
    error: 'Formato de RFC inválido. Debe contener letras, fecha y homoclave'
  };
}

/**
 * Validates an email address
 * @param email - The email to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmail(email?: string): string | undefined {
  if (!email || email.trim() === '') {
    return undefined; // Email is optional
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'El email no tiene un formato válido';
  }

  return undefined;
}

/**
 * Validates a website URL
 * @param url - The URL to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateWebsite(url?: string): string | undefined {
  if (!url || url.trim() === '') {
    return undefined; // Website is optional
  }

  if (!URL_PATTERN.test(url)) {
    return 'La URL no es válida';
  }

  return undefined;
}

/**
 * Validates a structured phone number
 * Uses basic validation - for full validation use PhoneNumberInput component
 * @param phone - The phone number object or string
 * @returns Error message if invalid, undefined if valid
 */
export function validatePhone(phone?: PhoneNumber | string): string | undefined {
  if (!phone) {
    return undefined; // Phone is optional
  }

  // Handle string (legacy format)
  if (typeof phone === 'string') {
    if (phone.trim() === '') return undefined;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return 'El número de teléfono no es válido';
    }
    return undefined;
  }

  // Handle structured phone
  if (!phone.number || phone.number.trim() === '') {
    return undefined; // Empty phone is valid (optional field)
  }

  const digits = phone.number.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return 'El número de teléfono no es válido';
  }

  return undefined;
}

/**
 * Validates a client name
 * @param name - The client name
 * @returns Error message if invalid, undefined if valid
 */
export function validateClientName(name?: string): string | undefined {
  if (!name || name.trim() === '') {
    return 'El nombre del cliente es obligatorio';
  }

  if (name.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres';
  }

  return undefined;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats an RFC to uppercase and removes spaces
 * @param rfc - The RFC to format
 * @returns Formatted RFC
 */
export function formatRFC(rfc: string): string {
  return rfc.trim().toUpperCase().replace(/\s/g, '');
}

/**
 * Parses a phone string into structured PhoneNumber
 * Attempts to detect country code from the string
 * @param phoneString - Raw phone string (e.g., "+52 555 123 4567" or "555-123-4567")
 * @param defaultCountry - Default country code if not detected
 * @returns Structured phone number
 */
export function parsePhoneString(phoneString: string, defaultCountry: string = 'MX'): PhoneNumber {
  if (!phoneString) {
    return { country: defaultCountry, number: '' };
  }

  const cleaned = phoneString.trim();

  // Check for country code prefix
  if (cleaned.startsWith('+')) {
    // Common country codes
    const countryPrefixes: Record<string, string> = {
      '+1': 'US',
      '+52': 'MX',
      '+54': 'AR',
      '+55': 'BR',
      '+56': 'CL',
      '+57': 'CO',
      '+34': 'ES',
      '+44': 'GB',
      '+49': 'DE',
      '+33': 'FR',
    };

    for (const [prefix, country] of Object.entries(countryPrefixes)) {
      if (cleaned.startsWith(prefix)) {
        return {
          country,
          number: cleaned.slice(prefix.length).replace(/\D/g, ''),
        };
      }
    }
  }

  // No country code detected, use default
  return {
    country: defaultCountry,
    number: cleaned.replace(/\D/g, ''),
  };
}

/**
 * Converts a structured PhoneNumber back to a display string
 * @param phone - Structured phone number
 * @returns Formatted phone string for display
 */
export function formatPhoneForDisplay(phone: PhoneNumber): string {
  if (!phone.number) return '';

  const countryCodes: Record<string, string> = {
    'US': '+1',
    'MX': '+52',
    'AR': '+54',
    'BR': '+55',
    'CL': '+56',
    'CO': '+57',
    'ES': '+34',
    'GB': '+44',
    'DE': '+49',
    'FR': '+33',
  };

  const prefix = countryCodes[phone.country] || '';
  return prefix ? `${prefix} ${phone.number}` : phone.number;
}

/**
 * Converts a structured PhoneNumber to a storage string
 * @param phone - Structured phone number
 * @returns Phone string for storage (without formatting)
 */
export function phoneToStorageString(phone: PhoneNumber): string {
  if (!phone.number) return '';
  return `${phone.country}:${phone.number}`;
}

/**
 * Parses a storage string back to PhoneNumber
 * @param storageString - Phone string from storage
 * @returns Structured phone number
 */
export function storageStringToPhone(storageString: string): PhoneNumber {
  if (!storageString) return { country: 'MX', number: '' };

  const parts = storageString.split(':');
  if (parts.length === 2) {
    return { country: parts[0], number: parts[1] };
  }

  // Legacy format - just digits
  return parsePhoneString(storageString);
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

export interface ClientValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
}

/**
 * Validates all client form fields
 * @param data - Form data object
 * @returns Object with field errors
 */
export function validateClientForm(data: {
  name?: string;
  email?: string;
  phone?: PhoneNumber | string;
  website?: string;
  taxId?: string;
}): ClientValidationErrors {
  const errors: ClientValidationErrors = {};

  const nameError = validateClientName(data.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(data.phone);
  if (phoneError) errors.phone = phoneError;

  const websiteError = validateWebsite(data.website);
  if (websiteError) errors.website = websiteError;

  const rfcResult = validateRFC(data.taxId);
  if (!rfcResult.isValid && rfcResult.error) {
    errors.taxId = rfcResult.error;
  }

  return errors;
}

/**
 * Checks if the validation result has any errors
 * @param errors - Validation errors object
 * @returns true if there are errors
 */
export function hasValidationErrors(errors: ClientValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
