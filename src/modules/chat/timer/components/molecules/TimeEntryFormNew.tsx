'use client';

import React, { useCallback, useMemo } from 'react';
import { Clock, Timer, CalendarDays, Settings2 } from 'lucide-react';
import { parseDate, getLocalTimeZone, today, CalendarDate } from '@internationalized/date';
import type { TimeEntryFormProps } from '../../types/timer.types';
import { useTimeEntry } from '../../hooks/useTimeEntry';
import { Calendar } from '@/components/ui/calendar/Calendar';
import { Label } from '@/components/ui/calendar/label';
import { Wizard, WizardStep, WizardProgress, WizardActions } from '@/components/ui/wizard';
import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from '@/components/wheel-picker';
import { Textarea } from '@/components/ui/textarea';
import styles from './TimeEntryFormNew.module.scss';

// Generate hour options (0-23)
const HOUR_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 24 }, (_, i) => ({
  label: String(i).padStart(2, '0'),
  value: i,
}));

// Generate minute options (0-59)
const MINUTE_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 60 }, (_, i) => ({
  label: String(i).padStart(2, '0'),
  value: i,
}));

type _EntryMode = 'duration' | 'range';

export function TimeEntryFormNew({
  taskId,
  userId,
  userName,
  onSuccess,
  onCancel: _onCancel
}: TimeEntryFormProps) {
  const {
    form,
    isSubmitting,
    submitTimeEntry,
    errors
  } = useTimeEntry(taskId, userId, userName, onSuccess);

  const { watch, setValue } = form;
  
  // Watch form values
  const watchedDate = watch('date');
  const dateValue = useMemo(() => watchedDate || new Date(), [watchedDate]);
  const entryMode = watch('entryMode') || 'duration';
  const durationHours = watch('durationHours') ?? 1;
  const durationMinutes = watch('durationMinutes') ?? 0;
  const startTimeValue = watch('startTime') || '09:00:00';
  const endTimeValue = watch('endTime') || '10:00:00';
  const commentValue = watch('comment') || '';

  // Parse start/end times for wheel pickers
  const parsedStartTime = useMemo(() => {
    const [h, m] = startTimeValue.split(':').map(Number);
    return { hours: isNaN(h) ? 9 : h, minutes: isNaN(m) ? 0 : m };
  }, [startTimeValue]);

  const parsedEndTime = useMemo(() => {
    const [h, m] = endTimeValue.split(':').map(Number);
    return { hours: isNaN(h) ? 10 : h, minutes: isNaN(m) ? 0 : m };
  }, [endTimeValue]);

  // Date handlers
  const handleDateChange = useCallback((date: Date) => {
    setValue('date', date, { shouldValidate: true });
  }, [setValue]);

  const handleCalendarSelect = useCallback((calendarDate: CalendarDate | null) => {
    if (calendarDate) {
      const jsDate = new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day);
      handleDateChange(jsDate);
    }
  }, [handleDateChange]);

  const convertDateToCalendarDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return parseDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  const disableFutureDates = useCallback((date: CalendarDate) => {
    const todayDate = today(getLocalTimeZone());
    return date.compare(todayDate) > 0;
  }, []);

  // Mode handlers
  const handleDurationModeClick = useCallback(() => {
    setValue('entryMode', 'duration', { shouldValidate: true });
  }, [setValue]);

  const handleRangeModeClick = useCallback(() => {
    setValue('entryMode', 'range', { shouldValidate: true });
  }, [setValue]);

  // Duration mode handlers
  const handleDurationHoursChange = useCallback((value: number) => {
    setValue('durationHours', value, { shouldValidate: true });
  }, [setValue]);

  const handleDurationMinutesChange = useCallback((value: number) => {
    setValue('durationMinutes', value, { shouldValidate: true });
  }, [setValue]);

  // Range mode handlers
  const handleStartHoursChange = useCallback((value: number) => {
    const newTime = `${String(value).padStart(2, '0')}:${String(parsedStartTime.minutes).padStart(2, '0')}:00`;
    setValue('startTime', newTime, { shouldValidate: true });
  }, [setValue, parsedStartTime.minutes]);

  const handleStartMinutesChange = useCallback((value: number) => {
    const newTime = `${String(parsedStartTime.hours).padStart(2, '0')}:${String(value).padStart(2, '0')}:00`;
    setValue('startTime', newTime, { shouldValidate: true });
  }, [setValue, parsedStartTime.hours]);

  const handleEndHoursChange = useCallback((value: number) => {
    const newTime = `${String(value).padStart(2, '0')}:${String(parsedEndTime.minutes).padStart(2, '0')}:00`;
    setValue('endTime', newTime, { shouldValidate: true });
  }, [setValue, parsedEndTime.minutes]);

  const handleEndMinutesChange = useCallback((value: number) => {
    const newTime = `${String(parsedEndTime.hours).padStart(2, '0')}:${String(value).padStart(2, '0')}:00`;
    setValue('endTime', newTime, { shouldValidate: true });
  }, [setValue, parsedEndTime.hours]);

  // Comment handler
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue('comment', e.target.value, { shouldValidate: false });
  }, [setValue]);

  // Calculate display duration
  const displayDuration = useMemo(() => {
    if (entryMode === 'duration') {
      const h = durationHours ?? 0;
      const m = durationMinutes ?? 0;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
      return '0m';
    } else {
      const startTotal = parsedStartTime.hours * 60 + parsedStartTime.minutes;
      const endTotal = parsedEndTime.hours * 60 + parsedEndTime.minutes;
      const diff = endTotal - startTotal;
      if (diff <= 0) return 'Inválido';
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }
  }, [entryMode, durationHours, durationMinutes, parsedStartTime, parsedEndTime]);

  // Format selected date for display
  const formattedDate = useMemo(() => {
    return dateValue.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [dateValue]);

  // Step 1 validator (date is always valid since we have a default)
  const validateStep1 = useCallback(async (): Promise<boolean> => {
    return true;
  }, []);

  // Step 2 validator (validate time entries)
  const validateStep2 = useCallback(async (): Promise<boolean> => {
    if (entryMode === 'duration') {
      return (durationHours ?? 0) > 0 || (durationMinutes ?? 0) > 0;
    } else {
      const startTotal = parsedStartTime.hours * 60 + parsedStartTime.minutes;
      const endTotal = parsedEndTime.hours * 60 + parsedEndTime.minutes;
      return endTotal > startTotal;
    }
  }, [entryMode, durationHours, durationMinutes, parsedStartTime, parsedEndTime]);

  // Handle wizard completion
  const handleWizardComplete = useCallback(() => {
    submitTimeEntry();
  }, [submitTimeEntry]);

  return (
    <form onSubmit={submitTimeEntry} className={styles.form}>
      <Wizard totalSteps={2}>
        <WizardProgress />

        {/* Step 1: Calendar Selection */}
        <WizardStep step={0} validator={validateStep1}>
          <div className={styles.stepContainer}>
            <div className={styles.stepHeader}>
              <CalendarDays size={20} className={styles.stepIcon} />
              <div className={styles.stepTitleGroup}>
                <h3 className={styles.stepTitle}>Selecciona la Fecha</h3>
                <p className={styles.stepDescription}>¿Cuándo realizaste este trabajo?</p>
              </div>
            </div>

            <div className={styles.calendarContainer}>
              <Calendar
                value={convertDateToCalendarDate(dateValue)}
                onChange={handleCalendarSelect}
                isDateUnavailable={disableFutureDates}
                className={styles.calendar}
              />
            </div>

            <div className={styles.selectedDateDisplay}>
              <span className={styles.selectedDateLabel}>Fecha seleccionada:</span>
              <span className={styles.selectedDateValue}>{formattedDate}</span>
            </div>
          </div>
        </WizardStep>

        {/* Step 2: Time & Comment */}
        <WizardStep step={1} validator={validateStep2}>
          <div className={styles.stepContainer}>
            <div className={styles.stepHeader}>
              <Settings2 size={20} className={styles.stepIcon} />
              <div className={styles.stepTitleGroup}>
                <h3 className={styles.stepTitle}>Configura el Tiempo</h3>
                <p className={styles.stepDescription}>¿Cuánto tiempo dedicaste?</p>
              </div>
            </div>

            {/* Mode Selector */}
            <div className={styles.modeSelector}>
              <button
                type="button"
                className={`${styles.modeButton} ${entryMode === 'duration' ? styles.modeActive : ''}`}
                onClick={handleDurationModeClick}
                disabled={isSubmitting}
              >
                <Timer size={16} />
                <span>Duración</span>
              </button>
              <button
                type="button"
                className={`${styles.modeButton} ${entryMode === 'range' ? styles.modeActive : ''}`}
                onClick={handleRangeModeClick}
                disabled={isSubmitting}
              >
                <Clock size={16} />
                <span>Rango</span>
              </button>
            </div>

            {/* Duration Display */}
            <div className={styles.durationDisplay}>
              <span className={styles.durationLabel}>Tiempo total:</span>
              <span className={styles.durationValue}>{displayDuration}</span>
            </div>

            {/* Duration Mode - Single Wheel Picker */}
            {entryMode === 'duration' && (
              <div className={styles.timeSection}>
                <Label className={styles.label}>Duración</Label>
                <WheelPickerWrapper className={styles.wheelPickerWrapper}>
                  <WheelPicker
                    options={HOUR_OPTIONS}
                    value={durationHours}
                    onValueChange={handleDurationHoursChange}
                    infinite
                  />
                  <div className={styles.wheelSeparator}>
                    <span className={styles.wheelLabel}>hrs</span>
                  </div>
                  <WheelPicker
                    options={MINUTE_OPTIONS}
                    value={durationMinutes}
                    onValueChange={handleDurationMinutesChange}
                    infinite
                  />
                  <div className={styles.wheelSeparator}>
                    <span className={styles.wheelLabel}>min</span>
                  </div>
                </WheelPickerWrapper>
                {(errors.durationHours || errors.durationMinutes) && (
                  <div className={styles.error} role="alert">
                    {errors.durationHours || errors.durationMinutes}
                  </div>
                )}
              </div>
            )}

            {/* Range Mode - Start and End Time Pickers */}
            {entryMode === 'range' && (
              <div className={styles.rangeContainer}>
                <div className={styles.timeSection}>
                  <Label className={styles.label}>Hora de Inicio</Label>
                  <WheelPickerWrapper className={styles.wheelPickerWrapper}>
                    <WheelPicker
                      options={HOUR_OPTIONS}
                      value={parsedStartTime.hours}
                      onValueChange={handleStartHoursChange}
                      infinite
                    />
                    <div className={styles.wheelSeparator}>
                      <span className={styles.wheelColon}>:</span>
                    </div>
                    <WheelPicker
                      options={MINUTE_OPTIONS}
                      value={parsedStartTime.minutes}
                      onValueChange={handleStartMinutesChange}
                      infinite
                    />
                  </WheelPickerWrapper>
                  {errors.startTime && (
                    <div className={styles.error} role="alert">
                      {errors.startTime}
                    </div>
                  )}
                </div>

                <div className={styles.timeSection}>
                  <Label className={styles.label}>Hora de Fin</Label>
                  <WheelPickerWrapper className={styles.wheelPickerWrapper}>
                    <WheelPicker
                      options={HOUR_OPTIONS}
                      value={parsedEndTime.hours}
                      onValueChange={handleEndHoursChange}
                      infinite
                    />
                    <div className={styles.wheelSeparator}>
                      <span className={styles.wheelColon}>:</span>
                    </div>
                    <WheelPicker
                      options={MINUTE_OPTIONS}
                      value={parsedEndTime.minutes}
                      onValueChange={handleEndMinutesChange}
                      infinite
                    />
                  </WheelPickerWrapper>
                  {errors.endTime && (
                    <div className={styles.error} role="alert">
                      {errors.endTime}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comment Section */}
            <div className={styles.commentSection}>
              <Label htmlFor="comment" className={styles.label}>
                Comentario <span className={styles.optional}>(opcional)</span>
              </Label>
              <Textarea
                id="comment"
                value={commentValue}
                onChange={handleCommentChange}
                placeholder="Describe brevemente en qué trabajaste..."
                className={styles.textarea}
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>
        </WizardStep>

        <WizardActions onComplete={handleWizardComplete} />
      </Wizard>

      {errors.root && (
        <div className={styles.rootError} role="alert">
          {errors.root}
        </div>
      )}
    </form>
  );
}

export default TimeEntryFormNew;
