/**
 * ToDoDropdown Component
 * Complete todo dropdown implementation using shared Dropdown component
 * Single Responsibility: Todo list UI rendering and management
 */

'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleCheckBig, Check, CheckCheck, SquarePlus, Undo2 } from 'lucide-react';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { ToDoDropdownProps } from '../types';
import { useTodos } from '../hooks/useTodos';
import { useToDoInput } from '../hooks/useToDoInput';
import { useTodoFiltering } from '../hooks/useTodoFiltering';
import { TODO_ANIMATIONS, TODO_UI } from '../constants';
import styles from './ToDoDropdown.module.scss';

/**
 * Main ToDoDropdown component
 */
export const ToDoDropdown: React.FC<ToDoDropdownProps> = ({
  isVisible,
  isOpen,
  dropdownPosition,
  onClose,
}) => {
  const { todos, isLoading, error, addTodo, toggleTodo, getCompletedToday, undoLastCompleted } = useTodos();
  const { 
    newTodoText, 
    errorMessage, 
    setError, 
    isInputError, 
    clearInput, 
    validateTodoText, 
    handleInputChange 
  } = useToDoInput();
  const { remainingTodos, isEmpty } = useTodoFiltering(todos, []);
  const completedToday = getCompletedToday();

  // Mobile detection and drag handling
  const [isMobile, setIsMobile] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const dragStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Undo countdown state
  const [undoCountdown, setUndoCountdown] = useState(0);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= TODO_UI.MOBILE_BREAKPOINT);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Block body scroll on mobile when open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, TODO_UI.INPUT_FOCUS_DELAY);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Handle scroll to close dropdown with animation (only for external scrolls)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (isOpen && !isClosing) {
        // Ignore scroll events from inside the dropdown (textarea, todo list, etc.)
        const target = e.target as HTMLElement;
        const dropdown = document.querySelector('[data-todo-dropdown]');
        if (dropdown && dropdown.contains(target)) {
          return; // Don't close for internal scrolls
        }

        // Start close animation for external scrolls
        setIsClosing(true);
        setTimeout(() => {
          onClose();
          setIsClosing(false);
        }, 200);
      }
    };

    if (isOpen) {
      document.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, isClosing, onClose]);

  // Mobile drag handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isDragging.current) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY.current;
    
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isDragging.current) return;
    
    isDragging.current = false;
    
    if (dragOffset > TODO_UI.DRAG_THRESHOLD) {
      onClose();
    }
    
    setDragOffset(0);
  }, [isMobile, dragOffset, onClose]);

  // Add todo handler
  const handleAddTodo = useCallback(async () => {
    const validationError = validateTodoText(newTodoText);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await addTodo(newTodoText.trim());
      clearInput();
    } catch (err) {
      setError('Error al crear el todo');
    }
  }, [newTodoText, validateTodoText, setError, addTodo, clearInput]);

  // Handle input key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTodo();
    }
  }, [handleAddTodo]);

  // Auto-resize textarea
  const handleTextareaResize = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle textarea change with auto-resize
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
    handleTextareaResize();
  }, [handleInputChange, handleTextareaResize]);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!newTodoText && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [newTodoText]);

  // Start undo countdown
  const startUndoCountdown = useCallback(() => {
    // Clear any existing timer
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
    }

    setUndoCountdown(5);
    setShowUndo(true);

    undoTimerRef.current = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          if (undoTimerRef.current) {
            clearInterval(undoTimerRef.current);
          }
          setShowUndo(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }
    };
  }, []);

  // Handle todo toggle
  const handleTodoToggle = useCallback(async (todoId: string, completed: boolean) => {
    try {
      await toggleTodo(todoId, completed);
      // Start countdown when completing a todo (completed was false, now it's true)
      if (!completed) {
        startUndoCountdown();
      }
    } catch (err) {
      // Error handling can be improved with proper error state
    }
  }, [toggleTodo, startUndoCountdown]);

  // Create optimized handlers to avoid arrow functions in JSX
  const createToggleHandler = useCallback((todoId: string, completed: boolean) => () => handleTodoToggle(todoId, completed), [handleTodoToggle]);

  // Handle undo last completed
  const handleUndo = useCallback(async () => {
    try {
      await undoLastCompleted();
      // Clear countdown and hide undo button
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }
      setShowUndo(false);
      setUndoCountdown(0);
    } catch (err) {
      // Error handling can be improved with proper error state
    }
  }, [undoLastCompleted]);

  if (!isVisible) return null;

  const dropdownContent = (
    <motion.div
      className={`${styles.todoDropdown} ${isMobile ? styles.mobile : ''}`}
      style={{
        position: 'fixed',
        top: isMobile ? 0 : dropdownPosition.top,
        right: isMobile ? 0 : dropdownPosition.right,
        left: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        zIndex: 1000,
        transform: isMobile ? `translateY(${dragOffset}px)` : 'none',
      }}
      data-todo-dropdown
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      animate={isClosing ? 
        (isMobile ? TODO_ANIMATIONS.closeAnimation.mobile : TODO_ANIMATIONS.closeAnimation.desktop)
        : (isMobile ? TODO_ANIMATIONS.dropdown.visible.mobile : TODO_ANIMATIONS.dropdown.visible.desktop)
      }
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Header */}
      <motion.div className={styles.header} {...TODO_ANIMATIONS.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>
            <AnimateIcon animateOnHover>
              <CheckCheck className="w-4 h-4" />
            </AnimateIcon>
            Mis To Do
          </h3>
          <div className={styles.stats}>
            <span className={styles.remaining}>{remainingTodos} {TODO_UI.STATS.REMAINING_LABEL}</span>
            <span className={styles.completed}>{completedToday} {TODO_UI.STATS.COMPLETED_LABEL}</span>
          </div>
        </div>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label={TODO_UI.ARIA_LABELS.CLOSE}
        >
          <AnimateIcon animateOnHover>
            <span className="text-lg">✕</span>
          </AnimateIcon>
        </button>
      </motion.div>

      {/* Input Section */}
      <motion.div className={styles.inputSection} {...TODO_ANIMATIONS.content}>
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            value={newTodoText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyPress}
            placeholder={TODO_UI.INPUT_PLACEHOLDER}
            className={`${styles.textarea} ${isInputError ? styles.error : ''}`}
            disabled={isLoading}
            rows={1}
          />
          <button
            className={styles.addButton}
            onClick={handleAddTodo}
            disabled={isLoading || !newTodoText.trim()}
            aria-label="Añadir todo"
          >
            <AnimateIcon animateOnHover>
              <SquarePlus className="w-4 h-4" />
            </AnimateIcon>
          </button>
        </div>
        
        {errorMessage && (
          <motion.div 
            className={styles.errorMessage}
            {...TODO_ANIMATIONS.errorMessage}
          >
            {errorMessage}
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div className={styles.content} {...TODO_ANIMATIONS.content}>
        {isLoading ? (
          <motion.div className={styles.loading} {...TODO_ANIMATIONS.loadingState}>
            {TODO_UI.LOADING_TEXT}
          </motion.div>
        ) : error ? (
          <motion.div className={styles.error} {...TODO_ANIMATIONS.errorState}>
            {error}
          </motion.div>
        ) : isEmpty ? (
          <motion.div className={styles.emptyState} {...TODO_ANIMATIONS.emptyState}>
            <h4>{TODO_UI.EMPTY_STATE.TITLE}</h4>
            <p className={styles.subtitle}>{TODO_UI.EMPTY_STATE.SUBTITLE}</p>
            <p className={styles.description}>{TODO_UI.EMPTY_STATE.DESCRIPTION}</p>
            <p className={styles.footer}>{TODO_UI.EMPTY_STATE.FOOTER}</p>
          </motion.div>
        ) : (
          <div className={styles.todoList}>
            <AnimatePresence>
              {todos.map((todo, index) => (
                <motion.div
                  key={todo.id}
                  className={`${styles.todoItem} ${todo.completed ? styles.completed : ''}`}
                  {...TODO_ANIMATIONS.todoItem}
                  transition={{ ...TODO_ANIMATIONS.todoItem.transition, delay: index * 0.03 }}
                >
                  <button
                    className={styles.todoToggle}
                    onClick={createToggleHandler(todo.id, todo.completed)}
                    aria-label={todo.completed ? TODO_UI.BUTTON_LABELS.TOGGLE_UNCOMPLETE : TODO_UI.BUTTON_LABELS.TOGGLE}
                  >
                    <div className={`${styles.checkbox} ${todo.completed ? styles.checked : ''}`}>
                      {todo.completed ? (
                        <AnimateIcon animateOnHover>
                          <CircleCheckBig className="w-4 h-4 text-white" />
                        </AnimateIcon>
                      ) : (
                        <AnimateIcon animateOnHover>
                          <Check className="w-4 h-4 text-gray-400" />
                        </AnimateIcon>
                      )}
                    </div>
                  </button>
                  
                  <span className={styles.todoText}>{todo.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Footer - Undo with countdown */}
      <AnimatePresence>
        {showUndo && (
          <motion.div
            className={styles.footer}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              className={styles.undoButton}
              onClick={handleUndo}
              aria-label={TODO_UI.ARIA_LABELS.UNDO}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Deshacer</span>
              <span className={styles.countdown}>{undoCountdown}s</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(dropdownContent, document.body);
};

export default ToDoDropdown;
