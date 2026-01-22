'use client';

import { useUser } from '@clerk/nextjs';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { TokenAuthForm } from './TokenAuthForm';
import { PublicTaskView } from '@/app/p/[token]/_components/PublicTaskView';
import { InteractiveBackground } from '@/components/ui/InteractiveBackground';
import { LightRaysWrapper } from '@/components/ui/LightRaysWrapper';

interface GuestTaskContentProps {
  taskId: string;
  task: any;
}

export function GuestTaskContent({ taskId, task }: GuestTaskContentProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { guestSession, isLoading: isGuestLoading } = useGuestAuth();

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

  // ✅ NUEVA LÓGICA: Si hay usuario autenticado de Clerk, acceso directo sin token
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
        <PublicTaskView
          task={task}
          token="authenticated-user"
          tokenStatus="pending"
          guestSession={{
            taskId: taskId,
            guestName: user.fullName || user.firstName || 'Usuario',
            avatar: user.imageUrl,
            commentsEnabled: true, // Authenticated users can always comment
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
        <PublicTaskView
          task={task}
          token={guestSession.token}
          tokenStatus="pending"
          guestSession={{
            taskId: guestSession.taskId,
            guestName: guestSession.guestName || guestSession.tokenName || 'Invitado',
            avatar: '', // El avatar se puede generar dinámicamente en el componente hijo
            commentsEnabled: guestSession.commentsEnabled, // Pass token's comment permission
          }}
        />
      ) : (
        <TokenAuthForm taskId={taskId} taskName={task.name} />
      )}
    </>
  );
}
