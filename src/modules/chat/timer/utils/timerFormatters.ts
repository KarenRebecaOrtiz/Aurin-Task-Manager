/**
 * Timer Module - Formatters
 *
 * Pure functions for formatting time values for display.
 * All functions are locale-aware and follow Spanish formatting conventions.
 *
 * @module timer/utils/formatters
 */

import type { Timestamp } from 'firebase/firestore';
import type { ParsedTime, TimerInterval } from '../types/timer.types';
import { DATE_FORMAT_OPTIONS, DATE_FORMAT_SHORT_OPTIONS } from './timerConstants';

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format seconds to HH:MM:SS string
 *
 * @param seconds - Total seconds
 * @returns Formatted time string (HH:MM:SS)
 *
 * @example
 * formatSecondsToHHMMSS(3665); // "01:01:05"
 * formatSecondsToHHMMSS(0); // "00:00:00"
 * formatSecondsToHHMMSS(86399); // "23:59:59"
 */
export function formatSecondsToHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format seconds to HH:MM string (no seconds)
 *
 * @param seconds - Total seconds
 * @returns Formatted time string (HH:MM)
 *
 * @example
 * formatSecondsToHHMM(3665); // "01:01"
 * formatSecondsToHHMM(3600); // "01:00"
 */
export function formatSecondsToHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Format seconds to hours with decimal places
 *
 * @param seconds - Total seconds
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted hours string
 *
 * @example
 * formatSecondsToHours(3600); // "1.00h"
 * formatSecondsToHours(5400); // "1.50h"
 * formatSecondsToHours(5400, 1); // "1.5h"
 */
export function formatSecondsToHours(seconds: number, decimals: number = 2): string {
  const hours = seconds / 3600;
  return `${hours.toFixed(decimals)}h`;
}

/**
 * Format decimal hours to human-readable format (e.g., "1h 30m")
 *
 * @param decimalHours - Hours as decimal number
 * @returns Formatted string with hours and minutes (always shows minutes)
 *
 * @example
 * formatDecimalHoursToReadable(1.5); // "1h 30m"
 * formatDecimalHoursToReadable(0.5); // "0h 30m"
 * formatDecimalHoursToReadable(2.75); // "2h 45m"
 * formatDecimalHoursToReadable(1.0); // "1h 0m"
 */
export function formatDecimalHoursToReadable(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  // Siempre mostrar minutos
  parts.push(`${minutes}m`);

  return parts.join(' ');
}

/**
 * Format seconds to human-readable string (e.g., "1h 30m")
 *
 * @param seconds - Total seconds
 * @param includeSeconds - Whether to include seconds (default: false)
 * @returns Formatted human-readable string
 *
 * @example
 * formatSecondsToReadable(3665); // "1h 1m"
 * formatSecondsToReadable(3665, true); // "1h 1m 5s"
 * formatSecondsToReadable(45); // "45s"
 * formatSecondsToReadable(0); // "0s"
 */
export function formatSecondsToReadable(seconds: number, includeSeconds: boolean = false): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];

  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if ((includeSeconds && s > 0) || (h === 0 && m === 0)) {
    parts.push(`${s}s`);
  }

  return parts.join(' ') || '0s';
}

/**
 * Format time input from hours and minutes
 *
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Formatted time string (HH:MM)
 *
 * @example
 * formatTimeInput(9, 5); // "09:05"
 * formatTimeInput(14, 30); // "14:30"
 */
export function formatTimeInput(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Parse time input string to hours and minutes
 *
 * @param timeString - Time string in HH:MM format
 * @returns Object with hours and minutes
 *
 * @example
 * parseTimeInput("09:05"); // { hours: 9, minutes: 5 }
 * parseTimeInput("14:30"); // { hours: 14, minutes: 30 }
 * parseTimeInput("invalid"); // { hours: 0, minutes: 0 }
 */
export function parseTimeInput(timeString: string): ParsedTime {
  const parts = timeString.split(':');

  if (parts.length !== 2) {
    return { hours: 0, minutes: 0 };
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return { hours: 0, minutes: 0 };
  }

  return {
    hours: Math.max(0, Math.min(23, hours)),
    minutes: Math.max(0, Math.min(59, minutes)),
  };
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date for display (long format)
 *
 * @param date - Date to format (can be Date or Timestamp)
 * @returns Formatted date string in Spanish
 *
 * @example
 * formatDateForDisplay(new Date('2025-01-15'));
 * // "15 de enero de 2025"
 */
export function formatDateForDisplay(date: Date | Timestamp): string {
  // Handle Firestore Timestamp objects
  if (date && typeof (date as any).toDate === 'function') {
    return (date as Timestamp).toDate().toLocaleDateString('es-MX', DATE_FORMAT_OPTIONS);
  }
  
  // Handle Date objects
  if (date instanceof Date) {
    return date.toLocaleDateString('es-MX', DATE_FORMAT_OPTIONS);
  }
  
  // Fallback for invalid input
  return 'Fecha inválida';
}

/**
 * Format date for display (short format)
 *
 * @param date - Date to format (can be Date or Timestamp)
 * @returns Formatted date string in Spanish (short)
 *
 * @example
 * formatDateShort(new Date('2025-01-15'));
 * // "15 ene 2025"
 */
export function formatDateShort(date: Date | Timestamp): string {
  // Handle Firestore Timestamp objects
  if (date && typeof (date as any).toDate === 'function') {
    return (date as Timestamp).toDate().toLocaleDateString('es-MX', DATE_FORMAT_SHORT_OPTIONS);
  }
  
  // Handle Date objects
  if (date instanceof Date) {
    return date.toLocaleDateString('es-MX', DATE_FORMAT_SHORT_OPTIONS);
  }
  
  // Fallback for invalid input
  return 'Fecha inválida';
}

/**
 * Format Firestore Timestamp for display
 *
 * @param timestamp - Firestore Timestamp
 * @returns Formatted date string
 *
 * @example
 * const ts = Timestamp.now();
 * formatTimestamp(ts); // "15 de enero de 2025"
 */
export function formatTimestamp(timestamp: Timestamp): string {
  return formatDateForDisplay(timestamp.toDate());
}

/**
 * Format Firestore Timestamp for short display
 *
 * @param timestamp - Firestore Timestamp
 * @returns Formatted date string (short)
 *
 * @example
 * const ts = Timestamp.now();
 * formatTimestampShort(ts); // "15 ene 2025"
 */
export function formatTimestampShort(timestamp: Timestamp): string {
  return formatDateShort(timestamp.toDate());
}

/**
 * Format date with time
 *
 * @param date - Date to format (can be Date or Timestamp)
 * @returns Formatted date and time string
 *
 * @example
 * formatDateWithTime(new Date('2025-01-15T14:30:00'));
 * // "15 de enero de 2025, 14:30"
 */
export function formatDateWithTime(date: Date | Timestamp): string {
  // Convert Timestamp to Date if needed
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (date && typeof (date as any).toDate === 'function') {
    dateObj = (date as Timestamp).toDate();
  } else {
    return 'Hora inválida';
  }
  
  const dateStr = formatDateForDisplay(dateObj);
  const timeStr = dateObj.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Format date range
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 *
 * @example
 * const start = new Date('2025-01-15');
 * const end = new Date('2025-01-20');
 * formatDateRange(start, end);
 * // "15 - 20 de enero de 2025"
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const month = endDate.toLocaleDateString('es-MX', {
    month: 'long',
    timeZone: 'America/Mexico_City',
  });
  const year = endDate.getFullYear();

  // Same month
  if (
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    return `${startDay} - ${endDay} de ${month} de ${year}`;
  }

  // Different months/years
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
}

/**
 * Format relative date (e.g., "Hoy", "Ayer", "Hace 2 días")
 *
 * @param date - Date to format
 * @returns Relative date string in Spanish
 *
 * @example
 * formatRelativeDate(new Date()); // "Hoy"
 * formatRelativeDate(new Date(Date.now() - 86400000)); // "Ayer"
 * formatRelativeDate(new Date(Date.now() - 2 * 86400000)); // "Hace 2 días"
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = today.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays === 2) return 'Anteayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;

  return formatDateShort(date);
}

// ============================================================================
// INTERVAL FORMATTING
// ============================================================================

/**
 * Format time interval with start and end times
 *
 * @param start - Start date
 * @param end - End date
 * @returns Formatted interval string
 *
 * @example
 * const start = new Date('2025-01-15T10:00:00');
 * const end = new Date('2025-01-15T11:30:00');
 * formatTimeInterval(start, end);
 * // "10:00 - 11:30 (1h 30m)"
 */
export function formatTimeInterval(start: Date, end: Date): string {
  const startTime = start.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });

  const endTime = end.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });

  const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  const duration = formatSecondsToReadable(durationSeconds);

  return `${startTime} - ${endTime} (${duration})`;
}

/**
 * Format interval with date if not today
 *
 * @param start - Start date
 * @param end - End date
 * @returns Formatted interval string with date if needed
 *
 * @example
 * const start = new Date('2025-01-14T10:00:00');
 * const end = new Date('2025-01-14T11:30:00');
 * formatIntervalWithDate(start, end);
 * // "14 ene 2025: 10:00 - 11:30 (1h 30m)"
 */
export function formatIntervalWithDate(start: Date, end: Date): string {
  const today = new Date();
  const isToday =
    start.getDate() === today.getDate() &&
    start.getMonth() === today.getMonth() &&
    start.getFullYear() === today.getFullYear();

  const interval = formatTimeInterval(start, end);

  if (isToday) {
    return `Hoy: ${interval}`;
  }

  const relativeDate = formatRelativeDate(start);
  return `${relativeDate}: ${interval}`;
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format number with leading zeros
 *
 * @param value - Number to format
 * @param length - Total length including zeros (default: 2)
 * @returns Formatted string with leading zeros
 *
 * @example
 * formatWithLeadingZeros(5); // "05"
 * formatWithLeadingZeros(15); // "15"
 * formatWithLeadingZeros(5, 3); // "005"
 */
export function formatWithLeadingZeros(value: number, length: number = 2): string {
  return String(value).padStart(length, '0');
}

/**
 * Format decimal number for display
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 *
 * @example
 * formatDecimal(1.5); // "1.50"
 * formatDecimal(1.5, 1); // "1.5"
 * formatDecimal(1.567, 2); // "1.57"
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format percentage
 *
 * @param value - Value between 0 and 1
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.75); // "75%"
 * formatPercentage(0.756, 1); // "75.6%"
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// ============================================================================
// INTERVAL HELPERS
// ============================================================================

/**
 * Ensure interval dates are Date objects (not Timestamps)
 * Defensive conversion for intervals that might have Timestamps
 *
 * @param interval - Timer interval that might have Timestamp objects
 * @returns Timer interval with guaranteed Date objects
 */
export function ensureIntervalDates(interval: any): TimerInterval {
  const start = interval?.start instanceof Date 
    ? interval.start 
    : interval?.start?.toDate?.() || new Date();
    
  const end = interval?.end instanceof Date 
    ? interval.end 
    : interval?.end?.toDate?.() || new Date();
    
  return {
    start,
    end,
    duration: interval?.duration || 0,
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if time string is valid HH:MM format
 *
 * @param timeString - Time string to validate
 * @returns True if valid HH:MM format
 *
 * @example
 * isValidTimeFormat("14:30"); // true
 * isValidTimeFormat("25:30"); // false
 * isValidTimeFormat("14:70"); // false
 */
export function isValidTimeFormat(timeString: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
}

/**
 * Sanitize time input string
 *
 * @param input - Input string
 * @returns Sanitized time string or empty string if invalid
 *
 * @example
 * sanitizeTimeInput("9:5"); // "09:05"
 * sanitizeTimeInput("14:30"); // "14:30"
 * sanitizeTimeInput("invalid"); // ""
 */
export function sanitizeTimeInput(input: string): string {
  const parsed = parseTimeInput(input);
  if (parsed.hours === 0 && parsed.minutes === 0 && input !== '00:00') {
    return '';
  }
  return formatTimeInput(parsed.hours, parsed.minutes);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TimerFormatters = {
  // Time formatting
  formatSecondsToHHMMSS,
  formatSecondsToHHMM,
  formatSecondsToHours,
  formatSecondsToReadable,
  formatTimeInput,
  parseTimeInput,

  // Date formatting
  formatDateForDisplay,
  formatDateShort,
  formatTimestamp,
  formatTimestampShort,
  formatDateWithTime,
  formatDateRange,
  formatRelativeDate,

  // Interval formatting
  formatTimeInterval,
  formatIntervalWithDate,

  // Number formatting
  formatWithLeadingZeros,
  formatDecimal,
  formatPercentage,

  // Validation
  isValidTimeFormat,
  sanitizeTimeInput,
} as const;
