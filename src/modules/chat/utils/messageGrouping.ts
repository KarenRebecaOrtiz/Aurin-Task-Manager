/**
 * Message Grouping Utilities
 *
 * Utilidades para agrupar mensajes consecutivos del mismo usuario
 */

import type { Message } from "../types";

export type MessagePosition = "single" | "first" | "middle" | "last";

const TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutos

/**
 * Determina la posición de un mensaje en un grupo de mensajes consecutivos
 */
export function getMessagePosition(
  currentMessage: Message,
  prevMessage: Message | null,
  nextMessage: Message | null
): MessagePosition {
  const isSameSenderAsPrev =
    prevMessage &&
    prevMessage.senderId === currentMessage.senderId &&
    isWithinTimeThreshold(currentMessage, prevMessage);

  const isSameSenderAsNext =
    nextMessage &&
    nextMessage.senderId === currentMessage.senderId &&
    isWithinTimeThreshold(nextMessage, currentMessage);

  if (!isSameSenderAsPrev && !isSameSenderAsNext) {
    return "single"; // Mensaje aislado
  }

  if (isSameSenderAsPrev && isSameSenderAsNext) {
    return "middle"; // Medio del grupo
  }

  if (!isSameSenderAsPrev && isSameSenderAsNext) {
    return "first"; // Primero del grupo
  }

  return "last"; // Último del grupo
}

/**
 * Verifica si dos mensajes están dentro del umbral de tiempo para ser agrupados
 */
function isWithinTimeThreshold(msg1: Message, msg2: Message): boolean {
  if (!msg1.timestamp || !msg2.timestamp) return false;

  const time1 = msg1.timestamp instanceof Date
    ? msg1.timestamp.getTime()
    : msg1.timestamp.toDate().getTime();
  const time2 = msg2.timestamp instanceof Date
    ? msg2.timestamp.getTime()
    : msg2.timestamp.toDate().getTime();

  return Math.abs(time1 - time2) <= TIME_THRESHOLD;
}
