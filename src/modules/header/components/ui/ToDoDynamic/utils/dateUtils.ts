/**
 * Date Utilities
 * Helper functions for date operations
 */

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * @returns Today's date as ISO string
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if a date is today
 * @param dateString - Date string in ISO format
 * @returns true if the date is today
 */
export const isToday = (dateString: string | undefined): boolean => {
  if (!dateString) return false;
  return dateString === getTodayDate();
};

/**
 * Format date for display
 * @param dateString - Date string in ISO format
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
