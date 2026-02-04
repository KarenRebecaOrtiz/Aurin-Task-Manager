/**
 * TaskActions Component
 *
 * Muestra las acciones disponibles para una tarea seleccionada.
 * Incluye timer, compartir, editar, etc. según permisos.
 *
 * @module command-palette/components/actions/TaskActions
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  PenLine,
  Share2,
  Pencil,
  Trash2,
  MessageCircle,
  Copy,
  Sparkles,
  Eye,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDataStore } from '@/stores/userDataStore';
import { useDataStore } from '@/stores/dataStore';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import type { ActionCommandItem } from '../../types/commandPalette.types';
import { CommandItem } from '../items/CommandItem';
import { QUICK_AI_SUGGESTIONS } from '../../constants/actions';
import styles from '../../styles/command-palette.module.scss';

export interface TaskActionsProps {
  taskId: string;
  selectedIndex: number;
  baseIndex: number; // Índice base para la selección global
  onView?: () => void;
  onAddManualTime?: () => void;
  onStartTimer?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onEditClient?: () => void;
  onOpenChat?: () => void;
  onAIQuestion?: (prompt: string) => void;
  onActionClick: (action: ActionCommandItem, index: number) => void;
}

export function TaskActions({
  taskId,
  selectedIndex,
  baseIndex,
  onView,
  onAddManualTime,
  onStartTimer,
  onShare,
  onEdit,
  onDelete,
  onEditClient,
  onOpenChat,
  onAIQuestion,
  onActionClick,
}: TaskActionsProps) {
  const { isAdmin } = useAuth();
  const currentUserId = useUserDataStore((state) => state.userData?.userId || '');
  const tasks = useDataStore((state) => state.tasks);
  const { success: showSuccess } = useSonnerToast();

  // Verificar si el usuario está involucrado en la tarea
  const isInvolved = useMemo(() => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;

    return (
      task.CreatedBy === currentUserId ||
      (task.AssignedTo || []).includes(currentUserId) ||
      (task.LeadedBy || []).includes(currentUserId)
    );
  }, [tasks, taskId, currentUserId]);

  // Copiar enlace de la tarea
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/dashboard/tasks/${taskId}`;
    navigator.clipboard.writeText(url);
    showSuccess('Enlace copiado al portapapeles');
  }, [taskId, showSuccess]);

  // Construir lista de acciones según permisos
  const actions = useMemo((): ActionCommandItem[] => {
    const items: ActionCommandItem[] = [];

    // Ver Tarea (siempre disponible como primera opción)
    if (onView) {
      items.push({
        id: 'view',
        type: 'action',
        title: 'Ver Tarea',
        subtitle: 'Abrir y generar enlace compartible',
        icon: <Eye size={18} />,
        action: onView,
        shortcut: 'Enter',
      });
    }

    // Timer actions (solo para involucrados o admins)
    if (isInvolved || isAdmin) {
      if (onStartTimer) {
        items.push({
          id: 'start-timer',
          type: 'action',
          title: 'Iniciar Timer',
          subtitle: 'Comienza el cronómetro en tiempo real',
          icon: <Clock size={18} />,
          action: onStartTimer,
        });
      }

      if (onAddManualTime) {
        items.push({
          id: 'add-time',
          type: 'action',
          title: 'Añadir Tiempo Manual',
          subtitle: 'Ingresa tiempo retroactivo',
          icon: <PenLine size={18} />,
          action: onAddManualTime,
          shortcut: '⌥⇧T',
        });
      }
    }

    // Chat
    if (onOpenChat) {
      items.push({
        id: 'open-chat',
        type: 'action',
        title: 'Abrir Chat',
        subtitle: 'Ver conversación de la tarea',
        icon: <MessageCircle size={18} />,
        action: onOpenChat,
      });
    }

    // Copy link (disponible para todos)
    items.push({
      id: 'copy-link',
      type: 'action',
      title: 'Copiar Enlace',
      subtitle: 'Copia el enlace al portapapeles',
      icon: <Copy size={18} />,
      action: handleCopyLink,
    });

    // Share (solo admins)
    if (isAdmin && onShare) {
      items.push({
        id: 'share',
        type: 'action',
        title: 'Compartir Tarea',
        subtitle: 'Genera un enlace público',
        icon: <Share2 size={18} />,
        action: onShare,
        shortcut: '⌥⇧S',
      });
    }

    // Edit (involucrados y admins)
    if ((isInvolved || isAdmin) && onEdit) {
      items.push({
        id: 'edit',
        type: 'action',
        title: 'Editar Tarea',
        subtitle: 'Modificar detalles',
        icon: <Pencil size={18} />,
        action: onEdit,
        shortcut: '⌥⇧E',
      });
    }

    // Edit Client (solo admins)
    if (isAdmin && onEditClient) {
      items.push({
        id: 'edit-client',
        type: 'action',
        title: 'Editar Cuenta',
        subtitle: 'Modificar datos de la cuenta',
        icon: <Building2 size={18} />,
        action: onEditClient,
      });
    }

    // Delete (solo admins)
    if (isAdmin && onDelete) {
      items.push({
        id: 'delete',
        type: 'action',
        title: 'Eliminar Tarea',
        subtitle: 'Eliminar permanentemente',
        icon: <Trash2 size={18} />,
        action: onDelete,
        variant: 'danger',
      });
    }

    return items;
  }, [
    isAdmin,
    isInvolved,
    onView,
    onStartTimer,
    onAddManualTime,
    onOpenChat,
    onShare,
    onEdit,
    onEditClient,
    onDelete,
    handleCopyLink,
  ]);

  // AI suggestions
  const aiActions = useMemo((): ActionCommandItem[] => {
    if (!onAIQuestion) return [];

    return QUICK_AI_SUGGESTIONS.map((suggestion) => ({
      id: `ai-${suggestion.id}`,
      type: 'action' as const,
      title: suggestion.label,
      subtitle: 'Pregunta rápida con IA',
      icon: <Sparkles size={18} />,
      action: () => onAIQuestion(suggestion.prompt),
      variant: 'ai' as const,
    }));
  }, [onAIQuestion]);

  return (
    <div className={styles.content}>
      {/* Acciones principales */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Acciones Rápidas</span>
          <span className={styles.sectionCount}>{actions.length}</span>
        </div>
        {actions.map((action, index) => (
          <CommandItem
            key={action.id}
            item={action}
            index={baseIndex + index}
            isSelected={selectedIndex === baseIndex + index}
            onClick={() => onActionClick(action, baseIndex + index)}
          />
        ))}
      </div>

      {/* AI Suggestions */}
      {aiActions.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Preguntas Rápidas (IA)</span>
            <span className={styles.sectionCount}>{aiActions.length}</span>
          </div>
          {aiActions.map((action, index) => (
            <CommandItem
              key={action.id}
              item={action}
              index={baseIndex + actions.length + index}
              isSelected={selectedIndex === baseIndex + actions.length + index}
              onClick={() => onActionClick(action, baseIndex + actions.length + index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskActions;
