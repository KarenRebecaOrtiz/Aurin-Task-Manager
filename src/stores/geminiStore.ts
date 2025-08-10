// src/stores/geminiStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GeminiState {
  queries: Record<string, { query: string; response: string; timestamp: number }>; // Cache por taskId
  currentMode: 'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list' | null;
  isProcessing: boolean;
  lastQuery: string | null;
  lastResponse: string | null;
}

interface GeminiActions {
  addQuery: (taskId: string, query: string, response: string) => void;
  setMode: (mode: 'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list' | null) => void;
  setProcessing: (processing: boolean) => void;
  clearCache: (taskId: string) => void;
  setLastQuery: (query: string) => void;
  setLastResponse: (response: string) => void;
  clearAllCache: () => void;
}

const useGeminiStore = create<GeminiState & GeminiActions>()(
  persist(
    (set) => ({
      queries: {},
      currentMode: null,
      isProcessing: false,
      lastQuery: null,
      lastResponse: null,
      
      addQuery: (taskId, query, response) => set((state) => ({
        queries: { 
          ...state.queries, 
          [taskId]: { 
            query, 
            response, 
            timestamp: Date.now() 
          } 
        },
        lastQuery: query,
        lastResponse: response,
      })),
      
      setMode: (mode) => set({ currentMode: mode }),
      
      setProcessing: (processing) => set({ isProcessing: processing }),
      
      clearCache: (taskId) => set((state) => {
        const newQueries = { ...state.queries };
        delete newQueries[taskId];
        return { queries: newQueries };
      }),
      
      setLastQuery: (query) => set({ lastQuery: query }),
      
      setLastResponse: (response) => set({ lastResponse: response }),
      
      clearAllCache: () => set({ queries: {} }),
    }),
    { 
      name: 'gemini-storage', 
      storage: createJSONStorage(() => sessionStorage) 
    }
  )
);

export default useGeminiStore;
