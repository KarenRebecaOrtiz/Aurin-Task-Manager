import { create } from 'zustand'

export type MobilePanel = 'tasks' | 'home' | 'teams'
export type TaskSubView = 'table' | 'kanban' | 'archive'

interface MobilePanelState {
  activePanel: MobilePanel
  taskSubView: TaskSubView
  searchQuery: string
  setActivePanel: (panel: MobilePanel) => void
  setTaskSubView: (view: TaskSubView) => void
  setSearchQuery: (query: string) => void
}

export const useMobilePanel = create<MobilePanelState>((set) => ({
  activePanel: 'home',
  taskSubView: 'table',
  searchQuery: '',
  setActivePanel: (panel) => set({ activePanel: panel }),
  setTaskSubView: (view) => set({ taskSubView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
