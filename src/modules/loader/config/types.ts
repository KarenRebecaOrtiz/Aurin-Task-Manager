/**
 * Loader Module Types
 * 
 * Type definitions for the loader module
 */

export interface LoaderProps {
  /** Optional message to display while loading */
  message?: string;
  
  /** Whether to show as full-page loader or inline */
  isFullPage?: boolean;
  
  /** Loading progress for different resources */
  loadingProgress?: {
    tasks: boolean;
    clients: boolean;
    users: boolean;
  };
  
  /** Controls visibility of the loader */
  isVisible?: boolean;
  
  /** Callback fired when exit animation completes */
  onAnimationComplete?: () => void;
}

export interface LighthouseSceneProps {
  /** Optional className for custom styling */
  className?: string;
}

export type LoaderVariant = 'fullPage' | 'inline';

export interface LoaderState {
  isVisible: boolean;
  message?: string;
  progress?: number;
}
