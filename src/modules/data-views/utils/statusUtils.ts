/**
 * Status Utilities
 * Shared utility functions for status normalization and manipulation
 */

import { STATUS_MAP, DEFAULT_STATUS } from '../constants/statusConstants';

/**
 * Normalizes a status string to its canonical form
 * Handles various status variations and legacy mappings
 *
 * @param status - The status string to normalize
 * @returns The normalized status string
 *
 * @example
 * normalizeStatus('en proceso') // 'En Proceso'
 * normalizeStatus('todo') // 'Por Iniciar'
 * normalizeStatus('') // 'Por Iniciar' (default)
 */
export const normalizeStatus = (status: string): string => {
  if (!status) return DEFAULT_STATUS;

  const normalized = status.trim();

  return STATUS_MAP[normalized.toLowerCase()] || normalized;
};

/**
 * Checks if a status is a valid canonical status
 *
 * @param status - The status string to check
 * @returns True if the status is valid, false otherwise
 */
export const isValidStatus = (status: string): boolean => {
  const validStatuses = [
    'Por Iniciar',
    'En Proceso',
    'En Revisión',
    'Por Finalizar',
    'Backlog',
    'Finalizado',
    'Archivado',
    'Cancelado'
  ];

  return validStatuses.includes(normalizeStatus(status));
};

/**
 * Converts a display status to a Kanban column ID
 *
 * @param status - The display status
 * @returns The column ID for Kanban boards
 *
 * @example
 * statusToColumnId('Por Iniciar') // 'por-iniciar'
 * statusToColumnId('En Proceso') // 'en-proceso'
 */
export const statusToColumnId = (status: string): string => {
  const normalized = normalizeStatus(status);
  return normalized.toLowerCase().replace(/\s+/g, '-');
};

/**
 * Converts a Kanban column ID to a display status
 *
 * @param columnId - The column ID
 * @returns The display status
 *
 * @example
 * columnIdToStatus('por-iniciar') // 'Por Iniciar'
 * columnIdToStatus('en-proceso') // 'En Proceso'
 */
export const columnIdToStatus = (columnId: string): string => {
  const parts = columnId.split('-');
  return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};
