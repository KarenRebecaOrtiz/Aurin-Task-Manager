// src/components/ui/Button.tsx
import styles from './Button.module.scss';

type ButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void; // Añade onClick
};

export const Button = ({ children, disabled, type = 'button', onClick }: ButtonProps) => {
  return (
    <button
      type={type}
      className={`${styles.buttonContainer} ${disabled ? styles.disabled : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};