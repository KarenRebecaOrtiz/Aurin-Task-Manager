'use client';

import { Toaster, toast } from 'sonner';
import { useEffect, useState } from 'react';

export { toast };
export { useSonnerToast } from './hooks/useSonnerToast';

export function SonnerToaster() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Detectar tema inicial
    const updateTheme = () => {
      const isDark = document.body.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    updateTheme();

    // Observar cambios en la clase del body
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      expand
      visibleToasts={5}
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-800 group-[.toaster]:text-slate-950 dark:group-[.toaster]:text-slate-50 group-[.toaster]:border-slate-200 dark:group-[.toaster]:border-zinc-700 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400',
          actionButton:
            'group-[.toast]:bg-slate-900 dark:group-[.toast]:bg-slate-50 group-[.toast]:text-slate-50 dark:group-[.toast]:text-slate-900',
          cancelButton:
            'group-[.toast]:bg-slate-100 dark:group-[.toast]:bg-slate-800 group-[.toast]:text-slate-900 dark:group-[.toast]:text-slate-100',
          closeButton: 'group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400',
        },
      }}
    />
  );
}
