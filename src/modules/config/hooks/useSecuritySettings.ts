/**
 * @module config/hooks/useSecuritySettings
 * @description Hook para manejar la configuración de seguridad y sesiones
 */

import { useCallback, useEffect } from 'react';
import { useUser, useSession, useReverification } from '@clerk/nextjs';
import { useSecurityStore } from '../stores';
import { Session } from '../types';
import { calculatePasswordStrength } from '../utils';

/**
 * Opciones para el hook useSecuritySettings
 */
interface UseSecuritySettingsOptions {
  /** Callback cuando se cambia la contraseña exitosamente */
  onSuccess?: (message: string) => void;
  /** Callback cuando hay un error */
  onError?: (message: string, error?: string) => void;
}

/**
 * Hook para manejar la configuración de seguridad
 */
export const useSecuritySettings = ({ onSuccess, onError }: UseSecuritySettingsOptions = {}) => {
  const { user: currentUser, isLoaded } = useUser();
  const { session: currentSession } = useSession();
  const {
    sessions,
    sessionsLoading,
    revokingSessionId,
    showPasswordForm,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordStrength,
    passwordErrors,
    passwordMatchError,
    setSessions,
    setSessionsLoading,
    setRevokingSessionId,
    setShowPasswordForm,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    setPasswordStrength,
    setPasswordErrors,
    setPasswordMatchError,
    clearPasswordFields,
  } = useSecurityStore();

  /**
   * Obtiene las sesiones activas del usuario
   */
  const fetchSessions = useCallback(async () => {
    if (!currentUser || !isLoaded) return;

    try {
      setSessionsLoading(true);
      
      const activeSessions = await currentUser.getSessions();
      
      const mappedSessions: Session[] = activeSessions.map((session) => ({
        id: session.id,
        lastActiveAt: new Date(session.lastActiveAt),
        createdAt: new Date(session.lastActiveAt), // Usar lastActiveAt como fallback
        expireAt: session.expireAt ? new Date(session.expireAt) : undefined,
        isCurrent: session.id === currentSession?.id,
      }));

      setSessions(mappedSessions);
    } catch (error) {
      console.error('[useSecuritySettings] Error fetching sessions:', error);
      if (onError) onError('Error al cargar las sesiones');
    } finally {
      setSessionsLoading(false);
    }
  }, [currentUser, isLoaded, currentSession, setSessions, setSessionsLoading, onError]);

  /**
   * Revoca una sesión con reverificación
   */
  const revokeSessionWithReverification = useReverification(async (sessionId: string) => {
    const clerkSessions = await currentUser?.getSessions();
    const sessionToRevoke = clerkSessions?.find((s) => s.id === sessionId);
    if (!sessionToRevoke) throw new Error('Sesión no encontrada');

    const isCurrent = sessionId === currentSession?.id;

    if (isCurrent) {
      await currentSession?.end();
      window.location.href = '/sign-in';
    } else {
      await sessionToRevoke.revoke();
    }
  });

  /**
   * Maneja la revocación de una sesión
   */
  const handleRevokeSession = useCallback(async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId);
      await revokeSessionWithReverification(sessionId);
      await fetchSessions();
      if (onSuccess) onSuccess('Sesión revocada exitosamente');
    } catch (error) {
      console.error('[useSecuritySettings] Error revoking session:', error);
      if (onError) onError('Error al revocar la sesión', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setRevokingSessionId(null);
    }
  }, [revokeSessionWithReverification, fetchSessions, setRevokingSessionId, onSuccess, onError]);

  /**
   * Actualiza la fuerza de la contraseña cuando cambia
   */
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      setPasswordErrors([]);
      return;
    }

    const result = calculatePasswordStrength(newPassword);
    setPasswordStrength(result.strength);
    setPasswordErrors(result.errors);
  }, [newPassword, setPasswordStrength, setPasswordErrors]);

  /**
   * Maneja el cambio de contraseña
   */
  const handleChangePassword = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setPasswordMatchError(true);
      if (onError) onError('Las contraseñas no coinciden');
      return;
    }

    // Validar fuerza de la contraseña
    if (passwordStrength < 3) {
      if (onError) onError('La nueva contraseña es débil. Corrige los errores.');
      return;
    }

    try {
      await currentUser?.updatePassword({
        currentPassword,
        newPassword,
      });

      if (onSuccess) onSuccess('Contraseña actualizada exitosamente');
      setShowPasswordForm(false);
      clearPasswordFields();
    } catch (error: unknown) {
      console.error('[useSecuritySettings] Error updating password:', error);
      let msg = 'Error al actualizar contraseña';
      
      if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as { errors: unknown[] }).errors)) {
        const errorCode = (error as { errors: { code: string }[] }).errors[0]?.code;
        if (errorCode === 'form_password_incorrect') {
          msg = 'Contraseña actual incorrecta';
        } else if (errorCode === 'form_password_pwned') {
          msg = 'Contraseña comprometida; elige una más segura';
        } else if (errorCode === 'form_password_validation_failed') {
          msg = 'No cumple requisitos de Clerk';
        }
      }
      
      if (onError) onError(msg, error instanceof Error ? error.message : 'Error desconocido');
    }
  }, [
    currentUser,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordStrength,
    setPasswordMatchError,
    setShowPasswordForm,
    clearPasswordFields,
    onSuccess,
    onError,
  ]);

  /**
   * Carga las sesiones al montar el componente
   */
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    sessionsLoading,
    revokingSessionId,
    showPasswordForm,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordStrength,
    passwordErrors,
    passwordMatchError,
    setShowPasswordForm,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    handleRevokeSession,
    handleChangePassword,
    fetchSessions,
  };
};
