// src/app/p/[token]/page.tsx
import { notFound } from 'next/navigation';
import { getPublicTask } from '@/modules/shareTask/services/shareService.server';
import { getGuestSession } from '@/modules/shareTask/services/session.server';
import { PublicTaskView } from './_components/PublicTaskView';
import { InteractiveBackground } from '@/components/ui/InteractiveBackground';
import { LightRaysWrapper } from '@/components/ui/LightRaysWrapper';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublicTaskPage({ params }: PageProps) {
  const { token } = await params;

  // Fetch public task data
  const result = await getPublicTask(token);

  if (!result.success || !result.task) {
    // Token invalid, expired, or task not found
    notFound();
  }

  // Check for guest session
  const guestSession = await getGuestSession();

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
      <PublicTaskView
        task={result.task}
        token={token}
        tokenStatus={result.tokenStatus}
        guestSession={guestSession}
      />
    </>
  );
}

// Metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const result = await getPublicTask(token);

  if (!result.success || !result.task) {
    return {
      title: 'Tarea no encontrada',
    };
  }

  return {
    title: `${result.task.name} - Tarea Compartida`,
    description: result.task.description || 'Ver tarea compartida',
  };
}
