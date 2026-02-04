"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserDataStore } from "@/stores/userDataStore";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTaskActivity } from "@/lib/taskUtils";
import { useDataStore } from "@/stores/dataStore";
import styles from "../../styles/StatusDropdown.module.scss";

// Status configuration
const STATUS_OPTIONS = [
  { value: "Por Iniciar", label: "Por Iniciar", color: "#9ca3af" },
  { value: "En Proceso", label: "En Proceso", color: "#3b82f6" },
  { value: "Backlog", label: "Backlog", color: "#f59e0b" },
  { value: "Por Finalizar", label: "Por Finalizar", color: "#8b5cf6" },
  { value: "Finalizado", label: "Finalizado", color: "#22c55e" },
  { value: "Cancelado", label: "Cancelado", color: "#ef4444" },
] as const;

type StatusValue = typeof STATUS_OPTIONS[number]["value"];

interface StatusDropdownProps {
  taskId: string;
  currentStatus: string;
  createdBy?: string; // ID of the user who created the task (optional)
  userId: string; // Current user ID
  onStatusChange?: (newStatus: string) => void;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  taskId,
  currentStatus,
  createdBy,
  userId,
  onStatusChange,
}) => {
  // ✅ Obtener userId desde userDataStore y isAdmin desde AuthContext
  const currentUserId = useUserDataStore((state) => state.userData?.userId || '');
  const { isAdmin } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if user can edit - Only admins or the task creator can edit
  const isTaskCreator = createdBy ? (userId || currentUserId) === createdBy : false;
  const canEdit = isAdmin || isTaskCreator;

  // Get current status config
  const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle status change
  const handleStatusChange = useCallback(async (newStatus: StatusValue) => {
    if (newStatus === currentStatus || isUpdating) return;

    const previousStatus = currentStatus;
    setIsUpdating(true);
    setIsOpen(false);

    // ✅ OPTIMISTIC UPDATE: Actualizar UI inmediatamente
    const { updateTask } = useDataStore.getState();
    updateTask(taskId, {
      status: newStatus,
      lastActivity: new Date().toISOString(),
    });

    // Callback inmediato para UI responsiva
    onStatusChange?.(newStatus);

    try {
      // Persistir en Firestore (en background)
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        lastActivity: serverTimestamp(),
      });

      // Update activity
      await updateTaskActivity(taskId, "status_change");
    } catch {
      // ❌ ROLLBACK: Si falla, revertir al estado anterior
      updateTask(taskId, {
        status: previousStatus,
        lastActivity: new Date().toISOString(),
      });
      onStatusChange?.(previousStatus);
    } finally {
      setIsUpdating(false);
    }
  }, [taskId, currentStatus, isUpdating, onStatusChange]);

  // Toggle handler
  const handleToggle = useCallback(() => {
    if (canEdit && !isUpdating) {
      setIsOpen(!isOpen);
    }
  }, [canEdit, isUpdating, isOpen]);

  // Option click handler factory
  const createOptionHandler = useCallback((value: StatusValue) => {
    return () => handleStatusChange(value);
  }, [handleStatusChange]);

  // Dropdown animations
  const dropdownVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.95 },
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.trigger} ${!canEdit ? styles.disabled : ""}`}
        onClick={handleToggle}
        disabled={!canEdit || isUpdating}
        style={{
          "--status-color": currentStatusConfig.color,
        } as React.CSSProperties}
      >
        <span 
          className={styles.statusDot}
          style={{ backgroundColor: currentStatusConfig.color }}
        />
        <span className={styles.statusLabel}>{currentStatusConfig.label}</span>
        {canEdit && (
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${isOpen ? styles.open : ""}`}
          />
        )}
        {isUpdating && <span className={styles.spinner} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdown}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${option.value === currentStatus ? styles.selected : ""}`}
                onClick={createOptionHandler(option.value)}
              >
                <span
                  className={styles.optionDot}
                  style={{ backgroundColor: option.color }}
                />
                <span className={styles.optionLabel}>{option.label}</span>
                {option.value === currentStatus && (
                  <Check size={14} className={styles.checkIcon} />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
