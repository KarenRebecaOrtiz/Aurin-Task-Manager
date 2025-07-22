"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ToDoDropdown.module.scss';
import React from 'react';
import { useTodos } from '@/hooks/useTodos';


interface ToDoDropdownProps {
  isVisible: boolean;
  isOpen: boolean;
  dropdownPosition: { top: number; right: number };
  onClose: () => void;
}

export default React.memo(function ToDoDropdown({
  isVisible,
  isOpen,
  dropdownPosition,
  onClose,
}: ToDoDropdownProps) {
  const { todos, isLoading, error, addTodo, toggleTodo, deleteTodo, getCompletedToday } = useTodos();

  
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // Estados para el input
  const [newTodoText, setNewTodoText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInputError, setIsInputError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Bloquear scroll del body en mobile cuando el dropdown está abierto
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

  // Manejar drag en móvil
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isDragging.current) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY.current;
    
    // Solo permitir drag hacia abajo
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isDragging.current) return;
    
    isDragging.current = false;
    
    // Si el drag fue suficiente, cerrar el dropdown
    if (dragOffset > 100) {
      onClose();
    }
    
    setDragOffset(0);
  }, [isMobile, dragOffset, onClose]);

  // Manejar escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Manejar click fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      if (dropdownRef.current?.contains(target)) return;
      
      onClose();
    };

    if (isOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen, onClose]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle error from hook
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setIsInputError(true);
    } else {
      setErrorMessage('');
      setIsInputError(false);
    }
  }, [error]);

  const handleAddTodo = useCallback(async () => {
    const trimmedText = newTodoText.trim();
    
    // Validation
    if (!trimmedText) {
      setErrorMessage('El todo no puede estar vacío');
      setIsInputError(true);
      return;
    }
    
    if (trimmedText.length < 3) {
      setErrorMessage('El todo debe tener al menos 3 caracteres');
      setIsInputError(true);
      return;
    }
    
    if (trimmedText.length > 100) {
      setErrorMessage('El todo no puede tener más de 100 caracteres');
      setIsInputError(true);
      return;
    }
    
    // Check for duplicates
    if (todos.some(todo => todo.text.toLowerCase() === trimmedText.toLowerCase())) {
      setErrorMessage('Este todo ya existe');
      setIsInputError(true);
      return;
    }

    await addTodo(trimmedText);
    setNewTodoText('');
    setErrorMessage('');
    setIsInputError(false);
  }, [newTodoText, todos, addTodo]);

  const handleToggleTodo = useCallback(async (id: string, completed: boolean) => {
    await toggleTodo(id, completed);
  }, [toggleTodo]);

  const handleDeleteTodo = useCallback(async (id: string) => {
    await deleteTodo(id);
  }, [deleteTodo]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTodo();
    }
  }, [handleAddTodo]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoText(e.target.value);
    if (errorMessage) {
      setErrorMessage('');
      setIsInputError(false);
    }
  }, [errorMessage]);

  const remainingTodos = todos.filter(todo => !todo.completed).length;
  const completedToday = getCompletedToday();

  // Solo renderizar cuando es realmente visible
  if (!isVisible) return null;

  // Animaciones de Framer Motion
  const dropdownVariants = {
    hidden: isMobile 
      ? { y: '100%', opacity: 0 }
      : { opacity: 0, y: -10, scale: 0.95 },
    visible: isMobile
      ? { y: '0%', opacity: 1 }
      : { opacity: 1, y: 0, scale: 1 },
    exit: isMobile
      ? { y: '100%', opacity: 0 }
      : { opacity: 0, y: -10, scale: 0.95 }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Renderizado para móvil
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              className={styles.dropdownOverlay} 
              onClick={onClose}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            />
            <motion.div
              ref={(el) => {
                dropdownRef.current = el;
                scrollContainerRef.current = el;
              }}
              className={styles.dropdown}
              style={{ transform: `translateY(${dragOffset}px)` }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              data-todo-dropdown
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ 
                duration: 0.3, 
                ease: "easeInOut",
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              <motion.div 
                className={styles.header}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className={styles.dragBar} />
                <div className={styles.title}>Mis Todos</div>
                <motion.button 
                  className={styles.closeButton} 
                  onClick={onClose} 
                  aria-label="Cerrar todos"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Image src="/x.svg" alt="Cerrar" width={20} height={20} />
                </motion.button>
              </motion.div>
              <motion.div 
                className={styles.scrollContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className={styles.todoContent}>
                  <div className={styles.todoListContainer}>
                    {todos.length === 0 ? (
                      <motion.div 
                        className={styles.emptyState}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Image src="/emptyStateImage.png" alt="Sin tareas" width={120} height={120} />
                        <p>
                          ¡Aún no tienes tareas en tu lista!<br/>
                          <strong>¿Cómo funciona?</strong><br/>
                          Añade tus pendientes usando el campo de arriba y el botón <b>+</b>.<br/>
                          Marca tus tareas como completadas o elimínalas cuando ya no las necesites.<br/>
                          <br/>
                          <span style={{ color: '#888' }}>
                            Usa esta lista para organizar tus actividades diarias, recordatorios rápidos o cualquier cosa que no quieras olvidar. ¡Empieza a ser más productivo ahora!
                          </span>
                        </p>
                      </motion.div>
                    ) : (
                      <ul className={styles.todoList}>
                        <AnimatePresence>
                          {todos.map((todo) => (
                            <motion.li
                              key={todo.id}
                              className={styles.todoItem}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20, height: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              layout
                            >
                              <span
                                className={`${styles.todoText} ${todo.completed ? styles.completed : styles.active}`}
                                onClick={() => handleToggleTodo(todo.id, todo.completed)}
                                style={{ cursor: 'pointer' }}
                              >
                                {todo.text}
                              </span>
                              <div className={styles.todoActions}>
                                <button
                                  className={`${styles.actionButton} ${styles.checkmarkButton}`}
                                  onClick={() => handleToggleTodo(todo.id, todo.completed)}
                                  title={todo.completed ? "Marcar como pendiente" : "Marcar como completado"}
                                >
                                  {todo.completed ? (
                                    <Image src="/checkmark.svg" alt="Desmarcar" width={16} height={16} />
                                  ) : (
                                    <Image src="/checkmark.svg" alt="Completar" width={16} height={16} />
                                  )}
                                </button>
                                <div className={styles.separator} />
                                <button
                                  className={styles.actionButton}
                                  onClick={() => handleDeleteTodo(todo.id)}
                                  title="Eliminar todo"
                                >
                                  <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
                                </button>
                              </div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </div>
                </div>
              </motion.div>
              {/* Nuevo footer fijo solo en mobile */}
              <div className={styles.mobileFooter}>
                <div className={styles.todoStats}>
                  <span className={styles.remainingCount}>{remainingTodos} pendientes</span>
                  <span className={styles.completedCount}>{completedToday} completados hoy</span>
                </div>
                <div className={styles.inputContainer}>
                  <div className={styles.inputWrapper}>
                    <input
                      ref={inputRef}
                      type="text"
                      className={`${styles.input} ${isInputError ? styles.inputError : ''}`}
                      placeholder="Añadir nuevo todo..."
                      value={newTodoText}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                    />
                    <span className={styles.inputIcon}>+</span>
                    {errorMessage && (
                      <motion.div
                        className={styles.errorMessage}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        {errorMessage}
                      </motion.div>
                    )}
                  </div>
                  <button
                    className={styles.addButton}
                    onClick={handleAddTodo}
                    disabled={!newTodoText.trim() || isLoading}
                    title="Añadir todo"
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  // Renderizado para desktop (dropdown normal)
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={(el) => {
            dropdownRef.current = el;
            scrollContainerRef.current = el;
          }}
          className={styles.dropdown}
          style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
          data-todo-dropdown
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ 
            duration: 0.2, 
            ease: "easeOut",
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
        >
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
          >
            <div className={styles.title}>Mis Todos</div>
            <motion.button 
              className={styles.closeButton} 
              onClick={onClose} 
              aria-label="Cerrar todos"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Image src="/x.svg" alt="Cerrar" width={20} height={20} />
            </motion.button>
          </motion.div>
          <motion.div 
            className={styles.scrollContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            {isLoading ? (
              <motion.div 
                className={styles.loadingState}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.spinner}></div>
                <span>Cargando todos...</span>
              </motion.div>
            ) : error ? (
              <motion.div 
                className={styles.errorState}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Image src="/circle-x.svg" alt="Error" width={40} height={40} />
                <span>{error}</span>
              </motion.div>
            ) : (
              <div className={styles.todoContent}>
              <div className={styles.todoStats}>
                <span className={styles.remainingCount}>
                  {remainingTodos} pendientes
                </span>
                <span className={styles.completedCount}>
                  {completedToday} completados hoy
                </span>
            </div>

            <div className={styles.inputContainer}>
              <div className={styles.inputWrapper}>
                <input
                  ref={inputRef}
                  type="text"
                  className={`${styles.input} ${isInputError ? styles.inputError : ''}`}
                  placeholder="Añadir nuevo todo..."
                  value={newTodoText}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                />
                <span className={styles.inputIcon}>+</span>
                {errorMessage && (
                  <motion.div
                    className={styles.errorMessage}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </div>
              <button
                className={styles.addButton}
                onClick={handleAddTodo}
                disabled={!newTodoText.trim() || isLoading}
                title="Añadir todo"
              >
                +
              </button>
            </div>

            <div className={styles.todoListContainer}>
                  {todos.length === 0 ? (
                <motion.div 
                      className={styles.emptyState}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                      <Image src="/emptyStateImage.png" alt="Sin tareas" width={120} height={120} />
                      <p>
                        ¡Aún no tienes tareas en tu lista!<br/>
                        <strong>¿Cómo funciona?</strong><br/>
                        Añade tus pendientes usando el campo de arriba y el botón <b>+</b>.<br/>
                        Marca tus tareas como completadas o elimínalas cuando ya no las necesites.<br/>
                        <br/>
                        <span style={{ color: '#888' }}>
                          Usa esta lista para organizar tus actividades diarias, recordatorios rápidos o cualquier cosa que no quieras olvidar. ¡Empieza a ser más productivo ahora!
                        </span>
                      </p>
                </motion.div>
              ) : (
                <ul className={styles.todoList}>
                  <AnimatePresence>
                    {todos.map((todo) => (
                      <motion.li
                        key={todo.id}
                        className={styles.todoItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        layout
                      >
                        <span
                          className={`${styles.todoText} ${todo.completed ? styles.completed : styles.active}`}
                          onClick={() => handleToggleTodo(todo.id, todo.completed)}
                          style={{ cursor: 'pointer' }}
                        >
                          {todo.text}
                        </span>
                        <div className={styles.todoActions}>
                          <button
                            className={`${styles.actionButton} ${styles.checkmarkButton}`}
                            onClick={() => handleToggleTodo(todo.id, todo.completed)}
                            title={todo.completed ? "Marcar como pendiente" : "Marcar como completado"}
                          >
                            {todo.completed ? (
                              <Image src="/checkmark.svg" alt="Desmarcar" width={16} height={16} />
                            ) : (
                              <Image src="/checkmark.svg" alt="Completar" width={16} height={16} />
                            )}
                          </button>
                          <div className={styles.separator} />
                          <button
                            className={styles.actionButton}
                            onClick={() => handleDeleteTodo(todo.id)}
                            title="Eliminar todo"
                          >
                            <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si las props importantes han cambiado
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.dropdownPosition.top === nextProps.dropdownPosition.top &&
    prevProps.dropdownPosition.right === nextProps.dropdownPosition.right
  );
}); 