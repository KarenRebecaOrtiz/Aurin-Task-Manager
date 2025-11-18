"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/modules/shared/components/atoms/Avatar/UserAvatar";
import { ClientAvatar } from "@/modules/shared/components/atoms/Avatar/ClientAvatar";
import { TODO_ANIMATIONS } from "@/modules/header/components/ui/ToDoDynamic/constants/animation.constants";
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
  messages = [],
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "Sin fechas establecidas";
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

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: styles.pending,
      "in-progress": styles.inProgress,
      completed: styles.completed,
      "on-hold": styles.onHold,
    };
    return statusMap[status] || styles.pending;
  };

  const formatStatus = (status: string) => {
    const statusTranslations: Record<string, string> = {
      "pending": "Pendiente",
      "in-progress": "En Progreso",
      "completed": "Completado",
      "on-hold": "En Espera",
    };
    return statusTranslations[status] || status;
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
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
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
              {/* Status Card */}
              <motion.div 
                className={styles.detailCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <div className={styles.detailLabel}>Estado</div>
                <button
                  className={`${styles.statusBadge} ${getStatusClass(task.status)}`}
                >
                  {formatStatus(task.status)}
                </button>
              </motion.div>

              {/* Team Card */}
              <motion.div 
                className={styles.detailCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className={styles.detailLabel}>Equipo</div>
                <button className={styles.teamButton}>
                  <div className={styles.avatarGroup}>
                    {teamMembers.slice(0, 6).map((member, index) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 + (index * 0.05), duration: 0.3 }}
                      >
                        <UserAvatar
                          userId={member.id}
                          imageUrl={member.imageUrl}
                          userName={member.fullName}
                          size="tiny"
                        />
                      </motion.div>
                    ))}
                    {teamMembers.length > 6 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 + (6 * 0.05), duration: 0.3 }}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        +{teamMembers.length - 6}
                      </motion.div>
                    )}
                  </div>
                </button>
              </motion.div>

              {/* Dates Card */}
              <motion.div 
                className={styles.detailCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <div className={styles.detailLabel}>Fechas</div>
                <div className={styles.detailValue}>
                  {formatDateRange(task.startDate, task.endDate)}
                </div>
              </motion.div>

              {/* Time Registered Card */}
              <motion.div 
                className={styles.detailCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <div className={styles.detailLabel}>Tiempo Registrado</div>
                <div className={`${styles.detailValue} ${styles.timeLogged}`}>
                  <Clock size={16} />
                  <span>{totalHours} {totalHours !== 1 ? 'horas' : 'hora'}</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
