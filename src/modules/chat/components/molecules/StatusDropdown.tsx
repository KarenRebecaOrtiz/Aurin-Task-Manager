"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
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
  onStatusChange?: (newStatus: string) => void;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  taskId,
  currentStatus,
  onStatusChange,
}) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if user can edit - using 'access' metadata like AuthContext
  // Admin can always edit, creators can edit tasks they created
  const userAccess = user?.publicMetadata?.access as string | undefined;
  const isAdmin = userAccess === "admin";
  const isCreator = userAccess === "creator";
  const canEdit = isAdmin || isCreator;

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

    setIsUpdating(true);
    setIsOpen(false);

    try {
      // Update in Firestore
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        lastActivity: serverTimestamp(),
      });

      // Optimistic update in dataStore
      const { updateTask } = useDataStore.getState();
      updateTask(taskId, {
        status: newStatus,
        lastActivity: new Date().toISOString(),
      });

      // Update activity
      await updateTaskActivity(taskId, "status_change");

      // Callback
      onStatusChange?.(newStatus);
    } catch {
      // Error updating status - handled silently
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
