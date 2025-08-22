// src/stores/chunkStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Timestamp } from 'firebase/firestore';

// Definir la interfaz Message localmente para evitar problemas de importación
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  lastModified?: Timestamp | Date | null;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
  isDatePill?: boolean;
  isSummary?: boolean; // Indicates if this message is an AI summary
  isLoading?: boolean; // Indicates if this message is a loading state (for AI operations)
  encrypted?: {
    encryptedData: string;
    nonce: string;
    tag: string;
    salt: string;
  };
}

interface ChunkStore {
  chunksByTask: Record<string, { chunks: Message[][]; lastFetched: number }>;  // chunks: array de arrays (cada inner array es un chunk de 10 msgs)
  addChunk: (taskId: string, newChunk: Message[]) => void;
  getChunks: (taskId: string) => Message[][] | undefined;
  clearChunks: (taskId: string) => void;
}

export const useChunkStore = create<ChunkStore>()(
  persist(
    (set, get) => ({
      chunksByTask: {},
      addChunk: (taskId, newChunk) => {
        // Debug logging disabled to reduce console spam
        set((state) => {
          const existing = state.chunksByTask[taskId] || { chunks: [], lastFetched: Date.now() };
          
          // ✅ OPTIMIZACIÓN: Solo actualizar si hay cambios reales
          const newChunkString = JSON.stringify(newChunk);
          const lastChunkString = existing.chunks.length > 0 ? JSON.stringify(existing.chunks[existing.chunks.length - 1]) : '';
          
          if (newChunkString === lastChunkString) {
            return state; // No actualizar si el chunk es idéntico al último
          }
          
          return {
            chunksByTask: {
              ...state.chunksByTask,
              [taskId]: {
                chunks: [...existing.chunks, newChunk],  // Añade nuevo chunk al final (para paginación descendente)
                lastFetched: Date.now(),
              },
            },
          };
        });
      },
      getChunks: (taskId) => get().chunksByTask[taskId]?.chunks,
      clearChunks: (taskId) => set((state) => {
        const existing = state.chunksByTask[taskId];
        
        // ✅ OPTIMIZACIÓN: Solo actualizar si hay chunks para limpiar
        if (!existing || existing.chunks.length === 0) {
          return state; // No actualizar si no hay chunks
        }
        
        return {
          chunksByTask: {
            ...state.chunksByTask,
            [taskId]: { chunks: [], lastFetched: 0 },
          },
        };
      }),
    }),
    {
      name: 'chunk-storage',  // Clave única en sessionStorage
      storage: createJSONStorage(() => sessionStorage),  // Usa sessionStorage en lugar de localStorage
    },
  ),
); 