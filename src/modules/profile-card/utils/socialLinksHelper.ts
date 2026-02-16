import type { UserProfile } from '../types';
import type { SocialLink } from '@/modules/config/components/social-links/types';
import { NETWORK_CONFIG } from '@/modules/config/components/social-links/network-config';

export const getSocialLinks = (profile?: UserProfile): SocialLink[] => {
  if (!profile?.socialLinks) return [];

  const links: SocialLink[] = [];

  Object.entries(profile.socialLinks).forEach(([network, url]) => {
    if (!url) return;

    const networkConfig = NETWORK_CONFIG[network];
    const username = networkConfig
      ? url.replace(networkConfig.prefix, '').split('/').pop() || ''
      : url;

    links.push({
      id: network,
      networkId: network,
      username,
      fullUrl: url,
    });
  });

  return links;
};
