'use client';

import { ConfigPage } from '@/modules/config';
import { useUser } from '@clerk/nextjs';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();

  const handleShowSuccessAlert = useCallback((message: string) => {
    const { showSuccess } = useTasksPageStore.getState();
    showSuccess(message);
  }, []);

  const handleShowFailAlert = useCallback((message: string) => {
    const { showFail } = useTasksPageStore.getState();
    showFail(message);
  }, []);

  const handleClose = useCallback(() => {
    router.push('/dashboard/tasks');
  }, [router]);

  return (
    <ConfigPage
      userId={user?.id || ''}
      onClose={handleClose}
      onShowSuccessAlert={handleShowSuccessAlert}
      onShowFailAlert={handleShowFailAlert}
    />
  );
}
