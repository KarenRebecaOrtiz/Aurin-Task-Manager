import { db } from './firebase';
import { collection, getDocs, query, deleteDoc, doc, addDoc, where } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export async function deleteTask(taskId: string, userId: string, isAdmin: boolean, task: any) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Eliminar mensajes
    const messagesQuery = query(collection(db, `tasks/${taskId}/messages`));
    const messagesSnapshot = await getDocs(messagesQuery);
    for (const msgDoc of messagesSnapshot.docs) {
      const msgData = msgDoc.data();
      if (msgData.filePath) {
        try {
          const response = await fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: msgData.filePath }),
          });
          const responseData = await response.json();
          if (!response.ok) {
            console.error('[taskUtils] Failed to delete GCS file:', {
              status: response.status,
              error: responseData.error,
              filePath: msgData.filePath,
            });
          } else {
            console.log('[taskUtils] Successfully deleted GCS file:', msgData.filePath);
          }
        } catch (err) {
          console.error('[taskUtils] Error deleting GCS file:', {
            error: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : 'No stack trace',
            filePath: msgData.filePath,
          });
        }
      }
      await deleteDoc(doc(db, `tasks/${taskId}/messages`, msgDoc.id));
      console.log('[taskUtils] Deleted message:', msgDoc.id);
    }

    // Eliminar notificaciones
    const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', taskId));
    const notificationsSnapshot = await getDocs(notificationsQuery);
    for (const notifDoc of notificationsSnapshot.docs) {
      await deleteDoc(doc(db, 'notifications', notifDoc.id));
      console.log('[taskUtils] Deleted notification:', notifDoc.id);
    }

    // Enviar notificaciones
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(userId);
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId,
        taskId,
        message: `Usuario eliminó la tarea ${task.name}`,
        timestamp: Timestamp.now(),
        read: false,
        recipientId,
      });
      console.log('[taskUtils] Sent notification to:', recipientId);
    }

    // Eliminar tarea
    await deleteDoc(doc(db, 'tasks', taskId));
    console.log('[taskUtils] Task deleted successfully:', taskId);
  } catch (error) {
    throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}