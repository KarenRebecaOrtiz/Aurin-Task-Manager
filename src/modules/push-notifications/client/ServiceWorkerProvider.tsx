'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from './register-sw';

/**
 * Registers the service worker on mount.
 * Fire-and-forget — does not block rendering.
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
