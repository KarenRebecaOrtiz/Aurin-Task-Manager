/**
 * @module config/utils/formatters
 * @description Funciones de formateo de datos para configuración
 */

/**
 * Formatea un número de teléfono con guiones
 * Ejemplo: 5551234567 -> 555-123-4567
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Limpia un número de teléfono (solo dígitos)
 */
export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Formatea una fecha en formato DD/MM/AAAA
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Parsea una fecha en formato DD/MM/AAAA a Date
 */
export const parseDate = (dateString: string): Date | null => {
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  // Validar que la fecha sea válida
  if (
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }
  
  return date;
};

/**
 * Formatea una URL agregando protocolo si no lo tiene
 */
export const formatUrl = (url: string, addProtocol = true): string => {
  if (!url) return '';
  
  const trimmed = url.trim();
  
  if (addProtocol && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
};

/**
 * Remueve el protocolo de una URL
 */
export const removeProtocol = (url: string): string => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '');
};

/**
 * Formatea un nombre completo (capitaliza cada palabra)
 */
export const formatFullName = (name: string): string => {
  if (!name) return '';
  
  return name
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Trunca un texto a una longitud máxima
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Formatea un tamaño de archivo en bytes a formato legible
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Formatea un código de país con el símbolo +
 */
export const formatCountryCode = (code: string): string => {
  if (!code) return '+52'; // Default México
  return code.startsWith('+') ? code : `+${code}`;
};

/**
 * Formatea un teléfono completo con código de país
 */
export const formatFullPhoneNumber = (countryCode: string, phone: string): string => {
  const formattedCode = formatCountryCode(countryCode);
  const cleanedPhone = cleanPhoneNumber(phone);
  return `${formattedCode} ${cleanedPhone}`;
};

/**
 * Extrae el código de país de un teléfono completo
 */
export const extractCountryCode = (fullPhone: string): string => {
  if (!fullPhone) return '+52';
  
  const match = fullPhone.match(/^\+\d+/);
  return match ? match[0] : '+52';
};

/**
 * Extrae el número de teléfono sin código de país
 */
export const extractPhoneNumber = (fullPhone: string): string => {
  if (!fullPhone) return '';
  
  return fullPhone.replace(/^\+\d+\s*/, '').replace(/\D/g, '');
};

/**
 * Formatea un stack de tecnologías para mostrar
 */
export const formatStackDisplay = (stack: string[], maxItems = 5): string => {
  if (!stack || stack.length === 0) return 'Sin tecnologías';
  
  if (stack.length <= maxItems) {
    return stack.join(', ');
  }
  
  const visible = stack.slice(0, maxItems);
  const remaining = stack.length - maxItems;
  return `${visible.join(', ')} +${remaining} más`;
};

/**
 * Formatea una lista de equipos para mostrar
 */
export const formatTeamsDisplay = (teams: string[]): string => {
  if (!teams || teams.length === 0) return 'Sin equipos';
  return teams.join(', ');
};

/**
 * Normaliza un string para búsqueda (sin acentos, minúsculas)
 */
export const normalizeForSearch = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Formatea una fecha relativa (hace X tiempo)
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
  if (diffHour < 24) return `Hace ${diffHour} hora${diffHour !== 1 ? 's' : ''}`;
  if (diffDay < 7) return `Hace ${diffDay} día${diffDay !== 1 ? 's' : ''}`;
  
  return formatDate(d);
};
