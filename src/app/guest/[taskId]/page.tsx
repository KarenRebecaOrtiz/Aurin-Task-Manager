// src/app/guest/[taskId]/page.tsx
import { notFound } from 'next/navigation';
import { getPublicTaskByTaskId } from '@/modules/shareTask/services/shareService.server';
import { GuestTaskContent } from './_components/GuestTaskContent';

interface PageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default async function GuestTaskPage({ params }: PageProps) {
  const { taskId } = await params;

  // Verificar si la tarea existe y está compartida
  const taskResult = await getPublicTaskByTaskId(taskId);

  if (!taskResult.success || !taskResult.task) {
    // Task no existe o no está compartida
    notFound();
  }

  return <GuestTaskContent taskId={taskId} task={taskResult.task} />;
}

// Metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { taskId } = await params;
  const result = await getPublicTaskByTaskId(taskId);

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
