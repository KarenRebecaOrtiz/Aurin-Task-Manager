# Timer Module - Components Implementation Blueprint

**Complete specification for PHASE 5 components**

Este documento contiene las especificaciones detalladas para implementar todos los componentes restantes del módulo timer.

---

## 📁 Estructura de Archivos Creados

```
src/modules/chat/timer/components/
├── atoms/
│   ├── TimerButton.tsx ✅ (COMPLETO)
│   ├── TimerButton.module.scss ✅ (COMPLETO)
│   ├── TimeInput.tsx ⏳ (BLUEPRINT CREADO)
│   ├── TimeInput.module.scss ⏳ (BLUEPRINT CREADO)
│   ├── TimerCounter.tsx ⏳ (BLUEPRINT CREADO)
│   ├── TimerCounter.module.scss ⏳ (BLUEPRINT CREADO)
│   └── index.ts ⏳ (POR CREAR)
│
├── molecules/
│   ├── DateSelector.tsx ⏳ (ESPECIFICACIÓN ABAJO)
│   ├── DateSelector.module.scss ⏳
│   ├── TimeEntryForm.tsx ⏳
│   ├── TimeEntryForm.module.scss ⏳
│   ├── TimerDisplay.tsx ⏳
│   ├── TimerDisplay.module.scss ⏳
│   ├── TimerIntervalsList.tsx ⏳
│   ├── TimerIntervalsList.module.scss ⏳
│   └── index.ts ⏳
│
├── organisms/
│   ├── TimerPanel.tsx ⏳
│   ├── TimerPanel.module.scss ⏳
│   ├── ConfirmTimerSwitch.tsx ⏳
│   ├── ConfirmTimerSwitch.module.scss ⏳
│   └── index.ts ⏳
│
└── index.ts ⏳
```

---

## 🧩 MOLECULES - Especificaciones Detalladas

### 1. DateSelector.tsx

```typescript
/**
 * COMPONENT: DateSelector
 *
 * PURPOSE: Calendar selector for choosing work date (cannot select future dates)
 *
 * IMPORTS:
 * - React
 * - DayPicker from 'react-day-picker'
 * - es from 'date-fns/locale' (Spanish locale)
 * - import 'react-day-picker/style.css'
 * - DateSelectorProps from types
 *
 * PROPS:
 * - value: Date (selected date)
 * - onChange: (date: Date) => void
 * - error?: string (validation error)
 * - disabled?: boolean
 * - className?: string
 *
 * FEATURES:
 * 1. DayPicker Configuration:
 *    - mode="single"
 *    - selected={value}
 *    - onSelect={onChange}
 *    - locale={es}
 *    - weekStartsOn={1} (Monday)
 *    - disabled={(date) => date > new Date()} // No future dates
 *
 * 2. Visual Feedback:
 *    - Highlight selected date
 *    - Show disabled state for future dates
 *    - Display error message if error prop provided
 *    - Responsive calendar layout
 *
 * 3. Styling:
 *    - Card container with border
 *    - Proper spacing between elements
 *    - Mobile-friendly touch targets
 *    - Dark mode support
 *
 * 4. Accessibility:
 *    - Keyboard navigation
 *    - Screen reader friendly
 *    - aria-labels for dates
 *
 * EXAMPLE USAGE:
 * <DateSelector
 *   value={selectedDate}
 *   onChange={(date) => setSelectedDate(date)}
 *   error={formErrors.date}
 * />
 *
 * REFERENCE: /components/ui/TimerPanel.tsx lines 405-432 for DayPicker config
 */
```

**Estructura del Componente:**

```typescript
export function DateSelector({
  value,
  onChange,
  error,
  disabled = false,
  className = '',
}: DateSelectorProps) {
  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(date);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={`${styles.dateSelector} ${className}`}>
      <div className={styles.calendarContainer}>
        <DayPicker
          mode="single"
          selected={value}
          onSelect={handleSelect}
          locale={es}
          weekStartsOn={1}
          disabled={(date) => {
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            return checkDate > today;
          }}
          modifiers={{
            disabled: (date) => date > today
          }}
          modifiersStyles={{
            disabled: {
              color: '#9ca3af',
              textDecoration: 'line-through',
              cursor: 'not-allowed'
            }
          }}
        />
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}
    </div>
  );
}
```

**DateSelector.module.scss:**

```scss
.dateSelector {
  // Container
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.calendarContainer {
  // DayPicker wrapper
  display: flex;
  justify-content: center;

  // Override DayPicker styles as needed
  :global(.rdp) {
    --rdp-cell-size: 40px;
    --rdp-accent-color: #3b82f6;
    --rdp-background-color: #dbeafe;
  }
}

.errorMessage {
  color: #ef4444;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
}
```

---

### 2. TimeEntryForm.tsx

```typescript
/**
 * COMPONENT: TimeEntryForm
 *
 * PURPOSE: Complete form for manual time entry
 *
 * HOOKS TO USE:
 * - useTimeEntry(taskId, userId, onSuccess)
 *
 * FEATURES:
 * 1. Form Fields:
 *    - Time input (TimeInput component x2 for hours/minutes)
 *    - Date selector (DateSelector component)
 *    - Comment textarea (optional)
 *
 * 2. Form Steps/Wizard (optional):
 *    - Step 1: Time input
 *    - Step 2: Date selection
 *    - Step 3: Comment (optional)
 *    - Or show all in single view
 *
 * 3. Validation:
 *    - Real-time validation as user types
 *    - Show errors below fields
 *    - Disable submit if invalid
 *
 * 4. Submission:
 *    - Use form.handleSubmit from useTimeEntry
 *    - Show loading state during submission
 *    - Success feedback (check icon or toast)
 *    - Error handling with retry option
 *
 * 5. Actions:
 *    - Submit button (primary)
 *    - Cancel button (secondary)
 *    - Reset button (optional)
 *
 * PROPS:
 * - taskId: string
 * - userId: string
 * - onSuccess?: () => void
 * - onCancel?: () => void
 *
 * EXAMPLE:
 * <TimeEntryForm
 *   taskId="task123"
 *   userId="user456"
 *   onSuccess={() => console.log('Time added!')}
 *   onCancel={() => closeModal()}
 * />
 */
```

**Estructura del Componente:**

```typescript
export function TimeEntryForm({
  taskId,
  userId,
  onSuccess,
  onCancel,
}: TimeEntryFormProps) {
  const {
    form,
    isSubmitting,
    submitTimeEntry,
    resetForm,
    errors,
  } = useTimeEntry(taskId, userId, onSuccess);

  const { register, control, watch } = form;
  const timeValue = watch('time');
  const [hours, minutes] = timeValue.split(':').map(Number);

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
            onChange={(val) => {
              const newTime = `${String(val).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
              form.setValue('time', newTime);
            }}
            error={errors.time}
          />
          <span className={styles.separator}>:</span>
          <TimeInput
            value={minutes || 0}
            min={0}
            max={59}
            label="MINUTOS"
            type="minutes"
            onChange={(val) => {
              const newTime = `${String(hours || 0).padStart(2, '0')}:${String(val).padStart(2, '0')}`;
              form.setValue('time', newTime);
            }}
          />
        </div>
      </div>

      {/* Date Selection Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Fecha de Trabajo</h3>
        <DateSelector
          value={watch('date') || new Date()}
          onChange={(date) => form.setValue('date', date)}
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
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
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
```

---

### 3. TimerDisplay.tsx

```typescript
/**
 * COMPONENT: TimerDisplay
 *
 * PURPOSE: Main timer display with controls (compact version for chat sidebar)
 *
 * HOOKS TO USE:
 * - useTimerState(taskId)
 * - useTimerActions(taskId, userId, { onConfirmStopOtherTimer })
 * - useTimerOptimistic(taskId)
 *
 * FEATURES:
 * 1. Timer Counter:
 *    - Show TimerCounter component with current time
 *    - Convert timerSeconds to hours:minutes:seconds
 *
 * 2. Control Button:
 *    - Play button when idle or paused
 *    - Pause button when running
 *    - Change icon based on state
 *    - Show loading spinner when isProcessing
 *
 * 3. Status Indicators:
 *    - Show optimistic UI indicator
 *    - Show "running on another task" badge if applicable
 *    - Sync status icon
 *
 * 4. Actions:
 *    - onTogglePanel prop to open full timer panel
 *    - Single click: toggle timer
 *    - Long press or menu: show options (stop, reset, add manual time)
 *
 * PROPS:
 * - taskId: string
 * - userId: string
 * - showControls?: boolean
 * - onTogglePanel?: () => void
 * - compact?: boolean
 *
 * EXAMPLE:
 * <TimerDisplay
 *   taskId="task123"
 *   userId="user456"
 *   showControls={true}
 *   onTogglePanel={() => setShowPanel(true)}
 *   compact={false}
 * />
 */
```

**Estructura del Componente:**

```typescript
export function TimerDisplay({
  taskId,
  userId,
  showControls = true,
  onTogglePanel,
  compact = false,
}: TimerDisplayProps) {
  const { timerSeconds, isRunning, status } = useTimerState(taskId);
  const {
    startTimer,
    pauseTimer,
    stopTimer,
    isProcessing,
    runningTimerTaskId,
  } = useTimerActions(taskId, userId, {
    onConfirmStopOtherTimer: async (current, next) => {
      // Show confirmation dialog
      return window.confirm(
        `Ya tienes un timer activo en la tarea ${current}. ` +
        `¿Deseas detenerlo y comenzar uno nuevo en ${next}?`
      );
    },
  });
  const { isOptimistic, confirmationStatus } = useTimerOptimistic(taskId);

  // Convert seconds to time units
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const handleToggle = async () => {
    if (isRunning) {
      await pauseTimer();
    } else {
      await startTimer();
    }
  };

  return (
    <div className={`${styles.timerDisplay} ${compact ? styles.compact : ''}`}>
      {/* Timer Counter */}
      <TimerCounter
        hours={hours}
        minutes={minutes}
        seconds={seconds}
        isOptimistic={isOptimistic}
        syncStatus={confirmationStatus}
      />

      {/* Warning Badge if timer running elsewhere */}
      {runningTimerTaskId && runningTimerTaskId !== taskId && (
        <div className={styles.warningBadge}>
          Timer activo en otra tarea
        </div>
      )}

      {/* Control Buttons */}
      {showControls && (
        <div className={styles.controls}>
          <TimerButton
            icon={isRunning ? 'Pause' : 'Play'}
            onClick={handleToggle}
            disabled={isProcessing}
            loading={isProcessing}
            variant="primary"
            tooltip={isRunning ? 'Pausar' : 'Iniciar'}
          />

          {onTogglePanel && (
            <TimerButton
              icon="Settings"
              onClick={onTogglePanel}
              variant="default"
              tooltip="Más opciones"
            />
          )}
        </div>
      )}
    </div>
  );
}
```

---

### 4. TimerIntervalsList.tsx

```typescript
/**
 * COMPONENT: TimerIntervalsList
 *
 * PURPOSE: Display list of timer intervals (work sessions)
 *
 * FEATURES:
 * 1. List Display:
 *    - Show each interval as a card/row
 *    - Display start time, end time, duration
 *    - Format dates using formatters from utils
 *
 * 2. Summary:
 *    - Show total time at bottom (optional with showTotal prop)
 *    - Calculate sum of all intervals
 *
 * 3. Formatting:
 *    - Use formatDateWithTime() for timestamps
 *    - Use formatSecondsToHHMM() for durations
 *    - Group by date (optional)
 *
 * 4. Interaction:
 *    - Collapsible sections by date
 *    - Scroll if list is long
 *    - Max visible items (maxVisible prop)
 *
 * 5. Empty State:
 *    - Show message when no intervals
 *    - Icon and helpful text
 *
 * PROPS:
 * - intervals: TimerInterval[]
 * - showTotal?: boolean
 * - compact?: boolean
 * - maxVisible?: number (default: 10)
 *
 * EXAMPLE:
 * <TimerIntervalsList
 *   intervals={timerState.intervals}
 *   showTotal={true}
 *   compact={false}
 *   maxVisible={10}
 * />
 */
```

**Estructura del Componente:**

```typescript
import { formatDateWithTime, formatSecondsToHHMM } from '../../utils/timerFormatters';
import { calculateTotalFromIntervals } from '../../services/timerCalculations';

export function TimerIntervalsList({
  intervals,
  showTotal = false,
  compact = false,
  maxVisible = 10,
}: TimerIntervalsListProps) {
  // Calculate total duration
  const totalSeconds = calculateTotalFromIntervals(intervals);

  // Limit visible items
  const visibleIntervals = intervals.slice(0, maxVisible);
  const hasMore = intervals.length > maxVisible;

  if (intervals.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>⏱️</span>
        <p>No hay intervalos registrados</p>
      </div>
    );
  }

  return (
    <div className={styles.intervalsList}>
      <div className={styles.intervals}>
        {visibleIntervals.map((interval, index) => (
          <div key={index} className={styles.intervalItem}>
            <div className={styles.intervalHeader}>
              <span className={styles.intervalIndex}>#{index + 1}</span>
              <span className={styles.intervalDuration}>
                {formatSecondsToHHMM(interval.duration)}
              </span>
            </div>
            <div className={styles.intervalTimes}>
              <span className={styles.time}>
                {formatDateWithTime(interval.start)}
              </span>
              <span className={styles.arrow}>→</span>
              <span className={styles.time}>
                {formatDateWithTime(interval.end)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className={styles.moreIndicator}>
          +{intervals.length - maxVisible} más...
        </div>
      )}

      {showTotal && (
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total:</span>
          <span className={styles.totalValue}>
            {formatSecondsToHHMM(totalSeconds)}
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## 🏢 ORGANISMS - Especificaciones Detalladas

### 1. TimerPanel.tsx

```typescript
/**
 * COMPONENT: TimerPanel (Organism)
 *
 * PURPOSE: Full timer management panel (modal/sidebar)
 *
 * HOOKS TO USE:
 * - useTimerState(taskId)
 * - useTimerActions(taskId, userId, options)
 * - useTimerSync(taskId, userId)
 * - useTimerOptimistic(taskId)
 *
 * FEATURES:
 * 1. Header:
 *    - Title: "Timer"
 *    - Close button (X)
 *    - Sync status indicator
 *
 * 2. Main Timer Display:
 *    - Large TimerCounter component
 *    - Current status (Running, Paused, Idle)
 *    - Optimistic UI feedback
 *
 * 3. Control Buttons:
 *    - Start/Pause button (toggle)
 *    - Stop button (finalizes timer, updates task)
 *    - Reset button (clears timer)
 *
 * 4. Intervals History:
 *    - TimerIntervalsList component
 *    - Show all recorded intervals
 *    - Total time summary
 *
 * 5. Manual Time Entry:
 *    - Toggle to show TimeEntryForm
 *    - "Add Manual Time" button
 *    - Collapsible section
 *
 * 6. Animations:
 *    - GSAP for panel slide in/out
 *    - Smooth transitions
 *    - Loading states
 *
 * 7. Confirmation Dialogs:
 *    - Confirm before stopping timer
 *    - Confirm before resetting
 *    - Use ConfirmTimerSwitch for switching tasks
 *
 * PROPS:
 * - isOpen: boolean
 * - taskId: string
 * - userId: string
 * - onClose: () => void
 * - onSuccess?: () => void
 *
 * EXAMPLE:
 * <TimerPanel
 *   isOpen={showPanel}
 *   taskId="task123"
 *   userId="user456"
 *   onClose={() => setShowPanel(false)}
 * />
 */
```

**Estructura del Componente:**

```typescript
export function TimerPanel({
  isOpen,
  taskId,
  userId,
  onClose,
  onSuccess,
}: TimerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const { timerSeconds, isRunning, intervals, status } = useTimerState(taskId);
  const { isSyncing, syncError, retrySyncManually } = useTimerSync(taskId, userId);
  const {
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    isProcessing,
    runningTimerTaskId,
  } = useTimerActions(taskId, userId, {
    onConfirmStopOtherTimer: async (current, next) => {
      // Use ConfirmTimerSwitch dialog
      return new Promise((resolve) => {
        // Show dialog and resolve with user's choice
      });
    },
  });
  const { isOptimistic, confirmationStatus } = useTimerOptimistic(taskId);

  // GSAP animation for panel
  useEffect(() => {
    if (!panelRef.current) return;

    if (isOpen) {
      gsap.fromTo(
        panelRef.current,
        { x: '100%', opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else {
      gsap.to(panelRef.current, {
        x: '100%',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      });
    }
  }, [isOpen]);

  // Convert to time units
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const handleStop = async () => {
    if (timerSeconds === 0) {
      alert('No hay tiempo para guardar');
      return;
    }

    const confirmed = window.confirm(
      '¿Deseas finalizar el timer? El tiempo se guardará en la tarea.'
    );
    if (!confirmed) return;

    await stopTimer();
    if (onSuccess) onSuccess();
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      '¿Deseas resetear el timer? Se perderá el tiempo acumulado.'
    );
    if (!confirmed) return;

    await resetTimer();
  };

  return (
    <div
      ref={panelRef}
      className={`${styles.timerPanel} ${isOpen ? styles.open : ''}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Timer</h2>
        {isSyncing && <span className={styles.syncIndicator}>🔄</span>}
        <button onClick={onClose} className={styles.closeButton}>
          ✕
        </button>
      </div>

      {/* Sync Error */}
      {syncError && (
        <div className={styles.errorBanner}>
          Error de sincronización: {syncError.message}
          <button onClick={retrySyncManually}>Reintentar</button>
        </div>
      )}

      {/* Main Timer */}
      <div className={styles.mainTimer}>
        <TimerCounter
          hours={hours}
          minutes={minutes}
          seconds={seconds}
          isOptimistic={isOptimistic}
          syncStatus={confirmationStatus}
        />
        <div className={styles.status}>Estado: {status}</div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <TimerButton
          icon={isRunning ? 'Pause' : 'Play'}
          onClick={isRunning ? pauseTimer : startTimer}
          disabled={isProcessing}
          loading={isProcessing}
          variant="primary"
          size="large"
          tooltip={isRunning ? 'Pausar' : 'Iniciar'}
        />
        <TimerButton
          icon="Stop"
          onClick={handleStop}
          disabled={isProcessing || timerSeconds === 0}
          variant="danger"
          size="large"
          tooltip="Finalizar y guardar"
        />
        <TimerButton
          icon="Reset"
          onClick={handleReset}
          disabled={isProcessing}
          variant="warning"
          tooltip="Resetear timer"
        />
      </div>

      {/* Intervals List */}
      {intervals.length > 0 && (
        <div className={styles.intervalsSection}>
          <h3>Intervalos</h3>
          <TimerIntervalsList
            intervals={intervals}
            showTotal={true}
            maxVisible={5}
          />
        </div>
      )}

      {/* Manual Time Entry Toggle */}
      <div className={styles.manualEntrySection}>
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className={styles.toggleButton}
        >
          {showManualEntry ? 'Ocultar' : 'Añadir Tiempo Manual'}
        </button>

        {showManualEntry && (
          <TimeEntryForm
            taskId={taskId}
            userId={userId}
            onSuccess={() => {
              setShowManualEntry(false);
              if (onSuccess) onSuccess();
            }}
            onCancel={() => setShowManualEntry(false)}
          />
        )}
      </div>
    </div>
  );
}
```

---

### 2. ConfirmTimerSwitch.tsx

```typescript
/**
 * COMPONENT: ConfirmTimerSwitch (Dialog)
 *
 * PURPOSE: Confirmation dialog when switching from one active timer to another
 *
 * FEATURES:
 * 1. Dialog Content:
 *    - Warning icon
 *    - Title: "Timer Activo Detectado"
 *    - Message explaining situation
 *    - Show current task ID with timer running
 *    - Show new task ID user wants to start
 *
 * 2. Time Information:
 *    - Show accumulated time on current timer
 *    - Formatted as "HH:MM:SS"
 *
 * 3. Actions:
 *    - "Cambiar Timer" button (primary, destructive)
 *      - Stops current timer
 *      - Saves time to task
 *      - Starts new timer
 *    - "Cancelar" button (secondary)
 *      - Closes dialog
 *      - Keeps current timer running
 *
 * 4. Animations:
 *    - Fade in backdrop
 *    - Scale in dialog
 *    - Smooth transitions
 *
 * PROPS:
 * - isOpen: boolean
 * - currentTaskId: string
 * - newTaskId: string
 * - currentTimerSeconds: number
 * - onConfirm: () => void | Promise<void>
 * - onCancel: () => void
 *
 * EXAMPLE:
 * <ConfirmTimerSwitch
 *   isOpen={showDialog}
 *   currentTaskId="task123"
 *   newTaskId="task456"
 *   currentTimerSeconds={3600}
 *   onConfirm={async () => {
 *     await switchTimer();
 *     setShowDialog(false);
 *   }}
 *   onCancel={() => setShowDialog(false)}
 * />
 */
```

**Estructura del Componente:**

```typescript
import { formatSecondsToHHMMSS } from '../../utils/timerFormatters';
import { motion, AnimatePresence } from 'framer-motion';

export function ConfirmTimerSwitch({
  isOpen,
  currentTaskId,
  newTaskId,
  currentTimerSeconds,
  onConfirm,
  onCancel,
}: ConfirmTimerSwitchProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {/* Warning Icon */}
            <div className={styles.icon}>
              <span className={styles.warningIcon}>⚠️</span>
            </div>

            {/* Title */}
            <h2 className={styles.title}>Timer Activo Detectado</h2>

            {/* Message */}
            <div className={styles.message}>
              <p>
                Ya tienes un timer activo en la tarea{' '}
                <strong>{currentTaskId}</strong> con{' '}
                <strong>{formatSecondsToHHMMSS(currentTimerSeconds)}</strong>{' '}
                acumulados.
              </p>
              <p>
                ¿Deseas finalizar ese timer y comenzar uno nuevo en la tarea{' '}
                <strong>{newTaskId}</strong>?
              </p>
              <p className={styles.warning}>
                El tiempo del timer actual se guardará automáticamente.
              </p>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                onClick={onCancel}
                className={styles.cancelButton}
                disabled={isConfirming}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className={styles.confirmButton}
                disabled={isConfirming}
              >
                {isConfirming ? 'Cambiando...' : 'Cambiar Timer'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 📝 INDEX FILES

### atoms/index.ts

```typescript
/**
 * Timer Module - Atoms Index
 *
 * Export all atomic components
 */

export { TimerButton } from './TimerButton';
export { TimeInput } from './TimeInput';
export { TimerCounter } from './TimerCounter';

// Export types if needed
export type { TimerButtonProps, TimeInputProps, TimerCounterProps } from '../../types/timer.types';
```

### molecules/index.ts

```typescript
/**
 * Timer Module - Molecules Index
 *
 * Export all molecule components
 */

export { DateSelector } from './DateSelector';
export { TimeEntryForm } from './TimeEntryForm';
export { TimerDisplay } from './TimerDisplay';
export { TimerIntervalsList } from './TimerIntervalsList';

export type {
  DateSelectorProps,
  TimeEntryFormProps,
  TimerDisplayProps,
  TimerIntervalsListProps,
} from '../../types/timer.types';
```

### organisms/index.ts

```typescript
/**
 * Timer Module - Organisms Index
 *
 * Export all organism components
 */

export { TimerPanel } from './TimerPanel';
export { ConfirmTimerSwitch } from './ConfirmTimerSwitch';

export type { TimerPanelProps, ConfirmTimerSwitchProps } from '../../types/timer.types';
```

### components/index.ts (Main)

```typescript
/**
 * Timer Module - Components Index
 *
 * Central export point for all components
 */

// Atoms
export * from './atoms';

// Molecules
export * from './molecules';

// Organisms
export * from './organisms';

// Re-export all component types
export type * from '../types/timer.types';
```

---

## 🎨 SCSS Guidelines

Para todos los archivos `.module.scss`:

```scss
// VARIABLES (use CSS custom properties)
:root {
  --timer-primary: #3b82f6;
  --timer-danger: #ef4444;
  --timer-success: #10b981;
  --timer-warning: #f59e0b;
  --timer-gray: #64748b;
  --timer-border: #e2e8f0;
  --timer-bg: #ffffff;
  --timer-text: #1e293b;
}

// LAYOUT
// - Use flexbox or grid
// - Mobile-first responsive design
// - Breakpoints: 640px (sm), 768px (md), 1024px (lg)

// SPACING
// - Use multiples of 4px (4, 8, 12, 16, 20, 24, etc.)
// - Consistent gaps and padding

// TYPOGRAPHY
// - Font sizes: 12px, 14px, 16px, 18px, 24px, 32px
// - Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

// COLORS
// - Follow design system
// - Support dark mode with @media (prefers-color-scheme: dark)

// ANIMATIONS
// - Use CSS transitions for simple animations
// - Framer Motion for complex animations
// - Keep durations short (0.2s-0.3s)

// ACCESSIBILITY
// - Sufficient contrast ratios (WCAG AA minimum)
// - Focus indicators
// - Touch targets minimum 44x44px
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Para cada componente:

- [ ] Crear archivo `.tsx` con estructura completa
- [ ] Implementar todas las features especificadas
- [ ] Crear archivo `.module.scss` correspondiente
- [ ] Importar hooks correctos desde `../../hooks`
- [ ] Importar utils correctos desde `../../utils`
- [ ] Añadir props types desde `../../types/timer.types`
- [ ] Implementar manejo de errores
- [ ] Añadir loading states
- [ ] Implementar accessibility (aria-labels, keyboard nav)
- [ ] Testing manual en navegador
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support
- [ ] Documentar con comentarios

### Orden recomendado de implementación:

1. **Atoms** (base building blocks):
   - ✅ TimerButton (ya completo)
   - TimeInput
   - TimerCounter

2. **Molecules** (combine atoms):
   - DateSelector
   - TimerIntervalsList
   - TimeEntryForm
   - TimerDisplay

3. **Organisms** (complex components):
   - ConfirmTimerSwitch
   - TimerPanel

4. **Integration**:
   - Crear todos los index.ts
   - Exportar desde módulo principal
   - Integrar en ChatSidebar

---

## 🚀 PROGRESO TOTAL DESPUÉS DE COMPLETAR

**PHASE 5 completada = 95% del proyecto completo**

Solo faltaría PHASE 6 (Integration) que es básicamente:
- Actualizar imports en ChatSidebar
- Testing
- Documentación final

---

**Última actualización:** 13 de Enero, 2025
**Creado por:** Claude Code
**Ubicación:** `/Users/karen/CascadeProjects/Aurin-Task-Manager/`
