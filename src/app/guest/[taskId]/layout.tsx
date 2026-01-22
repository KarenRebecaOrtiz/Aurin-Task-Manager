import { GuestAuthProvider } from '@/contexts/GuestAuthContext';
import { PageProvider } from '@/contexts/PageContext';
import { AuthProvider } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    taskId: string;
  }>;
}

export default async function GuestTaskLayout({ children, params }: LayoutProps) {
  const { taskId } = await params;

  return (
    <PageProvider isPublic={true}>
      <AuthProvider>
        <GuestAuthProvider taskId={taskId}>
          {children}
        </GuestAuthProvider>
      </AuthProvider>
    </PageProvider>
  );
}
