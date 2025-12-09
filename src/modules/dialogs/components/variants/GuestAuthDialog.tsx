// src/modules/dialogs/components/variants/GuestAuthDialog.tsx
'use client';

import { useState, useCallback } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
} from '../DialogPrimitives';
import { redeemGuestTokenAction } from '@/modules/shareTask/actions/guestToken.actions';
import { Button } from '@/components/ui/buttons';
import { CrystalInput as Input } from '@/components/ui/inputs';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import styles from '../../styles/Dialog.module.scss';

const DEFAULT_AVATARS = [
  '/avatars/01.png',
  '/avatars/02.png',
  '/avatars/03.png',
  '/avatars/04.png',
  '/avatars/05.png',
  '/avatars/06.png',
];

interface GuestAuthDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onSuccess: (session: { guestName: string; avatar: string }) => void;
  predefinedAvatars?: string[];
}

export function GuestAuthDialog({
  isOpen,
  onOpenChange,
  token,
  onSuccess,
  predefinedAvatars = DEFAULT_AVATARS,
}: GuestAuthDialogProps) {
  const [guestName, setGuestName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(predefinedAvatars[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeemToken = useCallback(async () => {
    if (!guestName.trim()) {
      setError('Por favor, ingresa tu nombre.');
      return;
    }
    if (!selectedAvatar) {
      setError('Por favor, selecciona un avatar.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await redeemGuestTokenAction({
      token,
      guestName,
      avatar: selectedAvatar,
    });

    if (result.success) {
      onSuccess({ guestName, avatar: selectedAvatar });
      onOpenChange(false);
    } else {
      setError(result.error || 'No se pudo verificar el token. Puede que sea inválido o ya haya sido utilizado.');
    }

    setLoading(false);
  }, [token, guestName, selectedAvatar, onSuccess, onOpenChange]);

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent size="sm" closeOnOverlayClick={false} closeOnEscape={false} showCloseButton={false}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Entrar como Invitado</ResponsiveDialogTitle>
          <p className={styles.dialogDescription}>
            Ingresa tu nombre y elige un avatar para participar en la conversación.
          </p>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <div className="space-y-6 py-4">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="guest-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tu Nombre
              </label>
              <Input
                id="guest-name"
                placeholder="Ej: Juan Pérez"
                value={guestName}
                onChange={(value) => setGuestName(value)}
                disabled={loading}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Elige un Avatar
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {predefinedAvatars.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={cn(
                      'rounded-full border-2 transition-all duration-200 ease-in-out',
                      selectedAvatar === avatar
                        ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2'
                        : 'border-transparent hover:border-blue-300'
                    )}
                    aria-label={`Seleccionar avatar ${avatar.split('/').pop()?.split('.')[0]}`}
                  >
                    <Image
                      src={avatar}
                      alt="Avatar"
                      width={80}
                      height={80}
                      className="rounded-full aspect-square object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleRedeemToken} disabled={loading} className="w-full !mt-8" size="lg">
              {loading ? 'Verificando...' : 'Entrar al Chat'}
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
