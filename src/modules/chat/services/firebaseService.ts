/**
 * Firebase Service
 *
 * Capa de servicios para operaciones de Firebase.
 * Basada en el sistema original del ChatSidebar que funciona.
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

// Re-export para mantener compatibilidad
export type { DocumentSnapshot } from "firebase/firestore";

export class FirebaseService {
  /**
   * Envía un mensaje encriptado a Firebase
   * Basado en sendMessage del hook original useMessageActions
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

    return docRef.id;
  }

  /**
   * Actualiza un mensaje existente
   */
  async updateMessage(
    taskId: string,
    messageId: string,
    updates: any
  ): Promise<void> {
    const messageRef = doc(db, `tasks/${taskId}/messages`, messageId);
    await updateDoc(messageRef, updates);

    await updateTaskActivity(taskId, 'message');
  }

  /**
   * Elimina un mensaje
   */
  async deleteMessage(taskId: string, messageId: string): Promise<void> {
    const messageRef = doc(db, `tasks/${taskId}/messages`, messageId);
    await deleteDoc(messageRef);
  }

  /**
   * Carga mensajes con paginación
   * Compatible con el hook original useMessagePagination
   */
  async loadMessages(
    taskId: string,
    pageSize = 10,
    lastDoc?: DocumentSnapshot
  ): Promise<{ messages: any[]; lastDoc: DocumentSnapshot | null }> {
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

    return { messages, lastDoc: lastVisible };
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();
