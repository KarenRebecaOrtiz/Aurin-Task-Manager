'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ToDoDynamic.module.scss';
import ToDoDropdown from './ui/ToDoDropdown';
import { useTodos } from '@/hooks/useTodos';
import { useShallow } from 'zustand/react/shallow';
import { useToDoDropdownStore } from '@/stores/todoDropdownStore';

export default function ToDoDynamic() {
  const { todos } = useTodos();
  const { 
    isVisible, 
    isOpen, 
    dropdownPosition, 
    setIsVisible, 
    setIsOpen, 
    setDropdownPosition, 
    resetState 
  } = useToDoDropdownStore(
    useShallow((state) => ({
      isVisible: state.isVisible,
      isOpen: state.isOpen,
      dropdownPosition: state.dropdownPosition,
      setIsVisible: state.setIsVisible,
      setIsOpen: state.setIsOpen,
      setDropdownPosition: state.setDropdownPosition,
      resetState: state.resetState,
    }))
  );
  
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position when opening
  const handleToggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const top = buttonRect.bottom + 8;
    const right = window.innerWidth - buttonRect.right;

    setDropdownPosition({ top, right });
    setIsVisible(true);
    setIsOpen(!isOpen);
  }, [isOpen, setDropdownPosition, setIsVisible, setIsOpen]);

  // Close dropdown
  const handleCloseDropdown = useCallback(() => {
    setIsOpen(false);
    setIsVisible(false);
    resetState();
  }, [setIsOpen, setIsVisible, resetState]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      
      const dropdown = document.querySelector('[data-todo-dropdown]');
      if (dropdown && dropdown.contains(target)) {
        return;
      }
      
      handleCloseDropdown();
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
  }, [isOpen, handleCloseDropdown]);

  const completedTodos = todos.filter((todo) => todo.completed).length;
  const remainingTodos = todos.length - completedTodos;

  return (
    <>
      <button
        ref={buttonRef}
        className={styles.todoButton}
        onClick={handleToggleDropdown}
        aria-label="Abrir lista de todos"
        title="Mis Todos"
        data-todo-button
      >
        <AnimatePresence mode="wait">
          {remainingTodos > 0 ? (
            <motion.span
              key="number"
              className={styles.todoNumber}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {remainingTodos}
            </motion.span>
          ) : (
            <motion.svg
              key="icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </motion.svg>
          )}
        </AnimatePresence>
      </button>

      <ToDoDropdown
        isVisible={isVisible}
        isOpen={isOpen}
        dropdownPosition={dropdownPosition}
        onClose={handleCloseDropdown}
      />
    </>
  );
}