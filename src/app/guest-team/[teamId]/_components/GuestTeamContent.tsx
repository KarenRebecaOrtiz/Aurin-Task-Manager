'use client';

import { useUser } from '@clerk/nextjs';
import { useGuestTeamAuth } from '@/contexts/GuestTeamAuthContext';
import { TokenAuthFormTeam } from './TokenAuthFormTeam';
import { PublicTeamView } from './PublicTeamView';
import { InteractiveBackground } from '@/components/ui/InteractiveBackground';
import { LightRaysWrapper } from '@/components/ui/LightRaysWrapper';
import type { PublicTeam } from '@/modules/shareTask/schemas/validation.schemas';

interface GuestTeamContentProps {
  teamId: string;
  team: PublicTeam;
}

export function GuestTeamContent({ teamId, team }: GuestTeamContentProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { guestSession, isLoading: isGuestLoading } = useGuestTeamAuth();

  const isLoading = !isUserLoaded || isGuestLoading;

  if (isLoading) {
    return (
      <>
        <InteractiveBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  // Si hay usuario autenticado de Clerk, acceso directo sin token
  if (user) {
    return (
      <>
        <InteractiveBackground />
        <LightRaysWrapper
          raysOrigin="top-center"
          raysColor="#ffffff1b"
          raysSpeed={0.3}
          lightSpread={1}
          rayLength={1.5}
          saturation={0.6}
          followMouse={false}
          mouseInfluence={0}
          introAnimation={true}
        />
        <PublicTeamView
          team={team}
          token="authenticated-user"
          tokenStatus="pending"
          guestSession={{
            teamId: teamId,
            guestName: user.fullName || user.firstName || 'Usuario',
            avatar: user.imageUrl,
          }}
        />
      </>
    );
  }

  // Si no hay usuario de Clerk, verificar sesión de invitado
  return (
    <>
      {/* Background Effects */}
      <InteractiveBackground />
      <LightRaysWrapper
        raysOrigin="top-center"
        raysColor="#ffffff1b"
        raysSpeed={0.3}
        lightSpread={1}
        rayLength={1.5}
        saturation={0.6}
        followMouse={false}
        mouseInfluence={0}
        introAnimation={true}
      />

      {/* Content */}
      {guestSession ? (
        <PublicTeamView
          team={team}
          token={guestSession.token}
          tokenStatus="pending"
          guestSession={{
            teamId: guestSession.teamId,
            guestName: guestSession.guestName || guestSession.tokenName || 'Invitado',
            avatar: '',
          }}
        />
      ) : (
        <TokenAuthFormTeam teamId={teamId} teamName={team.name} />
      )}
    </>
  );
}
