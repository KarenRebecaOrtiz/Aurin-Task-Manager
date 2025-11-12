'use client';

import { toast } from 'sonner';
import { useCallback } from 'react';

interface ToastOptions {
  duration?: number;
  onClose?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  playSound?: boolean;
}

export function useSonnerToast() {
  const playAudio = useCallback(async (audioPath: string) => {
    try {
      const audio = new Audio(audioPath);
      audio.preload = 'auto';
      await audio.play();
    } catch {
      // Silently fail - browser may block autoplay
    }
  }, []);

  const success = useCallback(
    (message: string, options?: ToastOptions) => {
      const { duration = 5000, onAction, actionLabel, playSound = true } = options || {};

      if (playSound) {
        playAudio('/Success.mp3');
      }

      toast.success(message, {
        duration,
        action: actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined,
        onDismiss: options?.onClose,
      });
    },
    [playAudio]
  );

  const error = useCallback(
    (message: string, description?: string, options?: ToastOptions) => {
      const { duration = 5000, onAction, actionLabel, playSound = true } = options || {};

      if (playSound) {
        playAudio('/Error.mp3');
      }

      toast.error(message, {
        duration,
        description,
        action: actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined,
        onDismiss: options?.onClose,
      });
    },
    [playAudio]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) => {
      const { duration = 5000, onAction, actionLabel, playSound = true } = options || {};

      if (playSound) {
        playAudio('/Warning.mp3');
      }

      toast.warning(message, {
        duration,
        action: actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined,
        onDismiss: options?.onClose,
      });
    },
    [playAudio]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => {
      const { duration = 5000, onAction, actionLabel, playSound = true } = options || {};

      if (playSound) {
        playAudio('/Info.mp3');
      }

      toast.info(message, {
        duration,
        action: actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined,
        onDismiss: options?.onClose,
      });
    },
    [playAudio]
  );

  return {
    success,
    error,
    warning,
    info,
    toast,
  };
}
