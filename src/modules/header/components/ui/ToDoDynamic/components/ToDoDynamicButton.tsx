/**
 * ToDoDynamicButton Component
 * Displays the todo button with remaining count or checkmark icon
 * Single Responsibility: Button UI rendering
 */

'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare } from 'lucide-react';
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
          <motion.div
            key="icon"
            initial={TODO_ANIMATIONS.todoItem.initial}
            animate={TODO_ANIMATIONS.todoItem.animate}
            exit={TODO_ANIMATIONS.todoItem.exit}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <CheckSquare size={20} strokeWidth={2} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

export default ToDoDynamicButton;
