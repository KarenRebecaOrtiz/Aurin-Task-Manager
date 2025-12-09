// src/modules/dialogs/components/atoms/TokenCountdown.tsx
'use client';

import { useState, useEffect } from 'react';

interface TokenCountdownProps {
  expiresAt: string | null;
}

function calculateRemainingTime(expiresAt: string | null) {
  if (!expiresAt) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const now = new Date();
  const expiryDate = new Date(expiresAt);
  const diff = expiryDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, expired: false };
}

export function TokenCountdown({ expiresAt }: TokenCountdownProps) {
  const [remainingTime, setRemainingTime] = useState(() =>
    calculateRemainingTime(expiresAt)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(calculateRemainingTime(expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remainingTime.expired) {
    return <span className="text-xs text-red-500">Expirado</span>;
  }

  return (
    <span className="text-xs text-gray-500">
      {String(remainingTime.hours).padStart(2, '0')}:
      {String(remainingTime.minutes).padStart(2, '0')}:
      {String(remainingTime.seconds).padStart(2, '0')}
    </span>
  );
}
