/**
 * ToDoDynamicButton Component
 * Displays the todo button with remaining count or checkmark icon
 * Single Responsibility: Button UI rendering
 */

'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../ToDoDynamic.module.scss';
import { TODO_ANIMATIONS, TODO_UI } from '../constants';

interface ToDoDynamicButtonProps {
  remainingTodos: number;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * Button component for todo list trigger
 */
export const ToDoDynamicButton: React.FC<ToDoDynamicButtonProps> = ({
  remainingTodos,
  onClick,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={buttonRef}
      className={styles.todoButton}
      onClick={onClick}
      aria-label={TODO_UI.ARIA_LABELS.BUTTON}
      title={TODO_UI.TOOLTIP_TEXT}
      data-todo-button
    >
      <AnimatePresence mode="wait">
        {remainingTodos > 0 ? (
          <motion.span
            key="number"
            className={styles.todoNumber}
            initial={TODO_ANIMATIONS.todoItem.initial}
            animate={TODO_ANIMATIONS.todoItem.animate}
            exit={TODO_ANIMATIONS.todoItem.exit}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
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
            initial={TODO_ANIMATIONS.todoItem.initial}
            animate={TODO_ANIMATIONS.todoItem.animate}
            exit={TODO_ANIMATIONS.todoItem.exit}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
};

export default ToDoDynamicButton;
