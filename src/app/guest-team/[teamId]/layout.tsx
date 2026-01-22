import { GuestTeamAuthProvider } from '@/contexts/GuestTeamAuthContext';
import { PageProvider } from '@/contexts/PageContext';
import { AuthProvider } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    teamId: string;
  }>;
}

export default async function GuestTeamLayout({ children, params }: LayoutProps) {
  const { teamId } = await params;

  return (
    <PageProvider isPublic={true}>
      <AuthProvider>
        <GuestTeamAuthProvider teamId={teamId}>
          {children}
        </GuestTeamAuthProvider>
      </AuthProvider>
    </PageProvider>
  );
}
