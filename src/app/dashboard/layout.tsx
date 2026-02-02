// src/app/dashboard/layout.tsx
'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/modules/header';
import { Footer } from '@/modules/footer';
import { ResponsiveChatSidebar } from '@/modules/chat';
import { ProfileCard } from '@/modules/profile-card';
import PlatformCompatibility from '@/shared/components/system/PlatformCompatibility';
import { AuthProvider } from '@/contexts/AuthContext';
import { PageProvider } from '@/contexts/PageContext';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState } from 'react';
import TasksPageModals from '@/modules/data-views/tasks/components/modals/TasksPageModals';
import { useSharedTasksState } from '@/hooks/useSharedTasksState';
import { useUserDataSubscription } from '@/hooks/useUserDataSubscription';
import { usePinnedTasksSubscription } from '@/modules/data-views/tasks/hooks/usePinnedTasksSubscription';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import tasksStyles from './tasks/styles/TasksPage.module.scss';
import { ChatbotWidget } from '@/modules/n8n-chatbot';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const { isAdmin } = useAuthContext(); // Get admin status from context
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 🚀 Initialize user data subscription (Single Source of Truth)
  useUserDataSubscription();

  // 🚀 Initialize pinned tasks subscription (per-user Firestore sync)
  usePinnedTasksSubscription();

  // 🚀 LOAD DATA ONCE HERE - all pages use the global store
  useSharedTasksState(user?.id);

  // 🔄 Refresh users when tab becomes visible (for status updates)
  useVisibilityRefresh({ enabled: !!user?.id });

  // Get state from stores
  const isCreateTaskOpen = useTasksPageStore(useShallow(state => state.isCreateTaskOpen));
  const isEditTaskOpen = useTasksPageStore(useShallow(state => state.isEditTaskOpen));
  const hasUnsavedChanges = useTasksPageStore(useShallow(state => state.hasUnsavedChanges));
  const isArchiveTableOpen = pathname === '/dashboard/archive';

  // Determine selected container based on current route (for Header display only)
  const selectedContainer = (pathname === '/dashboard/settings' ? 'config' : 'tareas') as 'tareas' | 'config' | null;

  // If in CreateTask or EditTask, no active element in selector
  const activeContainer = (isCreateTaskOpen || isEditTaskOpen) ? null : selectedContainer;

  // Set mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile viewport for chatbot controlled mode
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🚀 PREFETCH: Preload all main view routes for instant navigation
  useEffect(() => {
    if (mounted) {
      router.prefetch('/dashboard/tasks');
      router.prefetch('/dashboard/kanban');
      router.prefetch('/dashboard/archive');
      router.prefetch('/dashboard/settings');
    }
  }, [mounted, router]);

  // Client-side redirect if not authenticated
  useEffect(() => {
    if (mounted && isLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [mounted, isLoaded, userId, router]);

  // Show loading placeholder during SSR and initial hydration
  if (!mounted || !isLoaded) {
    return (
      <div className={tasksStyles.container}>
        {/* Empty placeholder that matches the structure */}
      </div>
    );
  }

  // Don't render if not authenticated
  if (!userId) {
    return null;
  }

  return (
    <div className={tasksStyles.container}>
      {/* Static components - never re-render */}

      <Header
        selectedContainer={activeContainer}
        isArchiveTableOpen={isArchiveTableOpen}
        isCreateTaskOpen={isCreateTaskOpen}
        isEditTaskOpen={isEditTaskOpen}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Animated page transitions - optimized for speed */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.15,
            ease: 'easeInOut'
          }}
          className={tasksStyles.content}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <Footer />

      {/* Global Modals */}
      <TasksPageModals />
      <IndependentChatSidebarRenderer />
      <ProfileCardRenderer />
      <PlatformCompatibility />

      {/* AI Chatbot - Only visible for admins */}
      {isAdmin && <ChatbotWidget controlled={isMobile} />}
    </div>
  );
}

// Independent ChatSidebar component with AnimatePresence for exit animations
// Soporta tanto chats de tareas ('chat') como de equipos ('team')
const IndependentChatSidebarRenderer = () => {
  const { isOpen, sidebarType, chatSidebar, teamSidebar, closeChatSidebar, closeTeamSidebar } = useSidebarStateStore();
  const users = useDataStore.getState().users;

  // Determine if sidebar should be shown - soporta 'chat' y 'team'
  const isTaskChat = sidebarType === 'chat' && chatSidebar.task;
  const isTeamChat = sidebarType === 'team' && teamSidebar.team;
  const shouldShow = isOpen && (isTaskChat || isTeamChat);

  // Usar la función de cierre correcta según el tipo
  const handleClose = isTeamChat ? closeTeamSidebar : closeChatSidebar;

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
        <ResponsiveChatSidebar
          key="chat-sidebar"
          isOpen={true}
          onClose={handleClose}
          users={users}
        />
      )}
    </AnimatePresence>
  );
};

// Independent ProfileCard component
const ProfileCardRenderer = () => {
  const isProfileCardOpen = useTasksPageStore(useShallow(state => state.isProfileCardOpen));
  const profileCardData = useTasksPageStore(useShallow(state => state.profileCardData));
  const closeProfileCard = useTasksPageStore(useShallow(state => state.closeProfileCard));

  if (!isProfileCardOpen || !profileCardData) {
    return null;
  }

  return (
    <ProfileCard
      isOpen={true}
      userId={profileCardData.userId}
      onClose={closeProfileCard}
    />
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageProvider isPublic={false}>
      <AuthProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </AuthProvider>
    </PageProvider>
  );
}