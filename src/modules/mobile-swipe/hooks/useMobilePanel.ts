import { create } from 'zustand'

export type MobilePanel = 'tasks' | 'home' | 'teams'
export type TaskSubView = 'table' | 'kanban' | 'archive'
export type TransitionPhase = 'idle' | 'exiting' | 'entering'

/** Timing constants (ms) shared across all animated elements */
export const EXIT_DURATION = 250 // how long exit animations last
export const ENTER_DELAY = 280   // delay before enter animations start (slightly > exit)
export const ENTER_DURATION = 420 // how long enter animations last

interface MobilePanelState {
  activePanel: MobilePanel
  /** Previous panel before the current transition (null = first mount) */
  prevPanel: MobilePanel | null
  /** Current transition phase */
  transitionPhase: TransitionPhase
  taskSubView: TaskSubView
  searchQuery: string
  setActivePanel: (panel: MobilePanel) => void
  setTaskSubView: (view: TaskSubView) => void
  setSearchQuery: (query: string) => void
}

let enterTimer: ReturnType<typeof setTimeout> | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null

export const useMobilePanel = create<MobilePanelState>((set, get) => ({
  activePanel: 'home',
  prevPanel: null,
  transitionPhase: 'idle',
  taskSubView: 'table',
  searchQuery: '',

  setActivePanel: (panel) => {
    const { activePanel: current } = get()
    if (panel === current) return

    // Clear any pending timers from a previous rapid switch
    if (enterTimer) clearTimeout(enterTimer)
    if (idleTimer) clearTimeout(idleTimer)

    // Phase 1: exiting — old elements animate out
    set({ activePanel: panel, prevPanel: current, transitionPhase: 'exiting' })

    // Phase 2: entering — new elements animate in (after exits finish)
    enterTimer = setTimeout(() => {
      set({ transitionPhase: 'entering' })
    }, ENTER_DELAY)

    // Phase 3: idle — transitions complete
    idleTimer = setTimeout(() => {
      set({ transitionPhase: 'idle', prevPanel: null })
    }, ENTER_DELAY + ENTER_DURATION + 50)
  },

  setTaskSubView: (view) => set({ taskSubView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
