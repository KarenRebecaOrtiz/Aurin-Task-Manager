/**
 * Timer Module - Time Entry Form Component
 *
 * Complete form for manual time entry with validation
 *
 * @module timer/components/molecules/TimeEntryForm
 */

'use client';

import React, { useCallback } from 'react';
import type { TimeEntryFormProps } from '../../types/timer.types';
import { useTimeEntry } from '../../hooks/useTimeEntry';
import { DateSelector } from './DateSelector';
import styles from './TimeEntryForm.module.scss';

/**
 * TimeEntryForm Component
 *
 * Complete form for manually entering time worked on a task
 * - Start time input
 * - End time input
 * - Date selector
 * - Validation and submission
 *
 * @param taskId - ID of the task
 * @param userId - ID of the user
 * @param onSuccess - Callback on successful submission
 * @param onCancel - Callback on form cancellation
 */
export function TimeEntryForm({
  taskId,
  userId,
  userName,
  onSuccess,
  onCancel
}: TimeEntryFormProps) {
  const {
    form,
    isSubmitting,
    submitTimeEntry,
    resetForm,
    errors
  } = useTimeEntry(taskId, userId, userName, onSuccess);

  const { watch, setValue } = form;
  const dateValue = watch('date') || new Date();
  const startTimeValue = watch('startTime') || '09:00:00';
  const endTimeValue = watch('endTime') || '10:00:00';

  const handleStartTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('startTime', e.target.value, { shouldValidate: true });
  }, [setValue]);

  const handleEndTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('endTime', e.target.value, { shouldValidate: true });
  }, [setValue]);

  const handleDateChange = useCallback((date: Date) => {
    setValue('date', date, { shouldValidate: true });
  }, [setValue]);

  return (
    <form onSubmit={submitTimeEntry} className={styles.timeEntryForm}>
      {/* Time Input Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Tiempo Invertido</h3>
        <p className={styles.sectionDesc}>
          Ingresa el rango de tiempo que dedicaste a esta tarea
        </p>

        <div className={styles.timeInputs}>
          <div className={styles.timeFieldGroup}>
            <label htmlFor="start-time" className={styles.label}>
              Hora de Inicio
            </label>
            <input
              id="start-time"
              type="time"
              step="1"
              value={startTimeValue}
              onChange={handleStartTimeChange}
              className={styles.timeInput}
              disabled={isSubmitting}
            />
            {errors.startTime && (
              <span className={styles.errorText}>{errors.startTime}</span>
            )}
          </div>
          <span className={styles.separator}>—</span>
          <div className={styles.timeFieldGroup}>
            <label htmlFor="end-time" className={styles.label}>
              Hora de Fin
            </label>
            <input
              id="end-time"
              type="time"
              step="1"
              value={endTimeValue}
              onChange={handleEndTimeChange}
              className={styles.timeInput}
              disabled={isSubmitting}
            />
            {errors.endTime && (
              <span className={styles.errorText}>{errors.endTime}</span>
            )}
          </div>
        </div>
      </div>

      {/* Date Selection Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Fecha de Trabajo</h3>
        <p className={styles.sectionDesc}>
          Selecciona la fecha en que realizaste el trabajo
        </p>
        <DateSelector
          value={dateValue}
          onChange={handleDateChange}
          error={errors.date}
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => {
            resetForm();
            onCancel?.();
          }}
          className={styles.cancelButton}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Añadir Tiempo'}
        </button>
      </div>
    </form>
  );
}

export default TimeEntryForm;
