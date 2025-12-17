import { GuestTeamAuthProvider } from '@/contexts/GuestTeamAuthContext';
import { PageProvider } from '@/contexts/PageContext';

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
      <GuestTeamAuthProvider teamId={teamId}>
        {children}
      </GuestTeamAuthProvider>
    </PageProvider>
  );
}
