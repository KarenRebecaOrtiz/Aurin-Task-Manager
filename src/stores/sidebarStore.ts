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
    console.log('[SidebarStore] Chat sidebar opened for task:', taskId);
  },

  openMessageSidebar: (conversationId: string) => {
    set({
      openSidebar: 'message',
      openSidebarId: conversationId,
    });
    console.log('[SidebarStore] Message sidebar opened for conversation:', conversationId);
  },

  closeSidebar: () => {
    set({
      openSidebar: null,
      openSidebarId: null,
    });
    console.log('[SidebarStore] Sidebar closed');
  },

  getOpenSidebar: () => {
    const state = get();
    return {
      type: state.openSidebar,
      id: state.openSidebarId,
    };
  },
})); 