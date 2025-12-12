'use client';

import { useState, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { ShareDialog } from '@/modules/dialogs';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  taskId: string;
  taskName: string;
  className?: string;
  iconSize?: number;
  entityType?: 'task' | 'team'; // Tipo de entidad a compartir
}

export function ShareButton({
  taskId,
  taskName,
  className,
  iconSize = 18,
  entityType = 'task',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  const ariaLabel = entityType === 'team' ? 'Compartir equipo' : 'Compartir tarea';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn('share-button', className)}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <Share2 size={iconSize} />
      </button>

      <ShareDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        taskId={taskId}
        taskName={taskName}
        entityType={entityType}
      />
    </>
  );
}
