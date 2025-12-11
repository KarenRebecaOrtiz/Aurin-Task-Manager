'use client';

import { create } from 'zustand';
import { doc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MAX_PINNED_TASKS = 5;

interface PinnedTasksState {
  pinnedTaskIds: string[];
  currentUserId: string | null;
  isLoading: boolean;
  isSubscribed: boolean;
}

interface PinnedTasksActions {
  /** Inicia la suscripción a Firestore para un usuario */
  subscribe: (userId: string) => void;
  /** Cancela la suscripción actual */
  unsubscribe: () => void;
  /** Pinea una tarea (sincroniza con Firestore) */
  pinTask: (taskId: string) => Promise<{ success: boolean; reason?: 'already_pinned' | 'limit_reached' }>;
  /** Despinea una tarea (sincroniza con Firestore) */
  unpinTask: (taskId: string) => Promise<void>;
  /** Toggle pin/unpin (sincroniza con Firestore) */
  togglePin: (taskId: string) => Promise<{ success: boolean; action: 'pinned' | 'unpinned'; reason?: 'already_pinned' | 'limit_reached' }>;
  /** Verifica si una tarea está pineada */
  isPinned: (taskId: string) => boolean;
  /** Obtiene el conteo de tareas pineadas */
  getPinnedCount: () => number;
  /** Verifica si se puede pinear otra tarea */
  canPin: () => boolean;
  /** Limpia todos los pines (sincroniza con Firestore) */
  clearAllPins: () => Promise<void>;
}

type PinnedTasksStore = PinnedTasksState & PinnedTasksActions;

// Referencia para la suscripción de Firestore
let unsubscribeRef: Unsubscribe | null = null;

const initialState: PinnedTasksState = {
  pinnedTaskIds: [],
  currentUserId: null,
  isLoading: true,
  isSubscribed: false,
};

/**
 * Guarda los pines en Firestore
 * Se guarda en users/{userId}/preferences/pinnedTasks
 */
async function savePinsToFirestore(userId: string, pinnedTaskIds: string[]): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'preferences', 'pinnedTasks');
    await setDoc(docRef, {
      pinnedTaskIds,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('[pinnedTasksStore] Error saving pins to Firestore:', error);
    throw error;
  }
}

export const usePinnedTasksStore = create<PinnedTasksStore>((set, get) => ({
  ...initialState,

  subscribe: (userId: string) => {
    const state = get();

    // Si ya estamos suscritos al mismo usuario, no hacer nada
    if (state.currentUserId === userId && state.isSubscribed) {
      return;
    }

    // Limpiar suscripción anterior si existe
    if (unsubscribeRef) {
      unsubscribeRef();
      unsubscribeRef = null;
    }

    set({ isLoading: true, currentUserId: userId });

    // Establecer listener de Firestore
    const docRef = doc(db, 'users', userId, 'preferences', 'pinnedTasks');

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pinnedTaskIds = data.pinnedTaskIds || [];

          set({
            pinnedTaskIds,
            isLoading: false,
            isSubscribed: true,
          });
        } else {
          // El documento no existe - usuario sin pines
          set({
            pinnedTaskIds: [],
            isLoading: false,
            isSubscribed: true,
          });
        }
      },
      (error) => {
        console.error('[pinnedTasksStore] Error in Firestore subscription:', error);
        set({
          isLoading: false,
          isSubscribed: false,
        });
      }
    );

    unsubscribeRef = unsubscribe;
  },

  unsubscribe: () => {
    if (unsubscribeRef) {
      unsubscribeRef();
      unsubscribeRef = null;
    }
    set({
      isSubscribed: false,
      currentUserId: null,
      pinnedTaskIds: [],
    });
  },

  pinTask: async (taskId: string) => {
    const state = get();
    const { currentUserId, pinnedTaskIds } = state;

    if (!currentUserId) {
      console.error('[pinnedTasksStore] No user subscribed');
      return { success: false, reason: 'limit_reached' as const };
    }

    if (pinnedTaskIds.includes(taskId)) {
      return { success: false, reason: 'already_pinned' as const };
    }

    if (pinnedTaskIds.length >= MAX_PINNED_TASKS) {
      return { success: false, reason: 'limit_reached' as const };
    }

    // Optimistic update
    const newPinnedIds = [taskId, ...pinnedTaskIds];
    set({ pinnedTaskIds: newPinnedIds });

    try {
      await savePinsToFirestore(currentUserId, newPinnedIds);
      return { success: true };
    } catch {
      // Revertir en caso de error
      set({ pinnedTaskIds });
      return { success: false, reason: 'limit_reached' as const };
    }
  },

  unpinTask: async (taskId: string) => {
    const state = get();
    const { currentUserId, pinnedTaskIds } = state;

    if (!currentUserId) {
      console.error('[pinnedTasksStore] No user subscribed');
      return;
    }

    // Optimistic update
    const newPinnedIds = pinnedTaskIds.filter(id => id !== taskId);
    set({ pinnedTaskIds: newPinnedIds });

    try {
      await savePinsToFirestore(currentUserId, newPinnedIds);
    } catch {
      // Revertir en caso de error
      set({ pinnedTaskIds });
    }
  },

  togglePin: async (taskId: string) => {
    const state = get();
    const isPinned = state.pinnedTaskIds.includes(taskId);

    if (isPinned) {
      await state.unpinTask(taskId);
      return { success: true, action: 'unpinned' as const };
    }

    const result = await state.pinTask(taskId);
    return {
      success: result.success,
      action: 'pinned' as const,
      reason: result.reason
    };
  },

  isPinned: (taskId: string) => {
    return get().pinnedTaskIds.includes(taskId);
  },

  getPinnedCount: () => {
    return get().pinnedTaskIds.length;
  },

  canPin: () => {
    return get().pinnedTaskIds.length < MAX_PINNED_TASKS;
  },

  clearAllPins: async () => {
    const state = get();
    const { currentUserId, pinnedTaskIds } = state;

    if (!currentUserId) {
      console.error('[pinnedTasksStore] No user subscribed');
      return;
    }

    // Optimistic update
    set({ pinnedTaskIds: [] });

    try {
      await savePinsToFirestore(currentUserId, []);
    } catch {
      // Revertir en caso de error
      set({ pinnedTaskIds });
    }
  },
}));

export const MAX_PINNED = MAX_PINNED_TASKS;
