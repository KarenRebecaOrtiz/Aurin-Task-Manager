"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/modules/shared/components/atoms/Avatar/UserAvatar";
import { ClientAvatar } from "@/modules/shared/components/atoms/Avatar/ClientAvatar";
import { TODO_ANIMATIONS } from "@/modules/header/components/ui/ToDoDynamic/constants/animation.constants";
import { StatusDropdown } from "../molecules/StatusDropdown";
import { TimeBreakdown } from "../molecules/TimeBreakdown";
import styles from "../../styles/ChatHeader.module.scss";
import type { Task, Message } from "../../types";

interface ChatHeaderProps {
  task: Task;
  clientName: string;
  clientImageUrl?: string;
  users?: { id: string; fullName: string; imageUrl: string }[];
  messages?: Message[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  task,
  clientName,
  clientImageUrl,
  users = [],
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

  // Obtener usuarios del equipo
  const teamMembers = useMemo(() => {
    const memberIds = [
      ...task.LeadedBy,
      ...task.AssignedTo,
    ];
    return users.filter(user => memberIds.includes(user.id));
  }, [task.LeadedBy, task.AssignedTo, users]);

  // Leer horas totales desde el campo de la tarea (fuente de verdad)
  // NO desde mensajes, porque con paginación los mensajes antiguos no están cargados
  const totalHours = useMemo(() => {
    return Math.round(task.totalHours || 0);
  }, [task.totalHours]);

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
            <span className={styles.separator}>/</span>
            {task.project}
          </div>
        </div>
      </div>

      {/* Task Info */}
      <div className={styles.taskInfo}>
        <ClientAvatar
          src={clientImageUrl}
          alt={clientName}
          fallback={clientName.substring(0, 2).toUpperCase()}
          size="lg"
          className="mr-3 flex-shrink-0"
          client={{
            id: task.clientId,
            name: clientName,
            imageUrl: clientImageUrl
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className={styles.taskTitle}>{task.name}</h1>
          <p className={styles.taskDescription}>{task.description}</p>
        </div>
      </div>

      {/* Show Details Toggle */}
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

      {/* Collapsible Details */}
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
              {/* Status Card - Now with Dropdown */}
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
                />
              </motion.div>

              {/* Team Card - Improved Avatar Group */}
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

              {/* Dates Card - Now with White Pill */}
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

              {/* Time Registered Card - Now with Breakdown Dropdown */}
              <motion.div 
                className={styles.detailCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <div className={styles.detailLabel}>Tiempo Registrado</div>
                <TimeBreakdown
                  totalHours={totalHours}
                  memberHours={task.memberHours}
                  teamMembers={teamMembers}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
