"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, Clock } from "lucide-react";
import Image from "next/image";
import UserAvatar from "@/components/ui/UserAvatar";
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

  // Calcular horas totales registradas desde mensajes (redondeado sin decimales)
  const totalHours = useMemo(() => {
    const total = messages.reduce((sum, msg) => {
      return sum + (msg.hours || 0);
    }, 0);
    return Math.round(total);
  }, [messages]);

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
        {clientImageUrl && (
          <Image
            src={clientImageUrl}
            alt={clientName}
            width={40}
            height={40}
            style={{ borderRadius: '50%', marginRight: '12px', flexShrink: 0 }}
          />
        )}
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
      {isDetailsOpen && (
        <div className={styles.details}>
          <div className={styles.detailsContent}>
            {/* Status Card */}
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Estado</div>
              <button
                className={`${styles.statusBadge} ${getStatusClass(task.status)}`}
              >
                {formatStatus(task.status)}
              </button>
            </div>

            {/* Team Card */}
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Equipo</div>
              <button className={styles.teamButton}>
                <div className={styles.avatarGroup}>
                  {teamMembers.slice(0, 6).map((member) => (
                    <UserAvatar
                      key={member.id}
                      userId={member.id}
                      imageUrl={member.imageUrl}
                      userName={member.fullName}
                      size="tiny"
                    />
                  ))}
                  {teamMembers.length > 6 && (
                    <div
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
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Dates Card */}
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Fechas</div>
              <div className={styles.detailValue}>
                {formatDateRange(task.startDate, task.endDate)}
              </div>
            </div>

            {/* Time Registered Card */}
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>Tiempo Registrado</div>
              <div className={`${styles.detailValue} ${styles.timeLogged}`}>
                <Clock size={16} />
                <span>{totalHours} {totalHours !== 1 ? 'horas' : 'hora'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
