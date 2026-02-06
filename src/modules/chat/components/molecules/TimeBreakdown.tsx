"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Clock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/modules/shared/components/atoms/Avatar/UserAvatar";
import { useDataStore } from "@/stores/dataStore";
import styles from "../../styles/TimeBreakdown.module.scss";

interface TeamMember {
  id: string;
  fullName: string;
  imageUrl: string;
}

interface TimeBreakdownProps {
  totalHours: number;
  memberHours?: { [userId: string]: number };
  teamMembers?: TeamMember[]; // ✅ Ahora opcional - fallback a dataStore
}

/**
 * TimeBreakdown Component - Migrado a dataStore
 *
 * Cambios:
 * - teamMembers ahora es opcional - usa dataStore como fallback
 * - Busca miembros en dataStore por userId si no se pasan
 * - Backward compatible con código existente
 *
 * Shows total registered time with a dropdown that breaks down
 * individual time per team member.
 */
export const TimeBreakdown: React.FC<TimeBreakdownProps> = ({
  totalHours,
  memberHours = {},
  teamMembers,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ Si no se pasan teamMembers, obtener usuarios del dataStore
  const storeUsers = useDataStore((state) => state.users);
  const effectiveMembers = teamMembers || storeUsers;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format hours display
  const formatHours = useCallback((hours: number): string => {
    if (hours === 0) return "0h";

    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }, []);

  // Build member time entries with user info - usa dataStore como fallback
  // Incluye status y lastActive para los status dots
  const memberTimeEntries = useMemo(() => {
    return Object.entries(memberHours)
      .map(([userId, hours]) => {
        const member = effectiveMembers.find(m => m.id === userId)
          || storeUsers.find(m => m.id === userId);
        return {
          userId,
          hours,
          fullName: member?.fullName || "Usuario desconocido",
          imageUrl: member?.imageUrl || "/default-avatar.svg",
          status: (member as any)?.status,
          lastActive: (member as any)?.lastActive,
        };
      })
      .sort((a, b) => b.hours - a.hours); // Sort by most hours first
  }, [memberHours, effectiveMembers, storeUsers]);

  const hasMemberData = memberTimeEntries.length > 0;

  // Toggle handler
  const handleToggle = useCallback(() => {
    if (hasMemberData) {
      setIsOpen(prev => !prev);
    }
  }, [hasMemberData]);

  // Dropdown animations
  const dropdownVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.95 },
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${hasMemberData ? styles.interactive : ""}`}
        onClick={handleToggle}
        disabled={!hasMemberData}
      >
        <Clock size={16} className={styles.clockIcon} />
        <span className={styles.totalTime}>{formatHours(totalHours)}</span>
        {hasMemberData && (
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${isOpen ? styles.open : ""}`}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && hasMemberData && (
          <motion.div
            className={styles.dropdown}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Header */}
            <div className={styles.dropdownHeader}>
              <span className={styles.headerTitle}>Desglose de tiempo</span>
              <span className={styles.headerTotal}>{formatHours(totalHours)} total</span>
            </div>

            {/* Divider */}
            <div className={styles.divider} />

            {/* Member list */}
            <div className={styles.memberList}>
              {memberTimeEntries.map((entry, index) => (
                <motion.div
                  key={entry.userId}
                  className={styles.memberItem}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className={styles.memberInfo}>
                    {entry.imageUrl ? (
                      <UserAvatar
                        userId={entry.userId}
                        imageUrl={entry.imageUrl}
                        userName={entry.fullName}
                        size="xs"
                        showStatus={true}
                        availabilityStatus={entry.status}
                        lastActive={entry.lastActive}
                      />
                    ) : (
                      <div className={styles.defaultAvatar}>
                        <User size={12} />
                      </div>
                    )}
                    <span className={styles.memberName}>{entry.fullName}</span>
                  </div>
                  <div className={styles.memberHours}>
                    <span className={styles.hoursValue}>{formatHours(entry.hours)}</span>
                    <div 
                      className={styles.hoursBar}
                      style={{ 
                        width: `${Math.min((entry.hours / totalHours) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer with note */}
            <div className={styles.dropdownFooter}>
              <span className={styles.footerNote}>
                Visible para todos los miembros del equipo
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
