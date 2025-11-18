/**
 * Timer Module - Time Entry Form Component
 *
 * Complete form for manual time entry with validation
 *
 * @module timer/components/molecules/TimeEntryForm
 */

'use client';

import React from 'react';
import type { TimeEntryFormProps } from '../../types/timer.types';
import { useTimeEntry } from '../../hooks/useTimeEntry';
import { TimeInput } from '../atoms/TimeInput';
import { DateSelector } from './DateSelector';
import styles from './TimeEntryForm.module.scss';

/**
 * TimeEntryForm Component
 *
 * Complete form for manually entering time worked on a task
 * - Time input (hours + minutes)
 * - Date selector
 * - Optional comment
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

  const { register, watch, setValue } = form;
  const timeValue = watch('time') || '00:00';
  const dateValue = watch('date') || new Date();

  // Parse time string to hours/minutes
  const [hours, minutes] = timeValue.split(':').map(Number);

  const handleHoursChange = (val: number) => {
    const newTime = `${String(val).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
    setValue('time', newTime, { shouldValidate: true });
  };

  const handleMinutesChange = (val: number) => {
    const newTime = `${String(hours || 0).padStart(2, '0')}:${String(val).padStart(2, '0')}`;
    setValue('time', newTime, { shouldValidate: true });
  };

  const handleDateChange = (date: Date) => {
    setValue('date', date, { shouldValidate: true });
  };

  return (
    <form onSubmit={submitTimeEntry} className={styles.timeEntryForm}>
      {/* Time Input Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Tiempo Invertido</h3>
        <p className={styles.sectionDesc}>
          Ingresa el tiempo que dedicaste a esta tarea
        </p>

        <div className={styles.timeInputs}>
          <TimeInput
            value={hours || 0}
            min={0}
            max={23}
            label="HORAS"
            type="hours"
            onChange={handleHoursChange}
            error={errors.time}
          />
          <span className={styles.separator}>:</span>
          <TimeInput
            value={minutes || 0}
            min={0}
            max={59}
            label="MINUTOS"
            type="minutes"
            onChange={handleMinutesChange}
          />
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

      {/* Comment Section (Optional) */}
      <div className={styles.section}>
        <label htmlFor="comment" className={styles.label}>
          Comentario (opcional)
        </label>
        <textarea
          {...register('comment')}
          id="comment"
          className={styles.textarea}
          placeholder="Añade detalles sobre el trabajo realizado..."
          rows={3}
          disabled={isSubmitting}
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
