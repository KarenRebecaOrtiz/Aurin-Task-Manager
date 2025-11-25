'use client';

import { NETWORK_CONFIG } from './network-config';

interface SocialIconProps {
  networkId: string;
  className?: string;
  size?: number;
}

export function SocialIcon({ networkId, className, size = 18 }: SocialIconProps) {
  const config = NETWORK_CONFIG[networkId];
  if (!config) return null;

  const Icon = config.icon;

  return <Icon className={className} size={size} style={{ flexShrink: 0 }} />;
}
