/**
 * Audio Recorder Hook - Shared between chat and n8n-chatbot
 * 
 * Reutilizado desde n8n-chatbot para mantener DRY
 * @module chat/hooks/useAudioRecorder
 */

// Re-export desde n8n-chatbot para reutilizar la misma implementación
export { useAudioRecorder } from '@/modules/n8n-chatbot/hooks/useAudioRecorder'
export type { UseAudioRecorderOptions, UseAudioRecorderReturn } from '@/modules/n8n-chatbot/hooks/useAudioRecorder'
