'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/modules/header';
import { OptimizedMarquee } from '@/modules/advices';
import { Footer } from '@/modules/footer';
import ViewSwitcher from '@/modules/data-views/components/ui/ViewSwitcher'; // Import the ViewSwitcher
import styles from './DashboardLayout.module.scss';

type Container = 'tareas' | 'kanban' | 'archive' | 'files' | 'settings' | null;

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getSelectedContainer = (): Container => {
    if (pathname.includes('/dashboard/tasks')) return 'tareas';
    if (pathname.includes('/dashboard/kanban')) return 'kanban';
    if (pathname.includes('/dashboard/archive')) return 'archive';
    if (pathname.includes('/dashboard/files')) return 'files';
    if (pathname.includes('/dashboard/settings')) return 'settings';
    return null;
  };

  const selectedContainer = getSelectedContainer();

  return (
    <div className={styles.container}>
      <OptimizedMarquee />
      <Header
        selectedContainer={selectedContainer}
        isArchiveTableOpen={false}
        onChangeContainer={() => {}}
        isCreateTaskOpen={false}
        isEditTaskOpen={false}
        hasUnsavedChanges={false}
      />
      <ViewSwitcher /> {/* Add the navigation component here */}
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
