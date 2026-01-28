/**
 * Timer Module - Confirm Timer Switch Component
 *
 * Confirmation dialog when switching from one active timer to another.
 * Uses the shared dialog infrastructure for consistent UX.
 *
 * @module timer/components/organisms/ConfirmTimerSwitch
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Save, Trash2 } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@/modules/dialogs';
import { Button } from '@/components/ui/buttons';
import { useTheme } from '@/contexts/ThemeContext';
import { TimerCounter } from '@/modules/header/components/ui/GeoClock/TimerCounter';
import { useTimerStateStore } from '../../stores/timerStateStore';
import type { ConfirmTimerSwitchProps, TimerSwitchAction } from '../../types/timer.types';

/**
 * ConfirmTimerSwitch Component
 *
 * Dialog that appears when user tries to start a timer while another is running.
 * Offers two options:
 * - Discard: Delete current timer without saving and start new one
 * - Register & Continue: Save current timer and start new one
 */
export function ConfirmTimerSwitch({
  isOpen,
  currentTaskId,
  currentTaskName,
  newTaskName,
  currentTimerSeconds,
  onConfirm,
  onCancel,
}: ConfirmTimerSwitchProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<TimerSwitchAction | null>(null);
  const [liveSeconds, setLiveSeconds] = useState(currentTimerSeconds);
  const { isDarkMode } = useTheme();

  // Get timer state to check if still running and calculate live seconds
  const getTimerForTask = useTimerStateStore((state) => state.getTimerForTask);

  // Update timer display every second while dialog is open
  useEffect(() => {
    if (!isOpen || !currentTaskId) return;

    const timer = getTimerForTask(currentTaskId);
    if (!timer || timer.status !== 'running') {
      setLiveSeconds(currentTimerSeconds);
      return;
    }

    const calculateElapsed = () => {
      if (!timer.startedAt) return timer.accumulatedSeconds;
      const startTime = timer.startedAt instanceof Date
        ? timer.startedAt
        : new Date(timer.startedAt);
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      return timer.accumulatedSeconds + elapsed;
    };

    setLiveSeconds(calculateElapsed());
    const interval = setInterval(() => {
      setLiveSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, currentTaskId, currentTimerSeconds, getTimerForTask]);

  const handleAction = async (action: TimerSwitchAction) => {
    setIsProcessing(true);
    setProcessingAction(action);
    try {
      await onConfirm(action);
    } catch (error) {
      console.error('[ConfirmTimerSwitch] Error during action:', error);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isProcessing) {
      onCancel();
    }
  };

  // Format display names
  const currentDisplay = currentTaskName || 'otra tarea';
  const newDisplay = newTaskName || 'la nueva tarea';

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent size="sm">
        <ResponsiveDialogHeader>
          {/* Icon */}
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-muted">
              <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          {/* Title */}
          <ResponsiveDialogTitle className="text-center">
            ¿Cambiar de tarea?
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="flex flex-col items-center gap-6">
            {/* Timer Hero Section - Estado Actual */}
            <div className="w-full flex flex-col items-center gap-2 py-4 px-4 bg-muted/50 rounded-xl">
              <span className="text-sm text-muted-foreground">Timer activo en</span>
              <span className="font-semibold text-base text-center leading-tight" title={currentDisplay}>
                {currentDisplay}
              </span>
              <div className="mt-1 scale-110">
                <TimerCounter
                  seconds={liveSeconds}
                  isRunning={true}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Body text - Decisión */}
            <p className="text-center text-sm text-muted-foreground leading-relaxed px-2 mb-2">
              ¿Quieres registrar este tiempo antes de cambiar a{' '}
              <span className="font-semibold text-foreground">{newDisplay}</span>?
            </p>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <div className="flex gap-3 w-full">
            {/* Secondary: Discard - destructive styling */}
            <Button
              type="button"
              intent="secondary"
              size="lg"
              onClick={() => handleAction('discard')}
              disabled={isProcessing}
              isLoading={isProcessing && processingAction === 'discard'}
              loadingText="Descartando..."
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Descartar tiempo
            </Button>
            {/* Primary: Register and continue */}
            <Button
              type="button"
              intent="primary"
              size="lg"
              onClick={() => handleAction('send')}
              disabled={isProcessing}
              isLoading={isProcessing && processingAction === 'send'}
              loadingText="Registrando..."
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Registrar y cambiar
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export default ConfirmTimerSwitch;
