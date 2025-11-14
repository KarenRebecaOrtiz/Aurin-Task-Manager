'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ToDoDynamic.module.scss';
import { ToDoDropdown } from './components';
import { useTodos, useToDoDropdownState, useTodoFiltering } from './hooks';
import { TODO_UI } from './constants';
import SimpleTooltip from '@/components/ui/SimpleTooltip';

export default function ToDoDynamic() {
  const { todos } = useTodos();
  const { 
    isVisible, 
    isOpen, 
    dropdownPosition, 
    handleToggleDropdown,
    handleCloseDropdown,
    buttonRef
  } = useToDoDropdownState();
  const { remainingTodos } = useTodoFiltering(todos, []);

  return (
    <>
      <SimpleTooltip text={TODO_UI.TOOLTIP_TEXT}>
        <button
          ref={buttonRef}
          className={styles.todoButton}
          onClick={handleToggleDropdown}
          aria-label={TODO_UI.ARIA_LABELS.BUTTON}
          title={TODO_UI.TOOLTIP_TEXT}
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
      </SimpleTooltip>

      <ToDoDropdown
        isVisible={isVisible}
        isOpen={isOpen}
        dropdownPosition={dropdownPosition}
        onClose={handleCloseDropdown}
      />
    </>
  );
}