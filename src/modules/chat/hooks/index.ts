/**
 * Chat Module - Hooks Index
 *
 * Exportaciones centralizadas de todos los hooks del módulo.
 * Basados en chatsidebarMODULARIZED con Optimistic UI.
 */

export { useEncryption } from './useEncryption';
export { useMessagePagination } from './useMessagePagination';
export { useMessageActions } from './useMessageActions';
export { useScrollDetection } from './useScrollDetection';

// TODO: Agregar más hooks según se necesiten:
// - useMessageDrag (para drag-to-reply)
// - useGeminiSummary (para resúmenes AI)
// - useTimerPanel (para el panel de timer)
