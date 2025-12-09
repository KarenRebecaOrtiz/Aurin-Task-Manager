'use client';

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
  const { guestSession, isLoading } = useGuestAuth();

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
          }}
        />
      ) : (
        <TokenAuthForm taskId={taskId} taskName={task.name} />
      )}
    </>
  );
}
