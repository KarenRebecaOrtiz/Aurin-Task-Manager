'use client';

import { useState, useTransition } from 'react';
import { validateTokenForTeam } from '@/modules/shareTask/actions/tokenAuth.actions';
import { useGuestTeamAuth } from '@/contexts/GuestTeamAuthContext';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { Lock, ArrowRight } from 'lucide-react';
import styles from './TokenAuthFormTeam.module.scss';

interface TokenAuthFormTeamProps {
  teamId: string;
  teamName: string;
}

export function TokenAuthFormTeam({ teamId, teamName }: TokenAuthFormTeamProps) {
  const [token, setToken] = useState('');
  const [isPending, startTransition] = useTransition();
  const { setGuestSession } = useGuestTeamAuth();
  const { success, error: showError } = useSonnerToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      showError('Error', 'Por favor ingresa un token válido');
      return;
    }

    startTransition(async () => {
      const result = await validateTokenForTeam(teamId, token.trim());

      if (result.success && result.tokenData) {
        // Save guest session to localStorage via context
        setGuestSession({
          teamId,
          token: token.trim(),
          tokenName: result.tokenData.tokenName,
          guestName: result.tokenData.guestName,
          authenticatedAt: new Date().toISOString(),
        });

        success('¡Autenticación exitosa! Cargando equipo...');
        // Force reload to show authenticated view
        window.location.reload();
      } else {
        showError('Error de autenticación', result.error || 'Token inválido');
      }
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Lock Icon */}
        <div className={styles.iconContainer}>
          <div className={styles.iconBackground}>
            <Lock className={styles.icon} size={32} />
          </div>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Autenticación Requerida</h1>
          <p className={styles.description}>
            Ingresa el token de acceso para ver el equipo compartido
          </p>
          <p className={styles.teamName}>
            {teamName}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="token" className={styles.label}>
              Token de Acceso
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Ingresa tu token de acceso"
              className={styles.input}
              disabled={isPending}
              autoFocus
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !token.trim()}
            className={styles.submitButton}
          >
            {isPending ? (
              <>
                <span className={styles.spinner} />
                Verificando...
              </>
            ) : (
              <>
                Acceder
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            El token te fue proporcionado por quien compartió este equipo.
            <br />
            Si no tienes un token, solicítalo al propietario del equipo.
          </p>
        </div>
      </div>
    </div>
  );
}
