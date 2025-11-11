import { Timestamp } from 'firebase/firestore';

/**
 * Representa un anuncio/aviso en el sistema
 */
export interface Advice {
  id: string;
  message: string;
  creatorFirstName: string;
  creatorId: string;
  expiry: Timestamp;
  createdAt?: Timestamp;
}

/**
 * Props para el componente OptimizedMarquee
 */
export interface OptimizedMarqueeProps {
  speed?: number;
  showTooltip?: boolean;
  tooltipText?: string;
  fontSize?: string;
  textColor?: string;
  hoverColor?: string;
}
