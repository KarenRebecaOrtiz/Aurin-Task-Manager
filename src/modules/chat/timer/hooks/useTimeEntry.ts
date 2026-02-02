/**
 * Timer Module - Time Entry Hook
 *
 * Hook for manual time entry form handling.
 * Includes validation, submission, and integration with Firebase.
 *
 * @module timer/hooks/useTimeEntry
 */

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTimeLog } from '../services/timeLogFirebase';
import { firebaseService } from '../../services/firebaseService';
import { timerFormSchema } from '../utils/timerValidation';
import { getDefaultTimerValues } from '../utils/timerConstants';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { useDataStore } from '@/stores/dataStore';
import type { UseTimeEntryReturn, TimeEntryFormData } from '../types/timer.types';

/**
 * Hook for manual time entry form
 * Handles form state, validation, and submission
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param onSuccess - Optional callback on successful submission
 * @returns Form methods and state
 *
 * @example
 * ```typescript
 * function TimeEntryForm({ taskId, userId }: Props) {
 *   const {
 *     form,
 *     isSubmitting,
 *     submitTimeEntry,
 *     resetForm
 *   } = useTimeEntry(taskId, userId, () => {
 *     console.log('Time entry saved!');
 *   });
 *
 *   const { register, formState: { errors } } = form;
 *
 *   return (
 *     <form onSubmit={form.handleSubmit(submitTimeEntry)}>
 *       <input {...register('time')} placeholder="HH:MM" />
 *       {errors.time && <span>{errors.time.message}</span>}
 *
 *       <input type="date" {...register('date')} />
 *       {errors.date && <span>{errors.date.message}</span>}
 *
 *       <textarea {...register('comment')} />
 *       {errors.comment && <span>{errors.comment.message}</span>}
 *
 *       <button type="submit" disabled={isSubmitting}>
 *         Add Time
 *       </button>
 *       <button type="button" onClick={resetForm}>
 *         Reset
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useTimeEntry(
  taskId: string,
  userId: string,
  userName: string,
  onSuccess?: () => void
): UseTimeEntryReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Toast notifications
  const { success: showSuccess, error: showError } = useSonnerToast();

  // Set up react-hook-form with Zod validation
  // Use getDefaultTimerValues() to ensure fresh date on each form mount
  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timerFormSchema),
    defaultValues: getDefaultTimerValues(),
    mode: 'onChange',
  });

  /**
   * Submit time entry
   * Supports both 'duration' mode (hours + minutes) and 'range' mode (start/end time)
   */
  const submitTimeEntry = useCallback(
    async (data: TimeEntryFormData) => {
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);

        let totalMinutes: number;
        let startDate: Date;
        let endDate: Date;
        let timeDescription: string;

        // Calculate based on entry mode
        if (data.entryMode === 'duration') {
          // Duration mode: use durationHours and durationMinutes
          totalMinutes = (data.durationHours ?? 0) * 60 + (data.durationMinutes ?? 0);

          if (totalMinutes <= 0) {
            throw new Error('La duración debe ser mayor a 0 minutos');
          }

          // For duration mode, we don't have exact start/end times
          // Use current time as reference
          startDate = new Date(data.date);
          endDate = new Date(data.date);
          endDate.setMinutes(endDate.getMinutes() + totalMinutes);

          // Format description for duration mode
          const hours = data.durationHours ?? 0;
          const mins = data.durationMinutes ?? 0;
          if (hours > 0 && mins > 0) {
            timeDescription = `${hours}h ${mins}m`;
          } else if (hours > 0) {
            timeDescription = `${hours}h`;
          } else {
            timeDescription = `${mins}m`;
          }
        } else {
          // Range mode: use startTime and endTime
          const [startH, startM, startS] = data.startTime.split(':').map(Number);
          const [endH, endM, endS] = data.endTime.split(':').map(Number);

          // Calculate total minutes from start/end time
          const startTotalMinutes = startH * 60 + startM + (startS || 0) / 60;
          const endTotalMinutes = endH * 60 + endM + (endS || 0) / 60;
          totalMinutes = Math.round(endTotalMinutes - startTotalMinutes);

          if (totalMinutes <= 0) {
            throw new Error('La hora de fin debe ser mayor que la hora de inicio');
          }

          // Create start and end Date objects for the time log
          startDate = new Date(data.date);
          startDate.setHours(startH, startM, startS || 0);
          endDate = new Date(data.date);
          endDate.setHours(endH, endM, endS || 0);

          // Format time range for description
          timeDescription = `${data.startTime.slice(0, 5)} - ${data.endTime.slice(0, 5)}`;
        }

        // Calculate hours and minutes for display
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        // Format date string for grouping (YYYY-MM-DD)
        const dateString = data.date.toISOString().split('T')[0];

        // Format display date for chat message
        const displayDate = data.date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        // Build description including comment if provided
        const fullDescription = data.comment?.trim()
          ? `${timeDescription} - ${data.comment.trim()}`
          : timeDescription;

        // 1. Create time log entry in time_logs subcollection
        //    This also updates task.timeTracking AND legacy totalHours/memberHours
        await createTimeLog(taskId, {
          userId,
          userName,
          durationMinutes: totalMinutes,
          description: fullDescription,
          dateString,
          startTime: startDate,
          endTime: endDate,
          source: 'manual',
        });

        // 2. Update local dataStore so ChatHeader shows updated time immediately
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
          const newTotalMinutes = currentTotalMinutes + totalMinutes;
          const newTotalHours = Math.floor(newTotalMinutes / 60);
          const newRemainingMinutes = newTotalMinutes % 60;
          
          // Update member hours
          const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
          const newMemberHours = currentMemberHours + (totalMinutes / 60);
          
          updateTask(taskId, {
            timeTracking: {
              totalHours: newTotalHours,
              totalMinutes: newRemainingMinutes,
              lastLogDate: new Date().toISOString(),
              memberHours: {
                ...currentTimeTracking.memberHours,
                [userId]: newMemberHours,
              },
            },
            totalHours: newTotalHours + (newRemainingMinutes / 60),
            memberHours: {
              ...currentTimeTracking.memberHours,
              [userId]: newMemberHours,
            },
          });
        }

        // 3. Create visual message in chat (solo para historial visual)
        // Solo pasar el comentario del usuario, no la descripción de tiempo
        // El badge del timelog ya muestra la duración, no necesitamos duplicarlo en el texto
        await firebaseService.sendTimeLogMessage(
          taskId,
          userId,
          userName,
          hours + minutes / 60, // Convertir a horas decimales para display
          displayDate,
          data.comment?.trim() || undefined // Solo el comentario real del usuario
        );

        // Reset form with fresh default values
        form.reset(getDefaultTimerValues());

        // Show success toast
        showSuccess('Tiempo registrado correctamente');

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        const errorMessage = (error as Error).message || 'Error al guardar el tiempo';
        
        // Show error toast
        showError(errorMessage);
        
        // Set form error
        form.setError('root', {
          type: 'manual',
          message: errorMessage,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [taskId, userId, userName, isSubmitting, onSuccess, form, showSuccess, showError]
  );

  /**
   * Reset form to default values
   */
  const resetForm = useCallback(() => {
    form.reset(getDefaultTimerValues());
  }, [form]);

  /**
   * Get form errors as simple object
   */
  const errors = Object.entries(form.formState.errors).reduce(
    (acc, [key, error]) => {
      if (error && typeof error === 'object' && 'message' in error) {
        acc[key] = String(error.message);
      }
      return acc;
    },
    {} as Record<string, string>
  );

  return {
    form,
    isSubmitting,
    submitTimeEntry: form.handleSubmit(submitTimeEntry),
    resetForm,
    errors,
  };
}
