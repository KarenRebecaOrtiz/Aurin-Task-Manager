// src/stores/textReformulationStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ReformulationMode } from '@/hooks/useTextReformulation';

interface ReformulationHistory {
  originalText: string;
  reformulatedText: string;
  mode: ReformulationMode;
  timestamp: number;
}

interface TextReformulationState {
  history: ReformulationHistory[];
  isProcessing: boolean;
  lastReformulation: ReformulationHistory | null;
}

interface TextReformulationActions {
  addToHistory: (reformulation: ReformulationHistory) => void;
  setProcessing: (processing: boolean) => void;
  clearHistory: () => void;
  removeFromHistory: (timestamp: number) => void;
}

const useTextReformulationStore = create<TextReformulationState & TextReformulationActions>()(
  persist(
    (set, get) => ({
      history: [],
      isProcessing: false,
      lastReformulation: null,
      
      addToHistory: (reformulation) => set((state) => ({
        history: [reformulation, ...state.history.slice(0, 49)], // Mantener solo los últimos 50
        lastReformulation: reformulation,
      })),
      
      setProcessing: (processing) => set({ isProcessing: processing }),
      
      clearHistory: () => set({ history: [], lastReformulation: null }),
      
      removeFromHistory: (timestamp) => set((state) => ({
        history: state.history.filter(item => item.timestamp !== timestamp),
        lastReformulation: state.lastReformulation?.timestamp === timestamp ? null : state.lastReformulation,
      })),
    }),
    { 
      name: 'text-reformulation-storage', 
      storage: createJSONStorage(() => sessionStorage) 
    }
  )
);

export default useTextReformulationStore;
