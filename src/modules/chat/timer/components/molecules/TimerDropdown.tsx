/**
 * Timer Module - Timer Dropdown Component
 *
 * Dropdown button that shows timer actions based on current state.
 * When idle: shows "Start Timer" and "Add Manual Time"
 * When running: shows elapsed time, "Pause", "Finish & Send", "Discard"
 *
 * On mobile (< 768px): renders as a drawer instead of dropdown
 *
 * @module timer/components/molecules/TimerDropdown
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Pause, Send, Trash2, PenLine } from 'lucide-react';
import { dropdownAnimations } from '@/modules/shared/components/molecules/Dropdown/animations';
import { useTimerState } from '../../hooks/useTimerState';
import { useTimerActions } from '../../hooks/useTimerActions';
import { useTimerStateStore } from '../../stores/timerStateStore';
import { TimerStatus } from '../../types/timer.types';
import type { TimerSwitchAction } from '../../types/timer.types';
import { ConfirmTimerSwitch } from '../organisms/ConfirmTimerSwitch';
import { formatSecondsToHHMMSS } from '../../utils/timerFormatters';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { firebaseService } from '../../../services/firebaseService';
import { createTimeLog } from '../../services/timeLogFirebase';
import { useDataStore } from '@/stores/dataStore';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from '@/modules/dialogs';
import styles from './TimerDropdown.module.scss';

interface TimerDropdownOption {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  action: () => void;
  variant?: 'default' | 'danger';
}

interface TimerDropdownProps {
  taskId: string;
  userId: string;
  userName: string;
  onOpenManualEntry?: () => void;
}

/**
 * TimerDropdown Component
 *
 * A dropdown button for timer controls that:
 * - Shows clock icon when idle (no time displayed)
 * - Shows running time in HH:MM:SS format when timer is active
 * - Displays appropriate actions based on timer state
 * - Uses drawer on mobile (< 768px) instead of dropdown
 */
export function TimerDropdown({
  taskId,
  userId,
  userName,
  onOpenManualEntry,
}: TimerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSendingLog, setIsSendingLog] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingTimerSwitch, setPendingTimerSwitch] = useState<{
    current: string;
    next: string;
    resolve: (value: import('../../types/timer.types').TimerSwitchConfirmation) => void;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Check if mobile viewport
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Toast notifications
  const { success: showSuccess, error: showError, info: showInfo } = useSonnerToast();

  // Get tasks from store to display task names
  const tasks = useDataStore((state) => state.tasks);

  // Timer state
  const { timerSeconds, isRunning, status } = useTimerState(taskId);

  // Timer actions with confirmation callback
  const {
    startTimer,
    pauseTimer,
    resetTimer,
    isProcessing,
  } = useTimerActions(taskId, userId, {
    userName,
    onConfirmStopOtherTimer: async (currentTaskId, newTaskId) => {
      return new Promise<import('../../types/timer.types').TimerSwitchConfirmation>((resolve) => {
        setPendingTimerSwitch({
          current: currentTaskId,
          next: newTaskId,
          resolve
        });
        setShowSwitchDialog(true);
      });
    }
  });

  // Handlers for timer switch dialog
  const handleConfirmSwitch = async (action: TimerSwitchAction) => {
    if (!pendingTimerSwitch) return;

    try {
      if (action === 'send') {
        showInfo('Guardando timer anterior...');
      } else {
        showInfo('Descartando timer anterior...');
      }

      pendingTimerSwitch.resolve({ confirmed: true, action });
    } catch (error) {
      console.error('[TimerDropdown] Error handling timer switch:', error);
      showError('Error al cambiar el timer');
      pendingTimerSwitch.resolve({ confirmed: true, action: 'send' });
    } finally {
      setShowSwitchDialog(false);
      setPendingTimerSwitch(null);
    }
  };

  const handleCancelSwitch = () => {
    if (!pendingTimerSwitch) return;

    pendingTimerSwitch.resolve({ confirmed: false });
    setShowSwitchDialog(false);
    setPendingTimerSwitch(null);
  };

  // Close dropdown when clicking outside (only for desktop)
  useEffect(() => {
    if (isMobile) return; // Skip for mobile since drawer handles its own closing
    
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  // Toggle dropdown/drawer
  const handleToggle = useCallback(() => {
    if (!isProcessing && !isSendingLog) {
      setIsOpen(prev => !prev);
    }
  }, [isProcessing, isSendingLog]);

  // Determine if timer is active (running or paused with accumulated time)
  const isTimerActive = status === TimerStatus.RUNNING || 
    (status === TimerStatus.PAUSED && timerSeconds > 0);

  // Format time for display
  const formattedTime = formatSecondsToHHMMSS(timerSeconds);

  // Handle starting the timer
  const handleStartTimer = useCallback(async () => {
    try {
      const started = await startTimer();
      if (started) {
        showSuccess('Timer iniciado');
        setIsOpen(false);
      }
      // If not started (user cancelled), do nothing
    } catch {
      showError('Error al iniciar el timer');
    }
  }, [startTimer, showSuccess, showError]);

  // Handle pausing the timer
  const handlePauseTimer = useCallback(async () => {
    try {
      await pauseTimer();
      showInfo('Timer pausado');
      setIsOpen(false);
    } catch {
      showError('Error al pausar el timer');
    }
  }, [pauseTimer, showInfo, showError]);

  // Handle resuming the timer (when paused)
  const handleResumeTimer = useCallback(async () => {
    try {
      const started = await startTimer();
      if (started) {
        showSuccess('Timer reanudado');
        setIsOpen(false);
      }
    } catch {
      showError('Error al reanudar el timer');
    }
  }, [startTimer, showSuccess, showError]);

  // Handle finishing and sending timelog
  const handleFinishAndSend = useCallback(async () => {
    if (timerSeconds === 0) {
      showInfo('No hay tiempo para enviar');
      return;
    }

    try {
      setIsSendingLog(true);

      // If timer is running, pause it first
      if (isRunning) {
        await pauseTimer();
      }

      // Convert seconds to hours and minutes
      const hours = timerSeconds / 3600;
      const durationMinutes = Math.round(timerSeconds / 60);
      
      // Format date string
      const dateString = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // Create time log (updates task.timeTracking in Firebase)
      await createTimeLog(taskId, {
        userId,
        userName,
        durationMinutes,
        description: undefined,
        dateString,
        source: 'timer',
      });

      // Update local store immediately for UI reactivity
      const { updateTask, tasks } = useDataStore.getState();
      const currentTask = tasks.find(t => t.id === taskId);
      if (currentTask) {
        const currentTimeTracking = currentTask.timeTracking || {
          totalHours: currentTask.totalHours || 0,
          totalMinutes: 0,
          lastLogDate: null,
          memberHours: currentTask.memberHours || {},
        };
        
        // Calculate new totals
        const currentTotalMinutes = Math.round(currentTimeTracking.totalHours * 60) + (currentTimeTracking.totalMinutes || 0);
        const newTotalMinutes = currentTotalMinutes + durationMinutes;
        const newTotalHours = Math.floor(newTotalMinutes / 60);
        const newRemainingMinutes = newTotalMinutes % 60;
        
        // Update member hours
        const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
        const newMemberHours = currentMemberHours + hours;
        const updatedMemberHours = {
          ...currentTimeTracking.memberHours,
          [userId]: newMemberHours,
        };

        updateTask(taskId, {
          timeTracking: {
            totalHours: newTotalHours,
            totalMinutes: newRemainingMinutes,
            lastLogDate: new Date().toISOString(),
            memberHours: updatedMemberHours,
          },
          totalHours: newTotalHours + (newRemainingMinutes / 60),
          memberHours: updatedMemberHours,
        });
      }

      // Send timelog message to chat (visual message)
      await firebaseService.sendTimeLogMessage(
        taskId,
        userId,
        userName,
        hours,
        dateString,
        undefined
      );

      // Reset timer after sending
      await resetTimer();

      showSuccess('Tiempo registrado correctamente');
      setIsOpen(false);
    } catch {
      showError('Error al registrar el tiempo');
    } finally {
      setIsSendingLog(false);
    }
  }, [timerSeconds, isRunning, taskId, userId, userName, pauseTimer, resetTimer, showSuccess, showInfo, showError]);

  // Handle discarding the timer
  const handleDiscard = useCallback(async () => {
    try {
      await resetTimer();
      showInfo('Timer descartado');
      setIsOpen(false);
    } catch {
      showError('Error al descartar el timer');
    }
  }, [resetTimer, showInfo, showError]);

  // Handle opening manual entry
  const handleManualEntry = useCallback(() => {
    setIsOpen(false);
    onOpenManualEntry?.();
  }, [onOpenManualEntry]);

  // Build options based on timer state
  const getOptions = (): TimerDropdownOption[] => {
    // Timer is idle or stopped - show start options
    if (status === TimerStatus.IDLE || status === TimerStatus.STOPPED || 
        (status === TimerStatus.PAUSED && timerSeconds === 0)) {
      return [
        {
          id: 'start',
          icon: <Play size={18} />,
          label: 'Iniciar Timer',
          description: 'Comienza el cronómetro en tiempo real para esta tarea',
          action: handleStartTimer,
        },
        {
          id: 'manual',
          icon: <PenLine size={18} />,
          label: 'Añadir Tiempo Manual',
          description: 'Ingresa tiempo retroactivo',
          action: handleManualEntry,
        },
      ];
    }

    // Timer is running - show pause, finish, discard
    if (status === TimerStatus.RUNNING) {
      return [
        {
          id: 'pause',
          icon: <Pause size={18} />,
          label: 'Pausar Timer',
          description: 'Detiene temporalmente el cronómetro',
          action: handlePauseTimer,
        },
        {
          id: 'finish',
          icon: <Send size={18} />,
          label: 'Finalizar y Enviar',
          description: 'Detiene el cronómetro y registra el tiempo acumulado',
          action: handleFinishAndSend,
        },
        {
          id: 'discard',
          icon: <Trash2 size={18} />,
          label: 'Descartar',
          description: 'Cancela la sesión sin guardarla',
          action: handleDiscard,
          variant: 'danger',
        },
      ];
    }

    // Timer is paused with accumulated time - show resume, finish, discard
    if (status === TimerStatus.PAUSED && timerSeconds > 0) {
      return [
        {
          id: 'resume',
          icon: <Play size={18} />,
          label: 'Reanudar Timer',
          description: 'Continúa el cronómetro desde donde lo dejaste',
          action: handleResumeTimer,
        },
        {
          id: 'finish',
          icon: <Send size={18} />,
          label: 'Finalizar y Enviar',
          description: 'Registra el tiempo acumulado en el historial',
          action: handleFinishAndSend,
        },
        {
          id: 'discard',
          icon: <Trash2 size={18} />,
          label: 'Descartar',
          description: 'Cancela la sesión sin guardarla',
          action: handleDiscard,
          variant: 'danger',
        },
      ];
    }

    return [];
  };

  const options = getOptions();
  const isDisabled = isProcessing || isSendingLog;

  // Get title based on timer state
  const getDrawerTitle = () => {
    if (status === TimerStatus.RUNNING) return 'Timer en curso';
    if (status === TimerStatus.PAUSED && timerSeconds > 0) return 'Timer pausado';
    return 'Registrar tiempo';
  };

  // Render option item (shared between dropdown and drawer)
  const renderOption = (option: TimerDropdownOption, index: number, isDrawer = false) => (
    <motion.button
      key={option.id}
      className={`${styles.option} ${option.variant === 'danger' ? styles.danger : ''}`}
      onClick={option.action}
      disabled={isDisabled}
      {...(isDrawer ? {} : dropdownAnimations.item(index))}
    >
      <div className={styles.optionIcon}>{option.icon}</div>
      <div className={styles.optionContent}>
        <span className={styles.optionLabel}>{option.label}</span>
        <span className={styles.optionDescription}>{option.description}</span>
      </div>
    </motion.button>
  );

  return (
    <div className={styles.container} ref={wrapperRef}>
      {/* Trigger Button */}
      <motion.button
        className={`${styles.trigger} ${isTimerActive ? styles.active : ''} ${isRunning ? styles.running : ''}`}
        onClick={handleToggle}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={isTimerActive ? `Timer: ${formattedTime}` : 'Abrir opciones de timer'}
        title={isTimerActive ? 'Timer activo' : 'Registrar tiempo'}
        {...dropdownAnimations.trigger}
      >
        {isTimerActive ? (
          <span className={styles.timeDisplay}>
            {formattedTime}
          </span>
        ) : (
          <Clock size={18} strokeWidth={2.5} />
        )}
      </motion.button>

      {/* Mobile: Drawer */}
      {isMobile ? (
        <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
          <ResponsiveDialogContent className={styles.drawerContent}>
            <ResponsiveDialogHeader className={styles.drawerHeader}>
              <div className={styles.drawerHeaderContent}>
                {/* Timer icon/time display */}
                <div className={`${styles.drawerTimerBadge} ${isTimerActive ? styles.active : ''} ${isRunning ? styles.running : ''}`}>
                  {isTimerActive ? (
                    <span className={styles.drawerTimeDisplay}>{formattedTime}</span>
                  ) : (
                    <Clock size={24} strokeWidth={2.5} />
                  )}
                </div>
                <ResponsiveDialogTitle className={styles.drawerTitle}>
                  {getDrawerTitle()}
                </ResponsiveDialogTitle>
              </div>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody className={styles.drawerBody}>
              <div className={styles.drawerOptions}>
                {options.map((option, index) => renderOption(option, index, true))}
              </div>
            </ResponsiveDialogBody>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      ) : (
        /* Desktop: Dropdown Menu */
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={styles.menu}
              role="listbox"
              {...dropdownAnimations.menu}
            >
              {options.map((option, index) => renderOption(option, index))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Confirmation Dialog for Timer Switch */}
      {pendingTimerSwitch && (
        <ConfirmTimerSwitch
          isOpen={showSwitchDialog}
          currentTaskId={pendingTimerSwitch.current}
          currentTaskName={tasks.find(t => t.id === pendingTimerSwitch.current)?.name}
          newTaskId={pendingTimerSwitch.next}
          newTaskName={tasks.find(t => t.id === pendingTimerSwitch.next)?.name}
          currentTimerSeconds={useTimerStateStore.getState().getTimerForTask(pendingTimerSwitch.current)?.accumulatedSeconds || 0}
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelSwitch}
        />
      )}
    </div>
  );
}
