import { create } from 'zustand';

interface SidebarState {
  openSidebar: 'chat' | 'message' | null;
  openSidebarId: string | null;
}

interface SidebarActions {
  openChatSidebar: (taskId: string) => void;
  openMessageSidebar: (conversationId: string) => void;
  closeSidebar: () => void;
  getOpenSidebar: () => { type: 'chat' | 'message' | null; id: string | null };
}

export const useSidebarStore = create<SidebarState & SidebarActions>()((set, get) => ({
  openSidebar: null,
  openSidebarId: null,

  openChatSidebar: (taskId: string) => {
    set({
      openSidebar: 'chat',
      openSidebarId: taskId,
    });
    // Debug logging disabled to reduce console spam
  },

  openMessageSidebar: (conversationId: string) => {
    set({
      openSidebar: 'message',
      openSidebarId: conversationId,
    });
    // Debug logging disabled to reduce console spam
  },

  closeSidebar: () => {
    set({
      openSidebar: null,
      openSidebarId: null,
    });
    // Debug logging disabled to reduce console spam
  },

  getOpenSidebar: () => {
    const state = get();
    return {
      type: state.openSidebar,
      id: state.openSidebarId,
    };
  },
})); 