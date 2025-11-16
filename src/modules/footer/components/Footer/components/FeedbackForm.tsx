import React from 'react';
import styles from '../Footer.module.scss';

interface FeedbackFormProps {
  feedback: string;
  isSubmitting: boolean;
  onFeedbackChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  feedback,
  isSubmitting,
  onFeedbackChange,
  onSubmit,
}) => {
  return (
    <form className={styles.feedbackForm} onSubmit={onSubmit}>
      <input
        type="text"
        value={feedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
        placeholder="Escribe aquí tus comentarios..."
        className={styles.feedbackInput}
        disabled={isSubmitting}
        suppressHydrationWarning
      />
      <button
        type="submit"
        className={styles.sendButton}
        disabled={isSubmitting}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.4 6.32l8.49-2.83c3.81-1.27 5.88.8 4.61 4.61l-2.83 8.49c-1.9 5.71-5.02 5.71-6.92 0l-.84-2.52-2.52-.84c-5.71-1.9-5.71-5.02 0-6.91z" />
          <path d="M10.11 13.65l3.58-3.59" />
        </svg>
        Enviar
      </button>
    </form>
  );
};
