// src/app/guest-team/[teamId]/page.tsx
import { notFound } from 'next/navigation';
import { getPublicTeamByTeamId } from '@/modules/shareTask/services/shareService.server';
import { GuestTeamContent } from './_components/GuestTeamContent';

interface PageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function GuestTeamPage({ params }: PageProps) {
  const { teamId } = await params;

  // Verificar si el equipo existe y está compartido
  const teamResult = await getPublicTeamByTeamId(teamId);

  if (!teamResult.success || !teamResult.team) {
    // Team no existe o no está compartido
    notFound();
  }

  return <GuestTeamContent teamId={teamId} team={teamResult.team} />;
}

// Metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { teamId } = await params;
  const result = await getPublicTeamByTeamId(teamId);

  if (!result.success || !result.team) {
    return {
      title: 'Equipo no encontrado',
    };
  }

  return {
    title: `${result.team.name} - Equipo Compartido`,
    description: result.team.description || 'Ver equipo compartido',
  };
}
