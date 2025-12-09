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
}

export function ShareButton({ 
  taskId, 
  taskName, 
  className,
  iconSize = 18 
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn('share-button', className)}
        aria-label="Compartir tarea"
        title="Compartir tarea"
      >
        <Share2 size={iconSize} />
      </button>

      <ShareDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        taskId={taskId}
        taskName={taskName}
      />
    </>
  );
}
