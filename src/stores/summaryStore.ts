import { create } from 'zustand';

export interface SummaryCache {
  text: string;
  timestamp: number;
}

interface SummaryState {
  summaries: { [key: string]: SummaryCache };
  setSummary: (key: string, value: SummaryCache) => void;
  clearSummary: (key: string) => void;
  clearAllSummaries: () => void;
}

export const useSummaryStore = create<SummaryState>((set) => ({
  summaries: {},
  setSummary: (key, value) => set((state) => ({ 
    summaries: { ...state.summaries, [key]: value } 
  })),
  clearSummary: (key) => set((state) => {
    const newSummaries = { ...state.summaries };
    delete newSummaries[key];
    return { summaries: newSummaries };
  }),
  clearAllSummaries: () => set({ summaries: {} }),
})); 