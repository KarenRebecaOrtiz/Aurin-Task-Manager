'use client';

import { useEffect, useRef, forwardRef } from 'react';
import { gsap } from 'gsap';
import styles from '../ChatSidebar.module.scss';

interface TimerPanelProps {
  isOpen: boolean;
  timerInput: string;
  setTimerInput: (value: string) => void;
  dateInput: Date;
  setDateInput: (date: Date) => void;
  commentInput: string;
  setCommentInput: (value: string) => void;
  totalHours: string;
  onAddTimeEntry: () => Promise<void>;
  onCancel: () => void;
}

const TimerPanel = forwardRef<HTMLDivElement, TimerPanelProps>(({
  isOpen,
  timerInput,
  setTimerInput,
  dateInput,
  setDateInput,
  commentInput,
  setCommentInput,
  totalHours,
  onAddTimeEntry,
  onCancel,
}, ref) => {
  const timerPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[TimerPanel:UseEffect] State changed', {
      isOpen,
      panelExists: !!timerPanelRef.current,
      refExists: !!ref
    });

    if (timerPanelRef.current) {
      if (isOpen) {
        console.log('[TimerPanel:UseEffect] 🟢 OPENING TimerPanel');
      } else {
        console.log('[TimerPanel:UseEffect] 🔴 CLOSING TimerPanel');
      }

      gsap.to(timerPanelRef.current, {
        height: isOpen ? 'auto' : 0,
        opacity: isOpen ? 1 : 0,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          console.log('[TimerPanel:UseEffect] ✅ Animation completed', {
            isOpen,
            finalHeight: timerPanelRef.current?.offsetHeight,
            finalOpacity: timerPanelRef.current ? getComputedStyle(timerPanelRef.current).opacity : 'unknown'
          });
        }
      });
    }
  }, [isOpen, ref]);

  const handleTimerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[TimerPanel:HandleTimerInputChange] Timer input changed', {
      oldValue: timerInput,
      newValue: e.target.value,
      isOpen
    });
    setTimerInput(e.target.value);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[TimerPanel:HandleDateInputChange] Date input changed', {
      oldValue: dateInput,
      newValue: e.target.value,
      isOpen
    });
    setDateInput(new Date(e.target.value));
  };

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('[TimerPanel:HandleCommentInputChange] Comment input changed', {
      oldValue: commentInput,
      newValue: e.target.value,
      isOpen
    });
    setCommentInput(e.target.value);
  };

  const handleAddTimeEntryClick = async () => {
    console.log('[TimerPanel:HandleAddTimeEntryClick] 🎯 Add time entry clicked', {
      timerInput,
      dateInput,
      commentInput: commentInput.slice(0, 50) + (commentInput.length > 50 ? '...' : ''),
      totalHours
    });
    
    try {
      await onAddTimeEntry();
      console.log('[TimerPanel:HandleAddTimeEntryClick] ✅ Time entry added successfully');
    } catch (error) {
      console.error('[TimerPanel:HandleAddTimeEntryClick] ❌ Error adding time entry:', error);
    }
  };

  const handleCancelClick = () => {
    console.log('[TimerPanel:HandleCancelClick] 🔴 Cancel clicked');
    onCancel();
  };

  // Format date for input[type="date"]
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div 
      ref={(node) => {
        timerPanelRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }} 
      className={styles.timerPanel} 
      id="timerPanel"
    >
      <div className={styles.timerPanelContent}>
        <div className={styles.timerRow}>
          <div className={styles.timerCard}>
            <label htmlFor="timer-time-input" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
              Tiempo:
            </label>
            <input
              id="timer-time-input"
              type="time"
              value={timerInput}
              onChange={handleTimerInputChange}
              className={styles.timerInput}
            />
          </div>
          <div className={styles.timerCard}>
            <label htmlFor="timer-date-input" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
              Fecha:
            </label>
            <input
              id="timer-date-input"
              type="date"
              value={formatDateForInput(dateInput)}
              onChange={handleDateInputChange}
              className={styles.timerInput}
            />
          </div>
        </div>
        <div className={styles.timerCard}>
          <label htmlFor="timer-comment-input" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
            Comentario:
          </label>
          <textarea
            id="timer-comment-input"
            placeholder="Añadir comentario"
            value={commentInput}
            onChange={handleCommentInputChange}
            className={styles.timerCommentInput}
            rows={3}
          />
        </div>
        <div className={styles.timerTotal}>
          Has invertido: {totalHours} en esta tarea.
        </div>
        <div className={styles.timerActions}>
          <button
            type="button"
            onClick={handleAddTimeEntryClick}
            className={styles.timerAddButton}
          >
            Añadir Tiempo
          </button>
          <button
            type="button"
            onClick={handleCancelClick}
            className={styles.timerCancelButton}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
});

TimerPanel.displayName = 'TimerPanel';

export default TimerPanel;
