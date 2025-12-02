// src/app/dashboard/layout.tsx
'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/modules/header';
import { Footer } from '@/modules/footer';
import { OptimizedMarquee } from '@/modules/advices';
import { ResponsiveChatSidebar } from '@/modules/chat';
import { ProfileCard } from '@/modules/profile-card';
import PlatformCompatibility from '@/shared/components/system/PlatformCompatibility';
import { AuthProvider } from '@/contexts/AuthContext';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState } from 'react';
import TasksPageModals from '@/modules/data-views/tasks/components/modals/TasksPageModals';
import { useSharedTasksState } from '@/hooks/useSharedTasksState';
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

  // 🚀 LOAD DATA ONCE HERE - all pages use the global store
  useSharedTasksState(user?.id);

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
      <OptimizedMarquee />

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
      {isAdmin && <ChatbotWidget controlled={typeof window !== 'undefined' && window.innerWidth < 768} />}
    </div>
  );
}

// Independent ChatSidebar component
const IndependentChatSidebarRenderer = () => {
  const { isOpen, sidebarType, chatSidebar, closeChatSidebar } = useSidebarStateStore();
  const users = useDataStore.getState().users;

  if (!isOpen || sidebarType !== 'chat' || !chatSidebar.task) {
    return null;
  }

  return (
    <ResponsiveChatSidebar
      key="chat-sidebar"
      isOpen={true}
      onClose={closeChatSidebar}
      users={users}
    />
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
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  );
}

