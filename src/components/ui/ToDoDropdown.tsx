'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTodos } from '@/hooks/useTodos';
import styles from './ToDoDropdown.module.scss';

interface ToDoDropdownProps {
  isVisible: boolean;
  isOpen: boolean;
  dropdownPosition: { top: number; right: number };
}

export default function ToDoDropdown({ isVisible, isOpen, dropdownPosition }: ToDoDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInputError, setIsInputError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { todos, isLoading, error, addTodo, toggleTodo, deleteTodo, getCompletedToday } = useTodos();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleAddTodo = async () => {
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
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    await toggleTodo(id, completed);
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTodo();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoText(e.target.value);
    if (errorMessage) {
      setErrorMessage('');
      setIsInputError(false);
    }
  };

  const remainingTodos = todos.filter(todo => !todo.completed).length;
  const completedToday = getCompletedToday();

  if (!isVisible || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.dropdownOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={styles.dropdown}
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
            }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            data-todo-dropdown
          >
            <div className={styles.dropdownHeader}>
              <h3 className={styles.dropdownTitle}>
                Mis Todos
              </h3>
              <div className={styles.todoStats}>
                <span className={styles.remainingCount}>
                  {remainingTodos} pendientes
                </span>
                <span className={styles.completedCount}>
                  {completedToday} completados hoy
                </span>
              </div>
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
                            className={styles.actionButton}
                            onClick={() => handleToggleTodo(todo.id, todo.completed)}
                            title={todo.completed ? "Marcar como pendiente" : "Marcar como completado"}
                          >
                            {todo.completed ? "↺" : "✓"}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
} 