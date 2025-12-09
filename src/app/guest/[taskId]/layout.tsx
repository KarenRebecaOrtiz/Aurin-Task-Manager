import { GuestAuthProvider } from '@/contexts/GuestAuthContext';
import { PageProvider } from '@/contexts/PageContext';

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
      <GuestAuthProvider taskId={taskId}>
        {children}
      </GuestAuthProvider>
    </PageProvider>
  );
}
