import styles from './Button.module.scss';
type ButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};
export const Button = ({ children, disabled, type = 'button' }: ButtonProps) => {
  return (
    <button type={type} className={`${styles.button} ${disabled ? styles.disabled : ''}`}>
      {children}
    </button>
  );
};