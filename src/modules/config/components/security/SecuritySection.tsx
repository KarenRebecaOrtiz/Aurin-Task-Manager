'use client';

import React from 'react';
import Image from 'next/image';
import { Small, CrystalInput } from '@/components/ui';
import { useSecuritySettings } from '../../hooks';
import { formatRelativeTime } from '../../utils';
import styles from './SecuritySection.module.scss';

interface SecuritySectionProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string, error?: string) => void;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  onSuccess,
  onError,
}) => {
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
    setShowPasswordForm,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    handleRevokeSession,
    handleChangePassword,
  } = useSecuritySettings({ onSuccess, onError });

  const getPasswordStrengthLabel = (strength: number) => {
    if (strength === 0) return 'Sin contraseña';
    if (strength < 2) return 'Muy débil';
    if (strength < 3) return 'Débil';
    if (strength < 4) return 'Aceptable';
    if (strength < 5) return 'Fuerte';
    return 'Muy fuerte';
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 2) return '#ef4444';
    if (strength < 3) return '#f59e0b';
    if (strength < 4) return '#eab308';
    if (strength < 5) return '#22c55e';
    return '#10b981';
  };

  return (
    <>
      {/* Cambio de Contraseña */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Image src="/lock.svg" alt="Contraseña" width={20} height={20} className={styles.sectionIcon} />
              Cambiar Contraseña
            </h2>
            <div className={styles.stackDescription}>
              Actualiza tu contraseña para mantener tu cuenta segura.
            </div>
          </div>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className={styles.primaryButton}
            >
              Cambiar Contraseña
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className={styles.passwordForm}>
              <div className={styles.fieldGroup}>
                <CrystalInput
                  label="Contraseña Actual"
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Ingresa tu contraseña actual"
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <CrystalInput
                  label="Nueva Contraseña"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Ingresa tu nueva contraseña"
                  required
                />
                
                {/* Indicador de fuerza */}
                {newPassword && (
                  <div className={styles.passwordStrength}>
                    <div className={styles.strengthBar}>
                      <div
                        className={styles.strengthFill}
                        style={{
                          width: `${(passwordStrength / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthColor(passwordStrength),
                        }}
                      />
                    </div>
                    <Small className={styles.strengthLabel}>
                      {getPasswordStrengthLabel(passwordStrength)}
                    </Small>
                  </div>
                )}

                {/* Errores de validación */}
                {passwordErrors.length > 0 && (
                  <ul className={styles.errorList}>
                    {passwordErrors.map((error, index) => (
                      <li key={index} className={styles.errorItem}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <CrystalInput
                  label="Confirmar Nueva Contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirma tu nueva contraseña"
                  required
                  error={passwordMatchError ? 'Las contraseñas no coinciden' : undefined}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.primaryButton}>
                  Actualizar Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className={styles.secondaryButton}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Sesiones Activas */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Image src="/monitor.svg" alt="Sesiones" width={20} height={20} className={styles.sectionIcon} />
              Sesiones Activas
            </h2>
            <div className={styles.stackDescription}>
              Gestiona los dispositivos donde has iniciado sesión.
            </div>
          </div>

          {sessionsLoading ? (
            <div className={styles.loadingState}>Cargando sesiones...</div>
          ) : sessions.length === 0 ? (
            <div className={styles.emptyState}>No hay sesiones activas</div>
          ) : (
            <div className={styles.sessionsList}>
              {sessions.map((session) => (
                <div key={session.id} className={styles.sessionCard}>
                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionHeader}>
                      <Image src="/monitor.svg" alt="Dispositivo" width={16} height={16} />
                      <Small className={styles.sessionDevice}>
                        {session.isCurrent ? 'Esta sesión' : 'Otro dispositivo'}
                      </Small>
                      {session.isCurrent && (
                        <Small className={styles.currentBadge}>Actual</Small>
                      )}
                    </div>
                    <div className={styles.sessionDetails}>
                      <Small className={styles.sessionTime}>
                        Última actividad: {formatRelativeTime(session.lastActiveAt)}
                      </Small>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      className={styles.revokeButton}
                    >
                      {revokingSessionId === session.id ? 'Revocando...' : 'Revocar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
