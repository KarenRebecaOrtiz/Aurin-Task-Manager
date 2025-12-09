'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckIcon, CopyIcon, PlusCircle, Trash2, Link2, MessageSquare } from 'lucide-react';
import { CrudDialog } from '../organisms/CrudDialog';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { cn } from '@/lib/utils';
import styles from '../../styles/Dialog.module.scss';
import {
  toggleTaskSharingAction,
  updateCommentsEnabledAction,
  getShareInfoAction,
} from '@/modules/shareTask/actions/share.actions';
import {
  generateGuestTokenAction,
  revokeGuestTokenAction,
  getGuestTokensAction,
} from '@/modules/shareTask/actions/guestToken.actions';
import { TokenCountdown } from '../atoms/TokenCountdown';

interface GuestToken {
  id: string;
  token: string;
  status: 'pending' | 'redeemed';
  guestName: string | null;
  tokenName?: string;
  createdAt: string;
  expiresAt: string | null;
  shareUrl: string;
  avatar?: string;
}

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

export function ShareDialog({
  isOpen,
  onOpenChange,
  taskId,
  taskName,
  size = 'lg',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
}: ShareDialogProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [guestTokens, setGuestTokens] = useState<GuestToken[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [tokenName, setTokenName] = useState('');

  const { success, error: showError } = useSonnerToast();

  const loadShareData = useCallback(async () => {
    try {
      const [infoResult, tokensResult] = await Promise.all([
        getShareInfoAction(taskId),
        getGuestTokensAction(taskId),
      ]);

      if (infoResult.success && infoResult.info) {
        setIsShared(infoResult.info.isShared);
        setCommentsEnabled(infoResult.info.commentsEnabled || false);
      } else {
        const errorMsg = infoResult.error || 'Error al cargar la información para compartir.';
        setError(errorMsg);
      }

      if (tokensResult.success && 'tokens' in tokensResult) {
        // Map tokens to ensure all fields are present
        const mappedTokens = tokensResult.tokens.map((token: any) => ({
          id: token.id,
          token: token.token,
          status: token.status,
          guestName: token.guestName,
          tokenName: token.tokenName,
          createdAt: token.createdAt,
          shareUrl: token.shareUrl,
          expiresAt: token.expiresAt || null,
          avatar: token.avatar,
        }));
        setGuestTokens(mappedTokens);
      } else if (!tokensResult.success) {
        const errorMsg = tokensResult.error || 'Error al cargar los tokens de invitado.';
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Ocurrió un error inesperado.';
      setError(errorMsg);
      console.error('[ShareDialog] Error loading data:', err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen) {
      setIsInitialLoading(true);
      setError(null);
      loadShareData();
    } else {
      // Reset state when closing
      setIsInitialLoading(true);
      setError(null);
    }
  }, [isOpen, loadShareData]);

  const handleToggleSharing = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await toggleTaskSharingAction({
        taskId,
        enabled: !isShared,
        commentsEnabled: !isShared ? commentsEnabled : false,
      });

      if (result.success) {
        const newIsShared = !isShared;
        setIsShared(newIsShared);

        if (newIsShared) {
          success('¡Compartir activado! Se ha generado un enlace público para tu tarea');
        } else {
          success('Compartir desactivado. La tarea ya no está disponible públicamente');
          setGuestTokens([]);
          setShowCreateToken(false);
          setTokenName('');
        }
      } else {
        const errorMsg = result.error || 'Error al cambiar el estado de compartición.';
        setError(errorMsg);
        showError('Error', errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [taskId, isShared, commentsEnabled, success, showError, isSubmitting]);

  const handleToggleComments = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await updateCommentsEnabledAction({
      taskId,
      enabled: !commentsEnabled,
    });
    if (result.success) {
      setCommentsEnabled(!commentsEnabled);
      if (!commentsEnabled) {
        success('Interacción permitida. Los invitados ahora pueden interactuar con la tarea');
      } else {
        success('Interacción desactivada. Los invitados solo podrán ver la tarea');
      }
    } else {
      const errorMsg = result.error || 'Error al actualizar los comentarios.';
      setError(errorMsg);
      showError('Error', errorMsg);
    }
    setIsSubmitting(false);
  }, [taskId, commentsEnabled, success, showError]);

  const handleGenerateToken = useCallback(async () => {
    if (!showCreateToken) {
      // Mostrar el formulario de crear token
      setShowCreateToken(true);
      return;
    }

    // Validar que el nombre no esté vacío
    if (!tokenName.trim()) {
      showError('Error', 'Debes ingresar un nombre para el token');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await generateGuestTokenAction({ taskId, tokenName: tokenName.trim() });
    if (result.success) {
      success(`¡Token creado exitosamente! Token para "${tokenName.trim()}" está listo para usar`);
      setTokenName('');
      setShowCreateToken(false);
      await loadShareData();
    } else {
      const errorMsg = result.error || 'Error al generar el token.';
      setError(errorMsg);
      showError('Error al crear token', errorMsg);
    }
    setIsSubmitting(false);
  }, [taskId, tokenName, showCreateToken, loadShareData, success, showError]);

  const handleRevokeToken = useCallback(async (tokenId: string, tokenUserName?: string) => {
    if (!confirm('¿Revocar este token?\n\nAl revocar este token, el usuario asignado ya no podrá acceder a la tarea compartida. Esta acción no se puede deshacer.')) {
      return;
    }

    setIsSubmitting(true);
    const result = await revokeGuestTokenAction({ taskId, tokenId });
    if (result.success) {
      const message = tokenUserName
        ? `Token revocado. El acceso de "${tokenUserName}" ha sido revocado`
        : 'Token revocado exitosamente';
      success(message);
      await loadShareData();
    } else {
      const errorMsg = result.error || 'Error al revocar el token.';
      showError('Error al revocar', errorMsg);
    }
    setIsSubmitting(false);
  }, [taskId, loadShareData, success, showError]);

  const handleCopy = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(url);
    success('¡Enlace copiado! El enlace está listo para compartir');
    setTimeout(() => setCopiedToken(null), 2000);
  }, [success]);

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      mode="view"
      title="Compartir Tarea"
      description={`Gestiona el acceso público a "${taskName}"`}
      size={size}
      isLoading={false}
      isSubmitting={isSubmitting}
      error={null}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      showCloseButton={showCloseButton}
      footer={null}
    >
      {isInitialLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Cargando información...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
          <button onClick={loadShareData} className={styles.retryButton}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className={styles.shareContent}>
        {/* Toggle para compartir */}
        <div className={styles.shareOption}>
          <div className={styles.shareOptionHeader}>
            <Link2 size={18} className={styles.shareOptionIcon} />
            <div className={styles.shareOptionText}>
              <label htmlFor="enable-sharing" className={styles.shareLabel}>
                Compartir públicamente
              </label>
              <p className={styles.shareDescription}>
                Permite el acceso público a esta tarea mediante enlace
              </p>
            </div>
          </div>
          <div className={styles.switchContainer}>
            <button
              type="button"
              role="switch"
              aria-checked={isShared}
              onClick={handleToggleSharing}
              disabled={isSubmitting}
              className={cn(styles.switch, isShared && styles.switchActive)}
            >
              <span className={styles.switchThumb} />
            </button>
          </div>
        </div>

        {isShared && (
          <>
            <div className={styles.divider} />

            {/* Toggle para comentarios */}
            <div className={styles.shareOption}>
              <div className={styles.shareOptionHeader}>
                <MessageSquare size={18} className={styles.shareOptionIcon} />
                <div className={styles.shareOptionText}>
                  <label htmlFor="comments" className={styles.shareLabel}>
                    Habilitar comentarios
                  </label>
                  <p className={styles.shareDescription}>
                    Los invitados podrán dejar comentarios en la tarea
                  </p>
                </div>
              </div>
              <div className={styles.switchContainer}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={commentsEnabled}
                  onClick={handleToggleComments}
                  disabled={isSubmitting}
                  className={cn(styles.switch, commentsEnabled && styles.switchActive)}
                >
                  <span className={styles.switchThumb} />
                </button>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Enlace público */}
            <div className={styles.shareLink}>
              <label className={styles.shareLinkLabel}>
                Enlace público
              </label>
              <div className={styles.shareLinkInputWrapper}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/guest/${taskId}`}
                  className={styles.shareLinkInput}
                  onClick={(_e) => _e.currentTarget.select()}
                />
                <button
                  onClick={() => handleCopy(`${window.location.origin}/guest/${taskId}`)}
                  className={styles.shareLinkCopyButton}
                  disabled={isSubmitting}
                >
                  {copiedToken === `${window.location.origin}/guest/${taskId}` ? (
                    <CheckIcon size={16} className={styles.iconSuccess} />
                  ) : (
                    <CopyIcon size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Lista de tokens de invitado */}
            <div className={styles.tokenSection}>
              <div className={styles.tokenHeader}>
                <h3 className={styles.tokenTitle}>
                  Tokens Activos
                </h3>
                <p className={styles.tokenCount}>
                  {String(guestTokens.length).padStart(2, '0')}/03
                </p>
              </div>

              <div className={styles.divider} />

              {guestTokens.length > 0 && (
                <div className={styles.tokenList}>
                  {guestTokens.map((token) => (
                    <div key={token.id} className={styles.tokenItem}>
                      <div className={styles.tokenItemContent}>
                        <div className={styles.tokenItemLabel}>
                          {token.tokenName || token.guestName || 'Invitado'}
                        </div>
                        <div className={styles.tokenItemToken}>
                          {token.token}
                        </div>
                        {token.expiresAt && (
                          <div className={styles.tokenItemDetails}>
                            <TokenCountdown expiresAt={token.expiresAt} />
                          </div>
                        )}
                      </div>
                      <div className={styles.tokenItemActions}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(token.token);
                            setCopiedToken(token.token);
                            success(`Token copiado. Token de "${token.tokenName || token.guestName || 'Invitado'}" copiado`);
                            setTimeout(() => setCopiedToken(null), 2000);
                          }}
                          className={styles.copyTokenButton}
                          disabled={isSubmitting}
                          title="Copiar token"
                        >
                          {copiedToken === token.token ? (
                            <CheckIcon size={16} className={styles.iconSuccess} />
                          ) : (
                            <CopyIcon size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleRevokeToken(token.id, token.tokenName || token.guestName || undefined)}
                          className={styles.revokeTokenButton}
                          disabled={isSubmitting}
                          title="Revocar token"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para crear token */}
              {showCreateToken && (
                <div className={styles.createTokenForm}>
                  <label className={styles.createTokenLabel}>
                    Nombre de usuario del token
                  </label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className={styles.createTokenInput}
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Botón de acción */}
              <button
                onClick={handleGenerateToken}
                disabled={isSubmitting || (!showCreateToken && guestTokens.length >= 3)}
                className={cn(styles.generateButton, styles.generateButtonPrimary)}
              >
                <PlusCircle size={16} />
                <span>{showCreateToken ? 'Confirmar y crear token' : 'Generar nuevo token'}</span>
              </button>

              {/* Textos de ayuda */}
              {!showCreateToken && guestTokens.length === 0 && (
                <p className={styles.helperText}>
                  Por seguridad, necesitas crear al menos un token para que los invitados puedan acceder.
                  Cada invitado deberá ingresar su token asignado.
                  <br />
                  <span>Puedes generar hasta 3 tokens por tarea.</span>
                </p>
              )}
              {showCreateToken && (
                <p className={styles.helperText}>
                  Una vez creado, el nombre del token no se puede modificar. Para cambiarlo, deberás revocarlo y crear uno nuevo.
                </p>
              )}
              {!showCreateToken && guestTokens.length >= 3 && (
                <p className={styles.helperTextError}>
                  Has alcanzado el límite máximo de 3 tokens por tarea.
                </p>
              )}
            </div>
          </>
        )}

        {!isShared && (
          <div className={styles.infoMessage}>
            <p>
              Activa &quot;Compartir públicamente&quot; para generar enlaces de invitado y compartir esta tarea con personas externas.
            </p>
          </div>
        )}
        </div>
      )}
    </CrudDialog>
  );
}
