/**
 * Status Constants
 * Centralized status mappings and configurations for the tasks module
 */

/**
 * Status mapping for normalization
 * Maps various status variations to their canonical form
 */
export const STATUS_MAP: { [key: string]: string } = {
  'por iniciar': 'Por Iniciar',
  'por-iniciar': 'Por Iniciar',
  'pendiente': 'Por Iniciar',
  'pending': 'Por Iniciar',
  'to do': 'Por Iniciar',
  'todo': 'Por Iniciar',
  'en proceso': 'En Proceso',
  'en-proceso': 'En Proceso',
  'in progress': 'En Proceso',
  'progreso': 'En Proceso',
  'por finalizar': 'Por Finalizar',
  'por-finalizar': 'Por Finalizar',
  'to finish': 'Por Finalizar',
  'finalizado': 'Finalizado',
  'finalizada': 'Finalizado',
  'completed': 'Finalizado',
  'completado': 'Finalizado',
  'completada': 'Finalizado',
  'done': 'Finalizado',
  'terminado': 'Finalizado',
  'terminada': 'Finalizado',
  'finished': 'Finalizado',
  'backlog': 'Backlog',
  'cancelado': 'Cancelado',
  'cancelada': 'Cancelado',
  'cancelled': 'Cancelado',
  // Legacy status mapping
  'diseno': 'Por Iniciar',
  'diseño': 'Por Iniciar',
  'design': 'Por Iniciar',
  'desarrollo': 'En Proceso',
  'development': 'En Proceso',
  'dev': 'En Proceso',
};

/**
 * Default status when none is provided
 */
export const DEFAULT_STATUS = 'Por Iniciar';

/**
 * Status order for sorting and display
 */
export const STATUS_ORDER = [
  'Por Iniciar',
  'En Proceso',
  'En Revisión',
  'Por Finalizar',
  'Backlog',
  'Finalizado',
  'Archivado',
  'Cancelado'
];

/**
 * Kanban column definitions
 */
export const KANBAN_COLUMNS = [
  { id: 'por-iniciar', label: 'Por Iniciar' },
  { id: 'en-proceso', label: 'En Proceso' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'por-finalizar', label: 'Por Finalizar' },
  { id: 'finalizado', label: 'Finalizado' },
  { id: 'cancelado', label: 'Cancelado' },
];
