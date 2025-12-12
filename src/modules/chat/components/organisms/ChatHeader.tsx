"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/modules/shared/components/atoms/Avatar/UserAvatar";
import { TODO_ANIMATIONS } from "@/modules/header/components/ui/ToDoDynamic/constants/animation.constants";
import { StatusDropdown } from "../molecules/StatusDropdown";
import { TimeBreakdown } from "../molecules/TimeBreakdown";
import { TimerDropdown } from "../../timer/components/molecules/TimerDropdown";
import { ShareButton } from "../atoms/ShareButton";
import { SharedBadge } from "@/modules/shared/components/ui";
import { useDataStore } from "@/stores/dataStore";
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

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  task,
  clientName,
  users, // Ya no tiene default value
  userId,
  userName,
  onOpenManualTimeEntry,
  isPublicView = false, // Por defecto es vista privada
  isTeamChat = false, // Por defecto es chat de tarea
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    return effectiveUsers.filter(user => memberIds.includes(user.id));
  }, [task.LeadedBy, task.AssignedTo, effectiveUsers]);

  // Leer horas totales desde el nuevo campo timeTracking (con fallback a campo legacy)
  // NO desde mensajes, porque con paginación los mensajes antiguos no están cargados
  const totalHours = useMemo(() => {
    // Prefer new timeTracking structure
    if (task.timeTracking) {
      const { totalHours: hours, totalMinutes: minutes } = task.timeTracking;
      return Math.round(hours + (minutes || 0) / 60);
    }
    // Fallback to legacy field
    return Math.round(task.totalHours || 0);
  }, [task.timeTracking, task.totalHours]);

  // Get member hours with fallback
  const memberHours = useMemo(() => {
    // Prefer new timeTracking.memberHours
    if (task.timeTracking?.memberHours) {
      return task.timeTracking.memberHours;
    }
    // Fallback to legacy field
    return task.memberHours || {};
  }, [task.timeTracking, task.memberHours]);

  const toggleDetails = useCallback(() => {
    setIsDetailsOpen(prev => !prev);
  }, []);

  return (
    <div className={styles.header}>
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
        
        {/* Action Buttons - Share & Timer (hidden on mobile, timer shown in InputChat instead) */}
        {/* Timer solo para tareas, no para equipos */}
        {!isPublicView && (
          <div className={styles.timerWrapper}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShareButton
                taskId={task.id}
                taskName={task.name}
                className={styles.shareButton}
                entityType={isTeamChat ? 'team' : 'task'}
              />
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
              {/* Status Card - Now with Dropdown (solo para tareas, no equipos) */}
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

              {/* Team Card - Improved Avatar Group (visible para tareas y equipos) */}
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

              {/* Dates Card - Now with White Pill (solo para tareas, no equipos) */}
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

              {/* Time Registered Card - Now with Breakdown Dropdown (solo para tareas, no equipos) */}
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
  );
};
