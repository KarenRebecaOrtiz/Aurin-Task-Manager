import { create } from 'zustand'

interface ScrollDirectionState {
  /** Current scroll direction detected from any scroll container */
  scrollDirection: 'up' | 'down' | null
  setScrollDirection: (dir: 'up' | 'down' | null) => void
}

export const useScrollDirectionStore = create<ScrollDirectionState>((set) => ({
  scrollDirection: null,
  setScrollDirection: (dir) => set({ scrollDirection: dir }),
}))
