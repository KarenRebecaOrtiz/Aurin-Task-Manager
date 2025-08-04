import { db } from '@/lib/firebase';
import { collection, addDoc, writeBatch, doc, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';

interface QueueOperation {
  id: string;
  type: 'create' | 'create-batch' | 'mark-read' | 'delete';
  data: unknown;
  timestamp: number;
  attempts: number;
}

export class NotificationQueue {
  private queue: QueueOperation[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 segundo base
  private maxRetryDelay = 10000; // 10 segundos máximo

  async add(operation: Omit<QueueOperation, 'id' | 'timestamp' | 'attempts'>) {
    const queueOperation: QueueOperation = {
      ...operation,
      id: `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      attempts: 0,
    };

    this.queue.push(queueOperation);
    console.log(`[NotificationQueue] Added operation to queue: ${operation.type}`, queueOperation.id);
    
    if (!this.isProcessing) {
      this.process();
    }
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    console.log(`[NotificationQueue] Starting to process ${this.queue.length} operations`);
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (!operation) continue;
      
      try {
        await this.executeOperation(operation);
        console.log(`[NotificationQueue] Successfully processed operation: ${operation.id}`);
      } catch (error) {
        console.error(`[NotificationQueue] Operation failed: ${operation.id}`, error);
        
        // Reintentar si es posible
        if (operation.attempts < this.maxRetries) {
          operation.attempts++;
          const delay = Math.min(this.retryDelay * Math.pow(2, operation.attempts - 1), this.maxRetryDelay);
          
          console.log(`[NotificationQueue] Retrying operation ${operation.id} in ${delay}ms (attempt ${operation.attempts}/${this.maxRetries})`);
          
          // Reinsertar al final de la cola con delay
          setTimeout(() => {
            this.queue.push(operation);
            if (!this.isProcessing) {
              this.process();
            }
          }, delay);
        } else {
          console.error(`[NotificationQueue] Operation ${operation.id} failed after ${this.maxRetries} attempts`);
          // Aquí podrías enviar a un sistema de monitoreo o analytics
        }
      }
    }
    
    this.isProcessing = false;
    console.log('[NotificationQueue] Finished processing queue');
  }

  private async executeOperation(operation: QueueOperation): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.executeCreate(operation.data);
        break;
      case 'create-batch':
        await this.executeCreateBatch(operation.data as unknown[]);
        break;
      case 'mark-read':
        await this.executeMarkRead(operation.data);
        break;
      case 'delete':
        await this.executeDelete(operation.data);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async executeCreate(data: unknown): Promise<void> {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...(data as Record<string, unknown>),
      timestamp: Timestamp.now(),
      read: false,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    });
    console.log(`[NotificationQueue] Created notification: ${docRef.id}`);
  }

  private async executeCreateBatch(notifications: unknown[]): Promise<void> {
    const batch = writeBatch(db);
    
    notifications.forEach(notification => {
      const docRef = doc(collection(db, 'notifications'));
      batch.set(docRef, {
        ...(notification as Record<string, unknown>),
        timestamp: Timestamp.now(),
        read: false,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      });
    });

    await batch.commit();
    console.log(`[NotificationQueue] Created batch of ${notifications.length} notifications`);
  }

  private async executeMarkRead(notificationId: unknown): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId as string), { read: true });
    console.log(`[NotificationQueue] Marked notification as read: ${notificationId}`);
  }

  private async executeDelete(notificationId: unknown): Promise<void> {
    await deleteDoc(doc(db, 'notifications', notificationId as string));
    console.log(`[NotificationQueue] Deleted notification: ${notificationId}`);
  }

  // Métodos públicos para facilitar el uso
  async addCreateNotification(data: unknown) {
    await this.add({
      type: 'create',
      data,
    });
  }

  async addCreateBatchNotifications(notifications: unknown[]) {
    await this.add({
      type: 'create-batch',
      data: notifications,
    });
  }

  async addMarkAsRead(notificationId: string) {
    await this.add({
      type: 'mark-read',
      data: notificationId,
    });
  }

  async addDelete(notificationId: string) {
    await this.add({
      type: 'delete',
      data: notificationId,
    });
  }

  // Métodos de utilidad
  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessingQueue(): boolean {
    return this.isProcessing;
  }

  clearQueue(): void {
    this.queue = [];
    console.log('[NotificationQueue] Queue cleared');
  }

  getQueueStats() {
    return {
      length: this.queue.length,
      isProcessing: this.isProcessing,
      oldestOperation: this.queue[0]?.timestamp || null,
    };
  }
}

// Exportar instancia singleton
export const notificationQueue = new NotificationQueue(); 