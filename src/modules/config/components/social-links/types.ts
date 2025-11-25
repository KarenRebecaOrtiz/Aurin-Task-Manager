import type React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface NetworkConfig {
  id: string;
  label: string;
  prefix: string;
  icon: LucideIcon;
  placeholder: string;
  regex: RegExp;
}

export interface SocialLink {
  id: string;
  networkId: string;
  username: string;
  fullUrl: string;
}

export interface UseSocialLinksReturn {
  links: SocialLink[];
  selectedNetwork: string;
  username: string;
  setSelectedNetwork: (network: string) => void;
  setUsername: (username: string) => void;
  addLink: () => boolean;
  removeLink: (id: string) => void;
  editLink: (id: string) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  getNetworkConfig: (networkId: string) => NetworkConfig | undefined;
  isEditing: string | null;
}
