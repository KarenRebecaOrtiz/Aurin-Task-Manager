'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import styles from './ToDoDropdown.module.scss';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  completedDate?: string;
}

interface ToDoDropdownProps {
  isVisible: boolean;
  isOpen: boolean;
  dropdownPosition: { top: number; right: number };
}

export default function ToDoDropdown({ isVisible, isOpen, dropdownPosition }: ToDoDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInputError, setIsInputError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Load todos from localStorage
    try {
      const savedTodos = localStorage.getItem('todos');
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos));
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  }, []);

  useEffect(() => {
    // Listen for todos changes from other components
    const handleTodosChanged = () => {
      try {
        const savedTodos = localStorage.getItem('todos');
        if (savedTodos) {
          setTodos(JSON.parse(savedTodos));
        }
      } catch (error) {
        console.error('Error loading todos:', error);
      }
    };

    window.addEventListener('todosChanged', handleTodosChanged);
    return () => window.removeEventListener('todosChanged', handleTodosChanged);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Get today's date in ISO format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Get completed todos for today
  const getCompletedToday = () => {
    const today = getTodayDate();
    return todos.filter(todo => todo.completed && todo.completedDate === today).length;
  };

  const addTodo = () => {
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

    const newTodo: Todo = {
      id: Date.now(),
      text: trimmedText,
      completed: false,
    };

    const updatedTodos = [newTodo, ...todos];
    setTodos(updatedTodos);
    setNewTodoText('');
    setErrorMessage('');
    setIsInputError(false);
    
    // Save to localStorage and dispatch event
    try {
      localStorage.setItem('todos', JSON.stringify(updatedTodos));
      window.dispatchEvent(new CustomEvent('todosChanged'));
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  };

  const toggleTodo = (id: number) => {
    const updatedTodos = todos.map(todo => {
      if (todo.id === id) {
        return {
          ...todo,
          completed: !todo.completed,
          completedDate: !todo.completed ? getTodayDate() : undefined
        };
      }
      return todo;
    });
    
    setTodos(updatedTodos);
    
    // Save to localStorage and dispatch event
    try {
      localStorage.setItem('todos', JSON.stringify(updatedTodos));
      window.dispatchEvent(new CustomEvent('todosChanged'));
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  };

  const deleteTodo = (id: number) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    
    // Save to localStorage and dispatch event
    try {
      localStorage.setItem('todos', JSON.stringify(updatedTodos));
      window.dispatchEvent(new CustomEvent('todosChanged'));
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo();
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
                onClick={addTodo}
                disabled={!newTodoText.trim()}
                title="Añadir todo"
              >
                +
              </button>
            </div>

            <div className={styles.todoListContainer}>
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
                        onClick={() => toggleTodo(todo.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {todo.text}
                      </span>
                      <div className={styles.todoActions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => toggleTodo(todo.id)}
                          title={todo.completed ? "Marcar como pendiente" : "Marcar como completado"}
                        >
                          {todo.completed ? "↺" : "✓"}
                        </button>
                        <div className={styles.separator} />
                        <button
                          className={styles.actionButton}
                          onClick={() => deleteTodo(todo.id)}
                          title="Eliminar todo"
                        >
                          🗑️
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
} 