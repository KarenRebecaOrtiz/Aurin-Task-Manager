"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, Calendar, Bell, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/modules/shared/components/atoms/Avatar/UserAvatar";
import { TODO_ANIMATIONS } from "@/modules/header/components/ui/ToDoDynamic/constants/animation.constants";
import { StatusDropdown } from "../molecules/StatusDropdown";
import { TimeBreakdown } from "../molecules/TimeBreakdown";
import { TimerDropdown } from "../../timer/components/molecules/TimerDropdown";
import { ShareButton } from "../atoms/ShareButton";
import { SharedBadge } from "@/modules/shared/components/ui";
import { useDataStore } from "@/stores/dataStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  NotificationPreferencesDialog,
  useNotificationPreferences,
} from "@/modules/config/notification-preferences";
import styles from "../../styles/ChatHeader.module.scss";
import type { Task, Message } from "../../types";

interface ChatHeaderProps {
  task: Task;
  clientName: string;
  clientImageUrl?: string;
  users?: { id: string; fullName: string; imageUrl: string }[]; // Ahora opcional - fallback a dataStore
  messages?: Message[];
  userId: string;
  userName: string;
  onOpenManualTimeEntry?: () => void;
  isPublicView?: boolean; // Nueva prop para ocultar elementos privados
  isTeamChat?: boolean; // Para chats de equipo - oculta timer, status, fechas
}

// Generate a consistent color from a string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 55%, 55%)`;
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  task,
  clientName,
  clientImageUrl,
  users, // Ya no tiene default value
  userId,
  userName,
  onOpenManualTimeEntry,
  isPublicView = false, // Por defecto es vista privada
  isTeamChat = false, // Por defecto es chat de tarea
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [clientImgError, setClientImgError] = useState(false);

  // ✅ Auth context para verificar si es admin
  const { isAdmin } = useAuth();

  // ✅ Hook para preferencias de notificaciones
  const { open: openNotificationPreferencesDialog } = useNotificationPreferences();

  // Handler para abrir el diálogo con el entityType correcto
  const handleOpenNotificationPreferences = useCallback(() => {
    const entityType = isTeamChat ? 'team' : 'task';
    openNotificationPreferencesDialog(entityType, task.id, task.name);
  }, [isTeamChat, task.id, task.name, openNotificationPreferencesDialog]);

  // ✅ Si no se pasan users como prop, obtenerlos del dataStore centralizado
  const storeUsers = useDataStore((state) => state.users);
  const effectiveUsers = users || storeUsers;

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const startDate = new Date(start).toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
    });
    const endDate = new Date(end).toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
    });
    return `${startDate} - ${endDate}`;
  };

  // Obtener usuarios del equipo desde dataStore si no se pasaron como prop
  const teamMembers = useMemo(() => {
    const memberIds = [
      ...(task.LeadedBy || []),
      ...(task.AssignedTo || []),
    ];
    return effectiveUsers
      .filter(user => memberIds.includes(user.id))
      .map(user => ({
        ...user,
        status: (user as any).status,
        lastActive: (user as any).lastActive,
      }));
  }, [task.LeadedBy, task.AssignedTo, effectiveUsers]);

  // Leer horas totales desde el nuevo campo timeTracking (con fallback a campo legacy)
  const totalHours = useMemo(() => {
    if (task.timeTracking) {
      const { totalHours: hours, totalMinutes: minutes } = task.timeTracking;
      return hours + (minutes || 0) / 60;
    }
    return task.totalHours || 0;
  }, [task.timeTracking, task.totalHours]);

  // Get member hours with fallback
  const memberHours = useMemo(() => {
    if (task.timeTracking?.memberHours) {
      return task.timeTracking.memberHours;
    }
    return task.memberHours || {};
  }, [task.timeTracking, task.memberHours]);

  const toggleDetails = useCallback(() => {
    setIsDetailsOpen(prev => !prev);
  }, []);

  const toggleDescription = useCallback(() => {
    setIsDescriptionExpanded(prev => !prev);
  }, []);

  // Client initials for fallback avatar
  const clientInitials = useMemo(() => {
    return (clientName || '')
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [clientName]);

  const clientAvatarColor = useMemo(() => stringToColor(clientName || ''), [clientName]);

  // Format total hours for mobile display
  const formattedTime = useMemo(() => {
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    if (hours === 0 && minutes === 0) return '0h';
    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  }, [totalHours]);

  return (
    <div className={styles.header}>
      {/* ================================================================ */}
      {/* MOBILE LAYOUT (< 768px) */}
      {/* ================================================================ */}
      <div className={styles.mobileHeader}>
        {/* Client Avatar - centered at top */}
        <div className={styles.mobileAvatarSection}>
          {clientImageUrl && !clientImgError ? (
            <img
              src={clientImageUrl}
              alt={clientName}
              className={styles.clientAvatar}
              onError={() => setClientImgError(true)}
            />
          ) : (
            <div
              className={styles.clientInitials}
              style={{ backgroundColor: clientAvatarColor }}
            >
              {clientInitials}
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        <div className={styles.mobileBreadcrumb}>
          {clientName}
          {!isTeamChat && task.project && (
            <>
              <span className={styles.separator}>/</span>
              {task.project}
            </>
          )}
        </div>

        {/* Task Title */}
        <div className={styles.mobileTitleRow}>
          <h1 className={styles.mobileTitle}>{task.name}</h1>
          {!isPublicView && task.shared && <SharedBadge iconSize={12} />}
        </div>

        {/* Description - tap to expand */}
        {task.description && (
          <p
            className={`${styles.mobileDescription} ${isDescriptionExpanded ? styles.mobileDescriptionExpanded : ''}`}
            onClick={toggleDescription}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleDescription()}
          >
            {task.description}
          </p>
        )}

        {/* Meta Row: Status + Date + Time + Notifications + Share */}
        {!isPublicView && (
          <div className={styles.mobileMetaRow}>
            {!isTeamChat && (
              <StatusDropdown
                taskId={task.id}
                currentStatus={task.status}
                createdBy={task.CreatedBy}
                userId={userId}
              />
            )}
            {!isTeamChat && (
              <div className={styles.mobileDatePill}>
                <Calendar size={12} className={styles.mobileDateIcon} />
                {formatDateRange(task.startDate, task.endDate) || (
                  <span className={styles.noDate}>Sin fechas</span>
                )}
              </div>
            )}
            {!isTeamChat && (
              <div className={styles.mobileTimePill}>
                <Clock size={12} />
                <span>{formattedTime}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleOpenNotificationPreferences}
              className={styles.mobileActionBtn}
              aria-label="Preferencias de notificaciones"
              title="Preferencias de notificaciones"
            >
              <Bell size={14} />
            </button>
            {isAdmin && (
              <ShareButton
                taskId={task.id}
                taskName={task.name}
                className={styles.mobileActionBtn}
                entityType={isTeamChat ? 'team' : 'task'}
              />
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* DESKTOP LAYOUT (>= 768px) */}
      {/* ================================================================ */}
      <div className={styles.desktopHeader}>
        {/* Top Section */}
        <div className={styles.topSection}>
          <div className={styles.leftSection}>
            <div className={styles.breadcrumb}>
              {clientName}
              {!isTeamChat && task.project && (
                <>
                  <span className={styles.separator}>/</span>
                  {task.project}
                </>
              )}
            </div>
          </div>

          {/* Action Buttons - Share & Timer */}
          {!isPublicView && (
            <div className={styles.timerWrapper}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleOpenNotificationPreferences}
                  className={styles.notificationButton}
                  aria-label="Preferencias de notificaciones"
                  title="Preferencias de notificaciones"
                >
                  <Bell size={18} />
                </button>
                {isAdmin && (
                  <ShareButton
                    taskId={task.id}
                    taskName={task.name}
                    className={styles.shareButton}
                    entityType={isTeamChat ? 'team' : 'task'}
                  />
                )}
                {!isTeamChat && (
                  <TimerDropdown
                    taskId={task.id}
                    userId={userId}
                    userName={userName}
                    onOpenManualEntry={onOpenManualTimeEntry}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Task Info */}
        <div className={styles.taskInfo}>
          <div className={styles.taskInfoContent}>
            <div className={styles.titleRow}>
              <h1 className={styles.taskTitle}>{task.name}</h1>
              {!isPublicView && task.shared && <SharedBadge iconSize={14} />}
            </div>
            <p className={`${styles.taskDescription} ${isDetailsOpen ? styles.expanded : styles.collapsed}`}>
              {task.description}
            </p>
          </div>
        </div>

        {/* Show Details Toggle - Solo en vista privada */}
        {!isPublicView && (
          <div className={styles.detailsToggle}>
            <button
              onClick={toggleDetails}
              className={styles.toggleButton}
            >
              <span>Mostrar Detalles</span>
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${isDetailsOpen ? styles.open : ""}`}
              />
            </button>
          </div>
        )}

        {/* Collapsible Details - Solo en vista privada */}
        {!isPublicView && (
          <AnimatePresence>
            {isDetailsOpen && (
            <motion.div
              className={styles.details}
              initial={TODO_ANIMATIONS.content.initial}
              animate={TODO_ANIMATIONS.content.animate}
              exit={{ opacity: 0, height: 0 }}
              transition={TODO_ANIMATIONS.transitions.desktop}
            >
              <motion.div
                className={styles.detailsContent}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {/* Status Card */}
                {!isTeamChat && (
                  <motion.div
                    className={styles.detailCard}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <div className={styles.detailLabel}>Estado</div>
                    <StatusDropdown
                      taskId={task.id}
                      currentStatus={task.status}
                      createdBy={task.CreatedBy}
                      userId={userId}
                    />
                  </motion.div>
                )}

                {/* Team Card */}
                <motion.div
                  className={styles.detailCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <div className={styles.detailLabel}>Equipo</div>
                  <div className={styles.teamContainer}>
                    <div className={styles.avatarGroup}>
                      {teamMembers.slice(0, 5).map((member, index) => (
                        <motion.div
                          key={member.id}
                          className={styles.avatarWrapper}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.25 + (index * 0.04), duration: 0.25 }}
                        >
                          <UserAvatar
                            userId={member.id}
                            imageUrl={member.imageUrl}
                            userName={member.fullName}
                            size="xs"
                            showStatus={true}
                            availabilityStatus={(member as any).status}
                            lastActive={(member as any).lastActive}
                            className={styles.miniAvatar}
                          />
                        </motion.div>
                      ))}
                      {teamMembers.length > 5 && (
                        <motion.div
                          className={styles.avatarOverflow}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.25 + (5 * 0.04), duration: 0.25 }}
                        >
                          +{teamMembers.length - 5}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Dates Card */}
                {!isTeamChat && (
                  <motion.div
                    className={styles.detailCard}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <div className={styles.detailLabel}>Fechas</div>
                    <div className={styles.datePill}>
                      <Calendar size={14} className={styles.dateIcon} />
                      {formatDateRange(task.startDate, task.endDate) || (
                        <span className={styles.noDate}>Sin fechas</span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Time Registered Card */}
                {!isTeamChat && (
                  <motion.div
                    className={styles.detailCard}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <div className={styles.detailLabel}>Tiempo Registrado</div>
                    <TimeBreakdown
                      totalHours={totalHours}
                      memberHours={memberHours}
                      teamMembers={teamMembers}
                    />
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
          </AnimatePresence>
        )}
      </div>

      {/* Diálogo de preferencias de notificaciones */}
      <NotificationPreferencesDialog />
    </div>
  );
};
