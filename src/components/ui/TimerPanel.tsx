'use client';

import { useEffect, useRef, forwardRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TimeInput } from '@/components/ui/TimeInput';
import { Wizard, WizardStep, WizardProgress, WizardActions } from '@/components/ui/wizard';
import styles from '../ChatSidebar.module.scss';
import Image from 'next/image';

// Zod schema for form validation
const timerFormSchema = z.object({
  time: z.string().min(1, { message: "La hora es requerida*" })
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Formato de hora inválido (HH:MM)*" }),
  date: z.date({ required_error: "La fecha es requerida*" }),
  comment: z.string().optional(),
});

type TimerFormValues = z.infer<typeof timerFormSchema>;

interface TimerPanelProps {
  isOpen: boolean;
  timerInput: string;
  setTimerInput: (value: string) => void;
  dateInput: Date;
  setDateInput: (date: Date) => void;
  commentInput: string;
  setCommentInput: (value: string) => void;
  totalHours: string;
  onAddTimeEntry: (time?: string, date?: Date, comment?: string) => Promise<void>;
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
  
  // State management
  const [isMounted, setIsMounted] = useState(false);
  const [hasFormBeenInitialized, setHasFormBeenInitialized] = useState(false);

  // Default values for form - memoized to prevent re-creation
  const defaultValues: TimerFormValues = useMemo(() => ({
    time: timerInput || "",
    date: dateInput || new Date(),
    comment: commentInput || "",
  }), [timerInput, dateInput, commentInput]);

  // Form setup
  const form = useForm<TimerFormValues>({
    resolver: zodResolver(timerFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize form with current values only once when opened
  useEffect(() => {
    if (isOpen && !hasFormBeenInitialized) {
      console.log('[TimerPanel:Initialize] Setting initial form values');
      form.setValue('time', timerInput || "");
      form.setValue('date', dateInput || new Date());
      form.setValue('comment', commentInput || "");
      setHasFormBeenInitialized(true);
    } else if (!isOpen) {
      setHasFormBeenInitialized(false);
    }
  }, [isOpen, hasFormBeenInitialized, form, timerInput, dateInput, commentInput]);

  // Main panel animation effect
  useEffect(() => {
    console.log('[TimerPanel:UseEffect] State changed', {
      isOpen,
      panelExists: !!timerPanelRef.current,
      isMounted
    });

    if (!isMounted) return;

    if (timerPanelRef.current) {
      if (isOpen) {
        console.log('[TimerPanel:UseEffect] 🟢 OPENING TimerPanel');
        gsap.fromTo(timerPanelRef.current,
          { height: 0, opacity: 0 },
          { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
      } else {
        console.log('[TimerPanel:UseEffect] 🔴 CLOSING TimerPanel');
        gsap.to(timerPanelRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    }
  }, [isOpen, isMounted]);

  // Sync form values with parent state - debounced to prevent excessive updates
  useEffect(() => {
    if (!hasFormBeenInitialized) return;

    const timeoutId = setTimeout(() => {
      const currentValues = form.getValues();
      
      if (currentValues.time !== timerInput) {
        console.log('[TimerPanel:Sync] Updating parent time:', currentValues.time);
        setTimerInput(currentValues.time);
      }
      
      if (currentValues.date && currentValues.date !== dateInput) {
        console.log('[TimerPanel:Sync] Updating parent date:', currentValues.date);
        setDateInput(currentValues.date);
      }
      
      if (currentValues.comment !== commentInput) {
        console.log('[TimerPanel:Sync] Updating parent comment');
        setCommentInput(currentValues.comment || '');
      }
    }, 300); // Debounce for 300ms

    const subscription = form.watch(() => {
      // This triggers the debounced update above
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [hasFormBeenInitialized, form, timerInput, dateInput, commentInput, setTimerInput, setDateInput, setCommentInput]);

  // Memoized handlers to prevent re-renders
  const handleTimeInputChange = useCallback((value: string) => {
    console.log('[TimerPanel:HandleTimeInputChange] Time input changed:', value);
    form.setValue('time', value, { shouldValidate: true });
  }, [form]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    console.log('[TimerPanel:HandleDateSelect] Date selected:', date);
    if (date) {
      form.setValue('date', date, { shouldValidate: true });
    }
  }, [form]);

  const handleCommentChange = useCallback((value: string) => {
    console.log('[TimerPanel:HandleCommentChange] Comment changed');
    form.setValue('comment', value, { shouldValidate: true });
  }, [form]);

  const handleCancelClick = useCallback(() => {
    console.log('[TimerPanel:HandleCancelClick] 🔴 Cancel clicked');
    setHasFormBeenInitialized(false);
    onCancel();
  }, [onCancel]);

  // Step validation
  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof TimerFormValues)[] = [];
    
    switch (step) {
      case 0:
        fieldsToValidate = ['time'];
        break;
      case 1:
        fieldsToValidate = ['date'];
        break;
      case 2:
        fieldsToValidate = ['comment'];
        break;
      default:
        return true;
    }

    const result = await form.trigger(fieldsToValidate);
    if (!result) {
      console.log('[TimerPanel:ValidateStep] Validation failed for step', step, fieldsToValidate);
    }
    return result;
  }, [form]);

  // Final submission
  const handleSubmit = useCallback(async () => {
    const values = form.getValues();
    console.log('[TimerPanel:HandleSubmit] 🎯 Submitting time entry', {
      time: values.time,
      date: values.date,
      comment: values.comment?.slice(0, 50) + (values.comment && values.comment.length > 50 ? '...' : ''),
      totalHours
    });

    try {
      // Call onAddTimeEntry with the current form values directly
      await onAddTimeEntry(values.time, values.date, values.comment);
      console.log('[TimerPanel:HandleSubmit] ✅ Time entry added successfully');
      
      // Close the panel automatically after successful submission
      onCancel();
    } catch (error) {
      console.error('[TimerPanel:HandleSubmit] ❌ Error adding time entry:', error);
      alert(`Error al añadir la entrada de tiempo: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    }
  }, [form, onAddTimeEntry, totalHours, onCancel]);

  if (!isMounted) {
    return null;
  }

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
        <Wizard totalSteps={3}>
          {/* Header with progress */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            padding: '16px 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#182735',
              margin: 0 
            }}>
              Añadir Tiempo
            </h3>
            <button
              type="button"
              onClick={handleCancelClick}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Image src="/x.svg" alt="Cerrar" width={16} height={16} />
            </button>
          </div>

          <WizardProgress />

          {/* Step 1: Time Input */}
          <WizardStep step={0} validator={() => validateStep(0)}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#182735', marginBottom: '8px' }}>
                ⏰ Tiempo Invertido
              </h4>
              <p style={{ fontSize: '16px', color: '#71717A', margin: 0 }}>
                Ingresa el tiempo que dedicaste a esta tarea
              </p>
            </div>
            <div className={styles.timerCard}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '16px',
                padding: '20px 0'
              }}>
                <Controller
                  name="time"
                  control={form.control}
                  render={({ field }) => {
                    const [hours, minutes] = field.value.split(':').map(Number);
                    const currentHours = isNaN(hours) ? 0 : hours;
                    const currentMinutes = isNaN(minutes) ? 0 : minutes;

                    return (
                      <>
                        <TimeInput
                          value={currentHours}
                          min={0}
                          max={23}
                          label="HORAS"
                          type="hours"
                          onChange={(newHours) => {
                            const newTime = `${String(newHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
                            field.onChange(newTime);
                            handleTimeInputChange(newTime);
                          }}
                        />
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '600', 
                          color: '#182735',
                          margin: '0 4px'
                        }}>
                          :
                        </div>
                        <TimeInput
                          value={currentMinutes}
                          min={0}
                          max={59}
                          label="MINUTOS"
                          type="minutes"
                          onChange={(newMinutes) => {
                            const newTime = `${String(currentHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
                            field.onChange(newTime);
                            handleTimeInputChange(newTime);
                          }}
                        />
                      </>
                    );
                  }}
                />
              </div>
              {form.formState.errors.time && (
                <div style={{ 
                  textAlign: 'center',
                  marginTop: '16px'
                }}>
                  <span style={{ 
                    color: '#ef4444', 
                    fontSize: '16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {form.formState.errors.time.message}
                  </span>
                </div>
              )}
            </div>
          </WizardStep>

          {/* Step 2: Date Selection */}
          <WizardStep step={1} validator={() => validateStep(1)}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#182735', marginBottom: '8px' }}>
                📅 Fecha de Trabajo
              </h4>
              <p style={{ fontSize: '12px', color: '#71717A', margin: 0 }}>
                Selecciona la fecha en la que realizaste el trabajo
              </p>
            </div>
            <div className={styles.timerCard}>
              <div style={{
                transform:'scale(0.8)',
                display: 'flex',
                justifyContent: 'center',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
              }}>
                <DayPicker
                  mode="single"
                  selected={form.watch('date') || undefined}
                  onSelect={handleDateSelect}
                  style={{ 
                    background: 'transparent',
                    margin: 0
                  }}
                  styles={{
                    root: { 
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    },
                    month_caption: {
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#182735',
                      marginBottom: '12px'
                    },
                    weekdays: {
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#71717A'
                    },
                    day: {
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#182735',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    },
                    day_button: {
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    },
                    selected: {
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontWeight: '600'
                    },
                    today: {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      fontWeight: '600'
                    }
                  }}
                  modifiersStyles={{
                    selected: {
                      backgroundColor: '#3b82f6',
                      color: 'white'
                    },
                    today: {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6'
                    }
                  }}
                />
              </div>
              {form.formState.errors.date && (
                <div style={{ 
                  textAlign: 'center',
                  marginTop: '12px'
                }}>
                  <span style={{ 
                    color: '#ef4444', 
                    fontSize: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {form.formState.errors.date.message}
                  </span>
                </div>
              )}
            </div>
          </WizardStep>

          {/* Step 3: Comment Input */}
          <WizardStep step={2} validator={() => validateStep(2)}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#182735', marginBottom: '8px' }}>
                💭 Comentario
              </h4>
              <p style={{ fontSize: '16px', color: '#71717A', margin: 0 }}>
                Añade detalles sobre el trabajo realizado (opcional)
              </p>
            </div>
            <div className={styles.timerCard}>
              <label htmlFor="timer-comment-input" style={{ fontSize: '16px', marginBottom: '8px', display: 'block' }}>
                Comentario:
              </label>
              <Controller
                name="comment"
                control={form.control}
                render={({ field }) => (
                  <textarea
                    id="timer-comment-input"
                    placeholder="Añadir comentario sobre el trabajo realizado..."
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      handleCommentChange(e.target.value);
                    }}
                    className={styles.timerCommentInput}
                    rows={3}
                    style={{ width: '100%', resize: 'vertical', minHeight: '80px' }}
                    onKeyDown={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        switch (e.key.toLowerCase()) {
                          case 'a':
                            e.preventDefault();
                            e.currentTarget.select();
                            break;
                          case 'c':
                            e.preventDefault();
                            const selection = window.getSelection();
                            if (selection && selection.toString().length > 0) {
                              navigator.clipboard.writeText(selection.toString()).catch(() => {
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = selection.toString();
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                              });
                            }
                            break;
                          case 'v':
                            e.preventDefault();
                            navigator.clipboard.readText().then(text => {
                              const target = e.currentTarget;
                              const start = target.selectionStart;
                              const end = target.selectionEnd;
                              const currentValue = field.value || '';
                              const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
                              field.onChange(newValue);
                              handleCommentChange(newValue);
                              // Set cursor position after paste
                              setTimeout(() => {
                                target.setSelectionRange(start + text.length, start + text.length);
                              }, 0);
                            }).catch(() => {
                              // Fallback for older browsers or when clipboard access is denied
                              document.execCommand('paste');
                            });
                            break;
                          case 'x':
                            e.preventDefault();
                            const cutSelection = window.getSelection();
                            if (cutSelection && cutSelection.toString().length > 0) {
                              navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                                const target = e.currentTarget;
                                const start = target.selectionStart;
                                const end = target.selectionEnd;
                                const currentValue = field.value || '';
                                const newValue = currentValue.substring(0, start) + currentValue.substring(end);
                                field.onChange(newValue);
                                handleCommentChange(newValue);
                              }).catch(() => {
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = cutSelection.toString();
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                                const target = e.currentTarget;
                                const start = target.selectionStart;
                                const end = target.selectionEnd;
                                const currentValue = field.value || '';
                                const newValue = currentValue.substring(0, start) + currentValue.substring(end);
                                field.onChange(newValue);
                                handleCommentChange(newValue);
                              });
                            }
                            break;
                        }
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      
                      const selection = window.getSelection();
                      const hasSelection = selection && selection.toString().length > 0;
                      
                      const menu = document.createElement('div');
                      menu.className = 'context-menu';
                      menu.style.cssText = `
                        position: fixed;
                        top: ${e.clientY}px;
                        left: ${e.clientX}px;
                        background: white;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        z-index: 1000;
                        font-family: 'Inter Tight', sans-serif;
                        font-size: 14px;
                        min-width: 150px;
                      `;

                      const menuItems = [
                        { label: 'Deshacer', action: () => document.execCommand('undo'), shortcut: 'Ctrl+Z' },
                        { label: 'Rehacer', action: () => document.execCommand('redo'), shortcut: 'Ctrl+Y' },
                        { type: 'separator' },
                        { 
                          label: 'Cortar', 
                          action: async () => {
                            if (hasSelection) {
                              try {
                                await navigator.clipboard.writeText(selection.toString());
                                document.execCommand('delete');
                              } catch {
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = selection.toString();
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                                document.execCommand('delete');
                              }
                            }
                          }, 
                          shortcut: 'Ctrl+X', 
                          disabled: !hasSelection 
                        },
                        { 
                          label: 'Copiar', 
                          action: async () => {
                            if (hasSelection) {
                              try {
                                await navigator.clipboard.writeText(selection.toString());
                              } catch {
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = selection.toString();
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                              }
                            }
                          }, 
                          shortcut: 'Ctrl+C', 
                          disabled: !hasSelection 
                        },
                        { 
                          label: 'Pegar', 
                          action: async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              document.execCommand('insertText', false, text);
                            } catch {
                              // Fallback for older browsers
                              document.execCommand('paste');
                            }
                          }, 
                          shortcut: 'Ctrl+V'
                        },
                        { type: 'separator' },
                        { 
                          label: 'Seleccionar Todo', 
                          action: () => {
                            const target = e.currentTarget;
                            target.select();
                          }, 
                          shortcut: 'Ctrl+A'
                        },
                        { 
                          label: 'Eliminar', 
                          action: () => {
                            if (hasSelection) {
                              document.execCommand('delete');
                            }
                          }, 
                          shortcut: 'Delete', 
                          disabled: !hasSelection 
                        }
                      ];

                      menuItems.forEach((item) => {
                        if (item.type === 'separator') {
                          const separator = document.createElement('hr');
                          separator.style.cssText = 'margin: 4px 0; border: none; border-top: 1px solid #eee;';
                          menu.appendChild(separator);
                          return;
                        }

                        const menuItem = document.createElement('div');
                        menuItem.style.cssText = `
                          padding: 8px 12px;
                          cursor: pointer;
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          ${item.disabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                        `;
                        menuItem.innerHTML = `
                          <span>${item.label}</span>
                          <span style="color: #666; font-size: 12px;">${item.shortcut}</span>
                        `;
                        
                        if (!item.disabled) {
                          menuItem.addEventListener('click', () => {
                            item.action();
                            document.body.removeChild(menu);
                          });
                          
                          menuItem.addEventListener('mouseenter', () => {
                            menuItem.style.backgroundColor = '#f5f5f5';
                          });
                          menuItem.addEventListener('mouseleave', () => {
                            menuItem.style.backgroundColor = 'transparent';
                          });
                        }
                        
                        menu.appendChild(menuItem);
                      });

                      document.body.appendChild(menu);

                      // Close menu when clicking outside
                      const closeMenu = () => {
                        if (document.body.contains(menu)) {
                          document.body.removeChild(menu);
                        }
                        document.removeEventListener('click', closeMenu);
                      };
                      
                      setTimeout(() => {
                        document.addEventListener('click', closeMenu);
                      }, 0);
                    }}
                  />
                )}
              />
              <div className={styles.timerTotal} style={{ marginTop: '16px', textAlign: 'center' }}>
                Has invertido: <strong>{totalHours}</strong> en esta tarea.
              </div>
            </div>
          </WizardStep>

          <WizardActions onComplete={handleSubmit} />
        </Wizard>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

TimerPanel.displayName = 'TimerPanel';

export default TimerPanel;
