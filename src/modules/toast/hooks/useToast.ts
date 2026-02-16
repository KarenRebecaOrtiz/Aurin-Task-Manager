'use client';

import { sileo } from 'sileo';
import { useCallback } from 'react';

interface UseToastOptions {
  duration?: number;
  onClose?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  playSound?: boolean;
}

const AUDIO_FILES: Record<string, string> = {
  success: '/NotificationSound.mp3',
  error: '/Error.mp3',
  warning: '/Warning.mp3',
  info: '/Info.mp3',
};

function playAudio(variant: string) {
  const path = AUDIO_FILES[variant];
  if (!path) return;
  try {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.play().catch(() => {});
  } catch {
    // Browser may block autoplay
  }
}

export const useToast = () => {
  const success = useCallback(
    (message: string, descriptionOrOptions?: string | UseToastOptions, options?: UseToastOptions) => {
      let description: string | undefined;
      let opts: UseToastOptions;

      if (typeof descriptionOrOptions === 'string') {
        description = descriptionOrOptions;
        opts = options || {};
      } else {
        opts = descriptionOrOptions || {};
      }

      const { duration = 5000, onAction, actionLabel, playSound = true } = opts;

      if (playSound) playAudio('success');

      if (actionLabel && onAction) {
        return sileo.action({
          title: message,
          description,
          duration,
          button: { title: actionLabel, onClick: onAction },
        });
      }

      return sileo.success({ title: message, description, duration });
    },
    []
  );

  const error = useCallback(
    (message: string, descriptionOrOptions?: string | UseToastOptions, options?: UseToastOptions) => {
      let description: string | undefined;
      let opts: UseToastOptions;

      if (typeof descriptionOrOptions === 'string') {
        description = descriptionOrOptions;
        opts = options || {};
      } else {
        opts = descriptionOrOptions || {};
      }

      const { duration = 5000, onAction, actionLabel, playSound = true } = opts;

      if (playSound) playAudio('error');

      if (actionLabel && onAction) {
        return sileo.action({
          title: message,
          description,
          duration,
          button: { title: actionLabel, onClick: onAction },
        });
      }

      return sileo.error({ title: message, description, duration });
    },
    []
  );

  const warning = useCallback(
    (message: string, descriptionOrOptions?: string | UseToastOptions, options?: UseToastOptions) => {
      let description: string | undefined;
      let opts: UseToastOptions;

      if (typeof descriptionOrOptions === 'string') {
        description = descriptionOrOptions;
        opts = options || {};
      } else {
        opts = descriptionOrOptions || {};
      }

      const { duration = 5000, onAction, actionLabel, playSound = true } = opts;

      if (playSound) playAudio('warning');

      if (actionLabel && onAction) {
        return sileo.action({
          title: message,
          description,
          duration,
          button: { title: actionLabel, onClick: onAction },
        });
      }

      return sileo.warning({ title: message, description, duration });
    },
    []
  );

  const info = useCallback(
    (message: string, descriptionOrOptions?: string | UseToastOptions, options?: UseToastOptions) => {
      let description: string | undefined;
      let opts: UseToastOptions;

      if (typeof descriptionOrOptions === 'string') {
        description = descriptionOrOptions;
        opts = options || {};
      } else {
        opts = descriptionOrOptions || {};
      }

      const { duration = 5000, onAction, actionLabel, playSound = true } = opts;

      if (playSound) playAudio('info');

      if (actionLabel && onAction) {
        return sileo.action({
          title: message,
          description,
          duration,
          button: { title: actionLabel, onClick: onAction },
        });
      }

      return sileo.info({ title: message, description, duration });
    },
    []
  );

  return {
    success,
    error,
    warning,
    info,
    sileo,
  };
};
