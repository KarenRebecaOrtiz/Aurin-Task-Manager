/**
 * Chat Module - Hooks Index
 *
 * Exportaciones centralizadas de todos los hooks del módulo.
 * Basados en chatsidebarMODULARIZED con Optimistic UI.
 */

// Message hooks
export { useEncryption } from './useEncryption';
export { useMessagePagination } from './useMessagePagination';
export { useMessageActions } from './useMessageActions';
export { useScrollDetection } from './useScrollDetection';

// InputChat hooks
export { useRichEditor } from './useRichEditor';
export { useFileUpload } from './useFileUpload';
export { useEditorKeyboard } from './useEditorKeyboard';

// TODO: Agregar más hooks según se necesiten:
// - useMessageDrag (para drag-to-reply)
// - useGeminiSummary (para resúmenes AI)
