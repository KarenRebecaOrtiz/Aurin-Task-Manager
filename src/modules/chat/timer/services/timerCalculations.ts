/**
 * Timer Module - Calculations Service
 *
 * Pure functions for timer calculations (no side effects).
 * All functions are deterministic and testable.
 *
 * @module timer/services/calculations
 */

import type { TimerInterval } from '../types/timer.types';
import { MAX_REASONABLE_TIME_SECONDS } from '../utils/timerConstants';

// ============================================================================
// TIME CALCULATIONS
// ============================================================================

/**
 * Calculate elapsed seconds between two dates
 *
 * @param startTime - Start time
 * @param currentTime - Current time
 * @returns Elapsed seconds (always non-negative)
 *
 * @example
 * const start = new Date('2025-01-01T10:00:00');
 * const end = new Date('2025-01-01T10:05:30');
 * const elapsed = calculateElapsedSeconds(start, end);
 * console.log(elapsed); // 330 (5 minutes and 30 seconds)
 */
export function calculateElapsedSeconds(startTime: Date, currentTime: Date): number {
  const diffMs = currentTime.getTime() - startTime.getTime();
  const seconds = Math.floor(diffMs / 1000);
  return Math.max(0, seconds);
}

/**
 * Calculate total seconds from an array of intervals
 *
 * @param intervals - Array of timer intervals
 * @returns Total seconds across all intervals
 *
 * @example
 * const intervals = [
 *   { start: new Date(), end: new Date(), duration: 300 },
 *   { start: new Date(), end: new Date(), duration: 600 }
 * ];
 * const total = calculateTotalFromIntervals(intervals);
 * console.log(total); // 900 (15 minutes)
 */
export function calculateTotalFromIntervals(intervals: TimerInterval[]): number {
  return intervals.reduce((total, interval) => total + interval.duration, 0);
}

/**
 * Aggregate overlapping or consecutive intervals into merged intervals
 * Sorts intervals by start time and merges those that overlap or are adjacent
 *
 * @param intervals - Array of timer intervals
 * @returns Aggregated array of merged intervals
 *
 * @example
 * const intervals = [
 *   { start: new Date('2025-01-01T10:00:00'), end: new Date('2025-01-01T10:15:00'), duration: 900 },
 *   { start: new Date('2025-01-01T10:15:00'), end: new Date('2025-01-01T10:30:00'), duration: 900 }
 * ];
 * const merged = aggregateIntervals(intervals);
 * // Result: Single interval from 10:00 to 10:30 with duration 1800
 */
export function aggregateIntervals(intervals: TimerInterval[]): TimerInterval[] {
  if (intervals.length === 0) return [];
  if (intervals.length === 1) return [...intervals];

  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: TimerInterval[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Check if current and next overlap or are adjacent (within 1 second)
    const gap = next.start.getTime() - current.end.getTime();

    if (gap <= 1000) {
      // Merge intervals
      current.end = new Date(Math.max(current.end.getTime(), next.end.getTime()));
      current.duration = calculateElapsedSeconds(current.start, current.end);
    } else {
      // No overlap, push current and start new
      merged.push(current);
      current = { ...next };
    }
  }

  // Push the last interval
  merged.push(current);

  return merged;
}

/**
 * Check if a time duration is reasonable (not stuck or orphaned)
 *
 * @param seconds - Duration in seconds
 * @returns True if the duration is reasonable (0 to 24 hours)
 *
 * @example
 * isTimeReasonable(3600); // true (1 hour)
 * isTimeReasonable(100000); // false (>24 hours)
 * isTimeReasonable(-100); // false (negative)
 */
export function isTimeReasonable(seconds: number): boolean {
  return seconds >= 0 && seconds <= MAX_REASONABLE_TIME_SECONDS;
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert seconds to hours (decimal)
 *
 * @param seconds - Duration in seconds
 * @returns Duration in hours (decimal)
 *
 * @example
 * convertSecondsToHours(3600); // 1.0
 * convertSecondsToHours(5400); // 1.5 (1 hour 30 minutes)
 */
export function convertSecondsToHours(seconds: number): number {
  return seconds / 3600;
}

/**
 * Convert hours (decimal) to seconds
 *
 * @param hours - Duration in hours
 * @returns Duration in seconds (rounded)
 *
 * @example
 * convertHoursToSeconds(1.5); // 5400 (1 hour 30 minutes)
 * convertHoursToSeconds(0.25); // 900 (15 minutes)
 */
export function convertHoursToSeconds(hours: number): number {
  return Math.floor(hours * 3600);
}

/**
 * Convert seconds to minutes
 *
 * @param seconds - Duration in seconds
 * @returns Duration in minutes (decimal)
 *
 * @example
 * convertSecondsToMinutes(90); // 1.5
 * convertSecondsToMinutes(3600); // 60
 */
export function convertSecondsToMinutes(seconds: number): number {
  return seconds / 60;
}

/**
 * Convert minutes to seconds
 *
 * @param minutes - Duration in minutes
 * @returns Duration in seconds (rounded)
 *
 * @example
 * convertMinutesToSeconds(1.5); // 90
 * convertMinutesToSeconds(60); // 3600
 */
export function convertMinutesToSeconds(minutes: number): number {
  return Math.floor(minutes * 60);
}

// ============================================================================
// TIME COMPONENT EXTRACTION
// ============================================================================

/**
 * Extract hours, minutes, and seconds from total seconds
 *
 * @param totalSeconds - Total duration in seconds
 * @returns Object with hours, minutes, and seconds components
 *
 * @example
 * extractTimeComponents(3665);
 * // Returns: { hours: 1, minutes: 1, seconds: 5 }
 */
export function extractTimeComponents(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}

/**
 * Calculate time components from two dates
 *
 * @param startTime - Start time
 * @param endTime - End time
 * @returns Object with hours, minutes, seconds, and total seconds
 *
 * @example
 * const start = new Date('2025-01-01T10:00:00');
 * const end = new Date('2025-01-01T11:30:45');
 * const components = calculateTimeComponentsFromDates(start, end);
 * // Returns: { hours: 1, minutes: 30, seconds: 45, totalSeconds: 5445 }
 */
export function calculateTimeComponentsFromDates(
  startTime: Date,
  endTime: Date
): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const totalSeconds = calculateElapsedSeconds(startTime, endTime);
  const components = extractTimeComponents(totalSeconds);

  return {
    ...components,
    totalSeconds,
  };
}

// ============================================================================
// INTERVAL UTILITIES
// ============================================================================

/**
 * Create a timer interval from start and end dates
 *
 * @param start - Interval start time
 * @param end - Interval end time
 * @returns Timer interval with calculated duration
 *
 * @example
 * const start = new Date('2025-01-01T10:00:00');
 * const end = new Date('2025-01-01T10:15:00');
 * const interval = createInterval(start, end);
 * // Returns: { start, end, duration: 900 }
 */
export function createInterval(start: Date, end: Date): TimerInterval {
  return {
    start,
    end,
    duration: calculateElapsedSeconds(start, end),
  };
}

/**
 * Check if an interval is valid (end >= start, reasonable duration)
 *
 * @param interval - Timer interval to validate
 * @returns True if the interval is valid
 *
 * @example
 * const valid = { start: new Date(), end: new Date(Date.now() + 1000), duration: 1 };
 * isValidInterval(valid); // true
 *
 * const invalid = { start: new Date(), end: new Date(Date.now() - 1000), duration: -1 };
 * isValidInterval(invalid); // false
 */
export function isValidInterval(interval: TimerInterval): boolean {
  const { start, end, duration } = interval;

  // Check if end is after start
  if (end.getTime() < start.getTime()) {
    return false;
  }

  // Check if duration matches the difference
  const calculatedDuration = calculateElapsedSeconds(start, end);
  if (Math.abs(calculatedDuration - duration) > 1) {
    // Allow 1 second tolerance
    return false;
  }

  // Check if duration is reasonable
  return isTimeReasonable(duration);
}

/**
 * Filter out invalid intervals from an array
 *
 * @param intervals - Array of timer intervals
 * @returns Array containing only valid intervals
 *
 * @example
 * const intervals = [valid1, invalid1, valid2];
 * const filtered = filterValidIntervals(intervals);
 * // Returns only valid1 and valid2
 */
export function filterValidIntervals(intervals: TimerInterval[]): TimerInterval[] {
  return intervals.filter(isValidInterval);
}

// ============================================================================
// STATISTICAL CALCULATIONS
// ============================================================================

/**
 * Calculate average interval duration
 *
 * @param intervals - Array of timer intervals
 * @returns Average duration in seconds, or 0 if no intervals
 *
 * @example
 * const intervals = [
 *   { start: new Date(), end: new Date(), duration: 300 },
 *   { start: new Date(), end: new Date(), duration: 600 }
 * ];
 * const avg = calculateAverageIntervalDuration(intervals);
 * console.log(avg); // 450 (7.5 minutes)
 */
export function calculateAverageIntervalDuration(intervals: TimerInterval[]): number {
  if (intervals.length === 0) return 0;

  const total = calculateTotalFromIntervals(intervals);
  return Math.floor(total / intervals.length);
}

/**
 * Find the longest interval
 *
 * @param intervals - Array of timer intervals
 * @returns Longest interval, or null if array is empty
 *
 * @example
 * const intervals = [
 *   { start: new Date(), end: new Date(), duration: 300 },
 *   { start: new Date(), end: new Date(), duration: 600 }
 * ];
 * const longest = findLongestInterval(intervals);
 * console.log(longest?.duration); // 600
 */
export function findLongestInterval(intervals: TimerInterval[]): TimerInterval | null {
  if (intervals.length === 0) return null;

  return intervals.reduce((longest, current) =>
    current.duration > longest.duration ? current : longest
  );
}

/**
 * Find the shortest interval
 *
 * @param intervals - Array of timer intervals
 * @returns Shortest interval, or null if array is empty
 *
 * @example
 * const intervals = [
 *   { start: new Date(), end: new Date(), duration: 300 },
 *   { start: new Date(), end: new Date(), duration: 600 }
 * ];
 * const shortest = findShortestInterval(intervals);
 * console.log(shortest?.duration); // 300
 */
export function findShortestInterval(intervals: TimerInterval[]): TimerInterval | null {
  if (intervals.length === 0) return null;

  return intervals.reduce((shortest, current) =>
    current.duration < shortest.duration ? current : shortest
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TimerCalculations = {
  // Core calculations
  calculateElapsedSeconds,
  calculateTotalFromIntervals,
  aggregateIntervals,
  isTimeReasonable,

  // Conversions
  convertSecondsToHours,
  convertHoursToSeconds,
  convertSecondsToMinutes,
  convertMinutesToSeconds,

  // Component extraction
  extractTimeComponents,
  calculateTimeComponentsFromDates,

  // Interval utilities
  createInterval,
  isValidInterval,
  filterValidIntervals,

  // Statistics
  calculateAverageIntervalDuration,
  findLongestInterval,
  findShortestInterval,
} as const;
