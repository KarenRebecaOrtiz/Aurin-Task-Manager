/**
 * Chat Module - Utilities
 * 
 * Funciones helper y utilidades para el módulo de chat.
 */

import type { Message, MessageGroup } from '../types';

/**
 * Convierte markdown a HTML
 * Usado para renderizar mensajes con formato
 */
export const markdownToHtml = (markdown: string): string => {
  return markdown
    // Títulos
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Negritas y cursivas
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Listas
    .replace(/^• (.*$)/gim, '<li>$1</li>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    
    // Envolver listas en <ul>
    .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
    
    // Saltos de línea
    .replace(/\n/g, '<br/>')
    
    // Párrafos
    .replace(/(<br\/>)+/g, '</p><p>')
    .replace(/^(.*)$/gm, '<p>$1</p>')
    
    // Limpiar párrafos vacíos
    .replace(/<p><\/p>/g, '')
    .replace(/<p><br\/><\/p>/g, '');
};

/**
 * Agrupa mensajes por fecha
 * Usado para mostrar separadores de fecha en el chat
 */
export const groupMessagesByDate = (messages: Message[]): MessageGroup[] => {
  const groups: Map<string, Message[]> = new Map();

  messages.forEach((message) => {
    if (!message.timestamp) return;

    const date = message.timestamp instanceof Date 
      ? message.timestamp 
      : message.timestamp.toDate();
    
    const dateKey = date.toDateString();

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  });

  return Array.from(groups.entries()).map(([, msgs]) => ({
    date: msgs[0].timestamp instanceof Date 
      ? msgs[0].timestamp 
      : msgs[0].timestamp!.toDate(),
    messages: msgs,
  }));
};

/**
 * Formatea un timestamp a hora legible
 */
export const formatMessageTime = (timestamp: Date | null): string => {
  if (!timestamp) return '';
  
  return timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Formatea duración en segundos a formato HH:MM:SS
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':');
};

/**
 * Calcula el total de horas registradas en mensajes
 */
export const calculateTotalHours = (messages: Message[]): number => {
  return messages.reduce((total, message) => {
    return total + (message.hours || 0);
  }, 0);
};

/**
 * Verifica si un mensaje es del usuario actual
 */
export const isOwnMessage = (message: Message, userId: string): boolean => {
  return message.senderId === userId;
};

/**
 * Obtiene el nombre del archivo desde una URL
 */
export const getFileNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf('/') + 1);
  } catch {
    return 'file';
  }
};

/**
 * Formatea el tamaño de archivo en bytes a formato legible
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Sanitiza HTML para prevenir XSS
 * Wrapper de sanitize-html con configuración segura
 */
export const sanitizeHtml = (html: string): string => {
  // TODO: Implementar con sanitize-html cuando se necesite
  // Por ahora, retornamos el HTML tal cual (se sanitizará en el componente)
  return html;
};

/**
 * Genera un ID único para mensajes optimistas
 */
export const generateClientId = (): string => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Verifica si dos fechas son del mismo día
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Obtiene el label de fecha relativa (Today, Yesterday, etc.)
 */
export const getRelativeDateLabel = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Today';
  } else if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
};
