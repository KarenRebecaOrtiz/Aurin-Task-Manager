export interface ThemeTogglerProps {
  /**
   * Variante del theme toggler para diferentes contextos
   */
  variant?: 'default' | 'dropdown' | 'compact';
  
  /**
   * Tamaño del theme toggler
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Clase CSS adicional
   */
  className?: string;
  
  /**
   * Callback cuando el tema cambia
   */
  onThemeChange?: (isDarkMode: boolean) => void;
  
  /**
   * Si está deshabilitado
   */
  disabled?: boolean;
}
