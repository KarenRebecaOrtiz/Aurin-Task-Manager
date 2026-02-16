import type { Unsubscribe } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  phone?: string;
  city?: string;
  birthDate?: string;
  gender?: string;
  portfolio?: string;
  description?: string;
  stack?: string[];
  teams?: string[];
  profilePhoto?: string;
  coverPhoto?: string;
  status?: string;
  socialLinks?: Record<string, string>;
}

export interface ProfileCardProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onChangeContainer?: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
}

export interface ProfileState {
  profiles: Map<string, UserProfile>;
  loading: Set<string>;
  error: Map<string, Error>;
  subscriptions: Map<string, Unsubscribe>;
}

export interface ProfileActions {
  fetchProfile: (userId: string) => void;
  prefetchProfile: (userId: string) => void;
  unsubscribeProfile: (userId: string) => void;
  invalidateProfile: (userId: string) => void;
  clearStore: () => void;
}

export type ProfileStore = ProfileState & ProfileActions;
