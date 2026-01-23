'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckIcon, CopyIcon, PlusCircle, Trash2, Link2, MessageSquare, AlertTriangle, Loader2, Info } from 'lucide-react';
import { GradientAvatar } from '@/components/ui/GradientAvatar';
import { CrudDialog } from '../organisms/CrudDialog';
import { useDialog } from '../../hooks/useDialog';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { cn } from '@/lib/utils';
import { buildGuestTaskUrl } from '@/lib/url-utils';
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
  updateTokenCommentsEnabledAction,
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
  commentsEnabled: boolean;
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
  entityType?: 'task' | 'team'; // Tipo de entidad a compartir
}

// Utility function to mask tokens - only show last 4 characters
const maskToken = (token: string): string => {
  if (token.length <= 4) return token;
  return `•••• ${token.slice(-4).toUpperCase()}`;
};

// Utility function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export function ShareDialog({
  isOpen,
  onOpenChange,
  taskId,
  taskName,
  size = 'lg',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  entityType = 'task',
}: ShareDialogProps) {
  // Textos dinámicos según el tipo de entidad
  const entityLabel = entityType === 'team' ? 'equipo' : 'tarea';
  const entityLabelCapital = entityType === 'team' ? 'Equipo' : 'Tarea';
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [guestTokens, setGuestTokens] = useState<GuestToken[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationName, setInvitationName] = useState('');
  const [showDisableWarning, setShowDisableWarning] = useState(false);

  const { success, error: showError } = useSonnerToast();
  const { openConfirm } = useDialog();

  const MAX_INVITATIONS = 3;
  const isAtLimit = guestTokens.length >= MAX_INVITATIONS;

  const loadShareData = useCallback(async () => {
    try {
      const [infoResult, tokensResult] = await Promise.all([
        getShareInfoAction(taskId, entityType),
        getGuestTokensAction(taskId, entityType),
      ]);

      if (infoResult.success && infoResult.info) {
        setIsShared(infoResult.info.isShared);
        setCommentsEnabled(infoResult.info.commentsEnabled || false);
      } else {
        const errorMsg = infoResult.error || 'Error al cargar la información para compartir.';
        setError(errorMsg);
      }

      if (tokensResult.success && 'tokens' in tokensResult) {
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
          commentsEnabled: token.commentsEnabled ?? true,
        }));
        setGuestTokens(mappedTokens);
      } else if (!tokensResult.success) {
        const errorMsg = tokensResult.error || 'Error al cargar las invitaciones.';
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Ocurrió un error inesperado.';
      setError(errorMsg);
      console.error('[ShareDialog] Error loading data:', err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [taskId, entityType]);

  useEffect(() => {
    if (isOpen) {
      setIsInitialLoading(true);
      setError(null);
      setShowDisableWarning(false);
      loadShareData();
    } else {
      setIsInitialLoading(true);
      setError(null);
      setInvitationName('');
      setShowDisableWarning(false);
    }
  }, [isOpen, loadShareData]);

  const handleToggleSharing = useCallback(async () => {
    if (isSubmitting) return;

    // If trying to disable and there are tokens, show warning first
    if (isShared && guestTokens.length > 0 && !showDisableWarning) {
      setShowDisableWarning(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setShowDisableWarning(false);

    try {
      const result = await toggleTaskSharingAction({
        taskId,
        enabled: !isShared,
        commentsEnabled: !isShared ? commentsEnabled : false,
        entityType,
      });

      if (result.success) {
        const newIsShared = !isShared;
        setIsShared(newIsShared);

        if (newIsShared) {
          success(`¡Compartir activado! Se ha generado un enlace público para ${entityType === 'team' ? 'tu equipo' : 'tu tarea'}`);
        } else {
          success('Compartir desactivado. Todas las invitaciones han sido revocadas');
          setGuestTokens([]);
          setInvitationName('');
        }
      } else {
        const errorMsg = result.error || 'Error al cambiar el estado de compartición.';
        setError(errorMsg);
        showError('Error', errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [taskId, isShared, commentsEnabled, success, showError, isSubmitting, guestTokens.length, showDisableWarning, entityType]);

  const handleCancelDisable = useCallback(() => {
    setShowDisableWarning(false);
  }, []);

  const handleToggleTokenComments = useCallback(async (tokenId: string, currentValue: boolean, tokenName?: string) => {
    // Optimistic update
    setGuestTokens(prev => prev.map(t =>
      t.id === tokenId ? { ...t, commentsEnabled: !currentValue } : t
    ));

    const result = await updateTokenCommentsEnabledAction({
      taskId,
      tokenId,
      commentsEnabled: !currentValue,
    });

    if (result.success) {
      const displayName = tokenName || 'Invitado';
      if (!currentValue) {
        success(`"${displayName}" ahora puede comentar`);
      } else {
        success(`"${displayName}" ahora está en modo solo lectura`);
      }
    } else {
      // Revert on error
      setGuestTokens(prev => prev.map(t =>
        t.id === tokenId ? { ...t, commentsEnabled: currentValue } : t
      ));
      const errorMsg = result.error || 'Error al actualizar permisos.';
      showError('Error', errorMsg);
    }
  }, [taskId, success, showError]);

  const handleGenerateInvitation = useCallback(async () => {
    if (isAtLimit || !invitationName.trim()) {
      if (!invitationName.trim()) {
        showError('Error', 'Ingresa un nombre para la invitación');
      }
      return;
    }

    setIsGenerating(true);
    setError(null);
    const result = await generateGuestTokenAction({ taskId, tokenName: invitationName.trim(), entityType });
    if (result.success) {
      success(`¡Invitación creada! Clave de acceso para "${invitationName.trim()}" lista`);
      setInvitationName('');
      await loadShareData();
    } else {
      const errorMsg = result.error || 'Error al crear la invitación.';
      setError(errorMsg);
      showError('Error al crear invitación', errorMsg);
    }
    setIsGenerating(false);
  }, [taskId, invitationName, isAtLimit, loadShareData, success, showError, entityType]);

  const handleRevokeToken = useCallback((tokenId: string, tokenUserName?: string) => {
    const displayName = tokenUserName || 'Invitado';

    openConfirm({
      title: `¿Revocar acceso de "${displayName}"?`,
      description: `Esta persona ya no podrá acceder ${entityType === 'team' ? 'al equipo compartido' : 'a la tarea compartida'}. Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Revocar acceso',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setIsSubmitting(true);
        const result = await revokeGuestTokenAction({ taskId, tokenId, entityType });
        if (result.success) {
          success(`Acceso de "${displayName}" revocado`);
          await loadShareData();
        } else {
          const errorMsg = result.error || 'Error al revocar la invitación.';
          showError('Error al revocar', errorMsg);
        }
        setIsSubmitting(false);
      },
    });
  }, [taskId, loadShareData, success, showError, openConfirm, entityType]);

  const handleCopyLink = useCallback((url: string, label?: string) => {
    navigator.clipboard.writeText(url);
    setCopiedItem(url);
    success(label ? `Enlace de "${label}" copiado` : '¡Enlace copiado!');
    setTimeout(() => setCopiedItem(null), 2000);
  }, [success]);

  const handleCopyToken = useCallback((token: GuestToken) => {
    navigator.clipboard.writeText(token.token);
    setCopiedItem(`token-${token.id}`);
    success(`Token de acceso para "${token.tokenName || token.guestName || 'Invitado'}" copiado`);
    setTimeout(() => setCopiedItem(null), 2000);
  }, [success]);

  const guestTaskUrl = buildGuestTaskUrl(taskId);

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      mode="view"
      title={`Compartir ${entityLabelCapital}`}
      description={`Gestiona quién puede acceder a "${taskName}"`}
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
          {/* Section: Global Configuration */}
          <div className={styles.shareSection}>
            {/* Toggle para compartir */}
            <div className={styles.shareOption}>
              <div className={styles.shareOptionHeader}>
                <Link2 size={18} className={styles.shareOptionIcon} />
                <div className={styles.shareOptionText}>
                  <label htmlFor="enable-sharing" className={styles.shareLabel}>
                    Habilitar enlace compartido
                  </label>
                  <p className={styles.shareDescription}>
                    {isShared
                      ? `Este ${entityLabel} es accesible mediante enlace público`
                      : 'Activa para generar un enlace de acceso público'
                    }
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

            {/* Warning when disabling with active tokens */}
            {showDisableWarning && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} className={styles.warningIcon} />
                <div className={styles.warningContent}>
                  <p className={styles.warningText}>
                    <strong>¿Desactivar acceso compartido?</strong>
                  </p>
                  <p className={styles.warningSubtext}>
                    Se revocarán {guestTokens.length} {guestTokens.length === 1 ? 'invitación activa' : 'invitaciones activas'}. Los invitados perderán acceso inmediatamente.
                  </p>
                  <div className={styles.warningActions}>
                    <button
                      onClick={handleCancelDisable}
                      className={styles.warningButtonCancel}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleToggleSharing}
                      className={styles.warningButtonConfirm}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Desactivando...' : 'Sí, desactivar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Labels explicativos cuando está compartido */}
          </div>

          {isShared && !showDisableWarning && (
            <>
              <div className={styles.divider} />

              {/* Section: Master Link */}
              <div className={styles.shareSection}>
                <div className={styles.shareLink}>
                  <label className={styles.shareLinkLabel}>
                    Enlace de acceso
                  </label>
                  <div className={styles.shareLinkInputWrapper}>
                    <input
                      type="text"
                      readOnly
                      value={guestTaskUrl}
                      className={styles.shareLinkInput}
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={() => handleCopyLink(guestTaskUrl)}
                      className={styles.shareLinkCopyButton}
                      disabled={isSubmitting}
                      title="Copiar enlace"
                    >
                      {copiedItem === guestTaskUrl ? (
                        <CheckIcon size={16} className={styles.iconSuccess} />
                      ) : (
                        <CopyIcon size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              {/* Section: Guest Management */}
              <div className={styles.shareSection}>
                <div className={styles.invitationHeader}>
                  <h3 className={styles.invitationTitle}>
                    Accesos Activos
                  </h3>
                  <span className={cn(
                    styles.invitationCount,
                    isAtLimit && styles.invitationCountLimit
                  )}>
                    {guestTokens.length}/{MAX_INVITATIONS}
                  </span>
                </div>

                {/* Helper tip explaining the feature */}
                <div className={styles.shareHelpTip}>
                  <Info size={14} className={styles.shareHelpIcon} />
                  <p className={styles.shareHelpText}>
                    Cada invitación tiene permisos independientes. El icono <strong>💬</strong> verde indica que puede comentar; gris indica solo lectura.
                  </p>
                </div>

                {/* Legend for action icons */}
                {guestTokens.length > 0 && (
                  <div className={styles.invitationLegend}>
                    <div className={styles.legendItem}>
                      <span className={cn(styles.legendIcon, styles.legendIconActive)}>
                        <MessageSquare size={10} />
                      </span>
                      Puede comentar
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendIcon}>
                        <MessageSquare size={10} />
                      </span>
                      Solo lectura
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendIcon}>
                        <CopyIcon size={10} />
                      </span>
                      Copiar token
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendIcon}>
                        <Trash2 size={10} />
                      </span>
                      Revocar
                    </div>
                  </div>
                )}

                {/* Invitation List - Compact Table-like Rows */}
                {guestTokens.length > 0 ? (
                  <div className={styles.invitationList}>
                    {guestTokens.map((token) => (
                      <div key={token.id} className={styles.invitationRow}>
                        <GradientAvatar
                          seed={token.tokenName || token.guestName || token.id}
                          size="sm"
                          animated={false}
                        />
                        <div className={styles.invitationInfo}>
                          <span className={styles.invitationName}>
                            {token.tokenName || token.guestName || 'Invitado'}
                          </span>
                          <span className={styles.invitationDate}>
                            {formatDate(token.createdAt)}
                            {token.expiresAt && (
                              <span className={styles.invitationExpiry}>
                                {' · '}<TokenCountdown expiresAt={token.expiresAt} />
                              </span>
                            )}
                          </span>
                        </div>
                        <div className={styles.invitationToken}>
                          <code className={styles.maskedToken}>
                            {maskToken(token.token)}
                          </code>
                        </div>
                        <div className={styles.invitationActions}>
                          {/* Toggle para comentarios por acceso */}
                          <button
                            onClick={() => handleToggleTokenComments(
                              token.id,
                              token.commentsEnabled,
                              token.tokenName || token.guestName || undefined
                            )}
                            className={cn(
                              styles.invitationActionButton,
                              token.commentsEnabled && styles.invitationActionActive
                            )}
                            disabled={isSubmitting}
                            title={token.commentsEnabled ? 'Puede comentar (clic para desactivar)' : 'Solo lectura (clic para permitir comentar)'}
                          >
                            <MessageSquare size={14} className={token.commentsEnabled ? styles.iconActive : undefined} />
                          </button>
                          <button
                            onClick={() => handleCopyToken(token)}
                            className={styles.invitationActionButton}
                            disabled={isSubmitting}
                            title="Copiar token de acceso"
                          >
                            {copiedItem === `token-${token.id}` ? (
                              <CheckIcon size={14} className={styles.iconSuccess} />
                            ) : (
                              <CopyIcon size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleRevokeToken(token.id, token.tokenName || token.guestName || undefined)}
                            className={cn(styles.invitationActionButton, styles.invitationActionDanger)}
                            disabled={isSubmitting}
                            title="Revocar acceso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyInvitations}>
                    <p className={styles.emptyText}>
                      No hay invitaciones activas
                    </p>
                    <p className={styles.emptySubtext}>
                      Crea una invitación para que otros puedan acceder con su clave única
                    </p>
                  </div>
                )}

                {/* Create Invitation Form - Footer */}
                <div className={styles.createInvitationForm}>
                  <input
                    type="text"
                    value={invitationName}
                    onChange={(e) => setInvitationName(e.target.value)}
                    placeholder={isAtLimit ? 'Límite de invitaciones alcanzado' : 'Nombre para la invitación (ej. Cliente)'}
                    className={styles.createInvitationInput}
                    disabled={isSubmitting || isGenerating || isAtLimit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isAtLimit && invitationName.trim()) {
                        handleGenerateInvitation();
                      }
                    }}
                  />
                  <button
                    onClick={handleGenerateInvitation}
                    disabled={isSubmitting || isGenerating || isAtLimit || !invitationName.trim()}
                    className={cn(
                      styles.createInvitationButton,
                      isAtLimit && styles.createInvitationButtonDisabled
                    )}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className={styles.spinnerIcon} />
                        <span>Creando...</span>
                      </>
                    ) : isAtLimit ? (
                      <span>Límite alcanzado</span>
                    ) : (
                      <>
                        <PlusCircle size={16} />
                        <span>Crear Invitación</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {!isShared && !showDisableWarning && (
            <div className={styles.infoMessage}>
              <p>
                Activa &quot;Habilitar enlace compartido&quot; para generar invitaciones y compartir {entityType === 'team' ? 'este equipo' : 'esta tarea'} con personas externas.
              </p>
            </div>
          )}
        </div>
      )}
    </CrudDialog>
  );
}
