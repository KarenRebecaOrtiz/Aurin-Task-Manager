/**
 * Priority Constants
 * Centralized priority configurations for the tasks module
 */

/**
 * Priority order for sorting (high to low)
 */
export const PRIORITY_ORDER = ['Alta', 'Media', 'Baja'];

/**
 * Priority colors for UI display
 */
export const PRIORITY_COLORS: { [key: string]: string } = {
  Alta: '#ef4444',   // red-500
  Media: '#f59e0b',  // amber-500
  Baja: '#10b981',   // green-500
};

/**
 * Priority labels in different languages
 */
export const PRIORITY_LABELS: { [key: string]: { es: string; en: string } } = {
  Alta: { es: 'Alta', en: 'High' },
  Media: { es: 'Media', en: 'Medium' },
  Baja: { es: 'Baja', en: 'Low' },
};
