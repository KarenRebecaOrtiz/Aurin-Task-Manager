import type { Message } from '../types'

export const FILE_CONSTRAINTS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain"
  ]
}

export const STORAGE_KEYS = {
  SESSION_ID: 'n8n_chatbot_session_id',
  MESSAGES: 'n8n_chatbot_messages',
  LAST_ACTIVITY: 'n8n_chatbot_last_activity'
}

export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours

// Default translations (Spanish)
export const DEFAULT_TRANSLATIONS = {
  welcome: "¡Hola! 👋 Soy tu asistente de tareas. Puedo ayudarte a crear, editar y consultar tus tareas. ¿En qué puedo ayudarte hoy?",
  title: "Asistente IA",
  online: "En línea",
  offline: "Sin conexión",
  openChat: "Abrir chat",
  minimizeChat: "Minimizar chat",
  placeholder: "Escribe un mensaje...",
  send: "Enviar mensaje",
  attach: "Adjuntar archivo",
  removeFile: "Remover archivo",
  dragFiles: "Suelta los archivos aquí",
  maxSize: "Máx 10MB",
  noConnection: "No hay conexión a internet. Verifica tu conexión e intenta nuevamente.",
  errorGeneric: "Lo siento, hubo un error. Por favor intenta de nuevo.",
  errorResponse: "Lo siento, hubo un problema al procesar tu solicitud.",
  errorProcess: "Lo siento, no pude procesar tu mensaje",
  avatarAlt: "Avatar del asistente",
  botAvatarAlt: "Avatar del bot"
}
