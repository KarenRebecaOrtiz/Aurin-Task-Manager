/**
 * Firebase Service
 *
 * Capa de servicios para operaciones de Firebase con cache integrado.
 * Basada en el sistema original del ChatSidebar + patrones de Apple.
 *
 * Características:
 * - Cache en memoria para evitar re-fetches innecesarios
 * - Auto-limpieza después de 10 minutos de inactividad
 * - Invalidación automática después de mutaciones (send, update, delete)
 *
 * @see /Users/karen/Desktop/apps.apple.com-main para patrones de referencia
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTaskActivity } from "@/lib/taskUtils";
import { chatCache } from "./simpleChatCache";

// Re-export para mantener compatibilidad
export type { DocumentSnapshot } from "firebase/firestore";

export class FirebaseService {
  /**
   * Envía un mensaje encriptado a Firebase
   * Basado en sendMessage del hook original useMessageActions
   *
   * IMPORTANTE: Invalida el cache después de enviar para forzar re-fetch
   * y obtener el mensaje con el ID real de Firestore.
   */
  async sendMessage(
    taskId: string,
    messageData: {
      senderId: string;
      senderName: string;
      encrypted: { encryptedData: string; nonce: string; tag: string; salt: string } | null;
      imageUrl?: string | null;
      fileUrl?: string | null;
      fileName?: string | null;
      fileType?: string | null;
      filePath?: string | null;
      clientId: string;
      replyTo?: any | null;
      hours?: number;
      dateString?: string;
    }
  ): Promise<string> {
    const docRef = await addDoc(collection(db, `tasks/${taskId}/messages`), {
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      encrypted: messageData.encrypted,
      timestamp: serverTimestamp(),
      read: false,
      imageUrl: messageData.imageUrl || null,
      fileUrl: messageData.fileUrl || null,
      fileName: messageData.fileName || null,
      fileType: messageData.fileType || null,
      filePath: messageData.filePath || null,
      clientId: messageData.clientId,
      replyTo: messageData.replyTo || null,
      ...(messageData.hours && { hours: messageData.hours }),
      ...(messageData.dateString && { dateString: messageData.dateString }),
    });

    // Actualizar actividad de la tarea
    await updateTaskActivity(taskId, 'message');

    // ✅ Invalidar cache - el real-time listener se encargará de actualizar
    chatCache.invalidate(taskId);

    return docRef.id;
  }

  /**
   * Actualiza un mensaje existente
   *
   * IMPORTANTE: Invalida el cache para reflejar cambios
   */
  async updateMessage(
    taskId: string,
    messageId: string,
    updates: any
  ): Promise<void> {
    const messageRef = doc(db, `tasks/${taskId}/messages`, messageId);
    await updateDoc(messageRef, updates);

    await updateTaskActivity(taskId, 'message');

    // ✅ Invalidar cache - el real-time listener actualizará
    chatCache.invalidate(taskId);
  }

  /**
   * Elimina un mensaje
   *
   * IMPORTANTE: Invalida el cache después de eliminar
   */
  async deleteMessage(taskId: string, messageId: string): Promise<void> {
    const messageRef = doc(db, `tasks/${taskId}/messages`, messageId);
    await deleteDoc(messageRef);

    // ✅ Invalidar cache - el real-time listener reflejará la eliminación
    chatCache.invalidate(taskId);
  }

  /**
   * Carga mensajes con paginación y cache integrado
   * Compatible con el hook original useMessagePagination
   *
   * Estrategia de cache:
   * 1. Si es carga inicial (no lastDoc) → Intenta cache primero
   * 2. Si es paginación (con lastDoc) → Siempre fetch (mensajes viejos)
   * 3. Cache se invalida automáticamente en mutaciones
   *
   * @param taskId - ID de la tarea
   * @param pageSize - Número de mensajes a cargar (default: 10)
   * @param lastDoc - Último documento para paginación
   * @returns Mensajes y último documento
   */
  async loadMessages(
    taskId: string,
    pageSize = 10,
    lastDoc?: DocumentSnapshot
  ): Promise<{ messages: any[]; lastDoc: DocumentSnapshot | null }> {
    // ✅ Cache solo para carga inicial (sin paginación)
    if (!lastDoc) {
      const cached = chatCache.get(taskId);

      if (cached) {
        console.log(`[FirebaseService] ⚡ Cache HIT: Returning ${cached.messages.length} cached messages`);
        return {
          messages: cached.messages,
          lastDoc: cached.lastDoc,
        };
      }

      console.log('[FirebaseService] ❌ Cache MISS: Fetching from Firestore');
    } else {
      console.log('[FirebaseService] Pagination request: Fetching older messages from Firestore');
    }

    // Fetch desde Firestore
    let q = query(
      collection(db, `tasks/${taskId}/messages`),
      orderBy("timestamp", "desc"),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    // ✅ Cachear solo la carga inicial
    if (!lastDoc) {
      const hasMore = messages.length >= pageSize;
      chatCache.set(taskId, messages, lastVisible, hasMore, 0);
      console.log(`[FirebaseService] Cached ${messages.length} messages for task ${taskId}`);
    }

    return { messages, lastDoc: lastVisible };
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();
