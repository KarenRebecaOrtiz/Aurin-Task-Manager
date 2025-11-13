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
import { addTimeToTaskTransaction } from '../services/timerFirebase';
import { parseTimeInput } from '../utils/timerFormatters';
import { timerFormSchema } from '../utils/timerValidation';
import { DEFAULT_TIMER_VALUES, SUCCESS_MESSAGES } from '../utils/timerConstants';
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
  onSuccess?: () => void
): UseTimeEntryReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up react-hook-form with Zod validation
  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timerFormSchema),
    defaultValues: DEFAULT_TIMER_VALUES,
    mode: 'onChange',
  });

  /**
   * Submit time entry
   * Validates, calculates seconds, and saves to Firebase
   */
  const submitTimeEntry = useCallback(
    async (data: TimeEntryFormData) => {
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);

        console.log('[useTimeEntry] Submitting time entry:', data);

        // Parse time input
        const { hours, minutes } = parseTimeInput(data.time);

        // Calculate total seconds
        const totalSeconds = hours * 3600 + minutes * 60;

        if (totalSeconds === 0) {
          throw new Error('El tiempo debe ser mayor a cero');
        }

        // Add time to task using transaction
        await addTimeToTaskTransaction(taskId, userId, totalSeconds);

        // Success feedback
        console.log(SUCCESS_MESSAGES.TIME_ENTRY_ADDED);

        // Reset form
        form.reset(DEFAULT_TIMER_VALUES);

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error('[useTimeEntry] Submission failed:', error);

        // Set form error
        form.setError('root', {
          type: 'manual',
          message: (error as Error).message || 'Error al guardar el tiempo',
        });

        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [taskId, userId, isSubmitting, onSuccess, form]
  );

  /**
   * Reset form to default values
   */
  const resetForm = useCallback(() => {
    form.reset(DEFAULT_TIMER_VALUES);
  }, [form]);

  /**
   * Get form errors as simple object
   */
  const errors = Object.entries(form.formState.errors).reduce(
    (acc, [key, error]) => {
      if (error?.message) {
        acc[key] = error.message;
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
