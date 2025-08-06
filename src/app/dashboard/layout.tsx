// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server'; // Cambia currentUser por auth
import styles from './DashboardLayout.module.scss';
import { UsersSyncProvider } from '@/components/UsersSyncProvider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth(); // Obtiene el ID del usuario
  if (!userId) {
    redirect('/sign-in');
  }
  return (
    <div className={styles.container}>
      <UsersSyncProvider>
        <main className={styles.main}>{children}</main>
      </UsersSyncProvider>
    </div>
  );
}

