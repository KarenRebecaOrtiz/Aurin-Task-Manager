// TODO: Exportar función getSocialLinks
// TODO: Input: profile (UserProfile | undefined)
// TODO: Output: SocialLink[]
// TODO: Procesar socialLinks del profile y crear array de SocialLink
// TODO: Incluir networks: github, linkedin, twitter, instagram
// TODO: Extraer username de la URL usando network prefix

import type { UserProfile } from '../types';
import type { SocialLink } from '@/modules/config/components/social-links/types';
import { NETWORK_CONFIG } from '@/modules/config/components/social-links/network-config';

export const getSocialLinks = (profile?: UserProfile): SocialLink[] => {
  if (!profile?.socialLinks) return [];

  const links: SocialLink[] = [];
  const socialNetworks: Array<keyof typeof profile.socialLinks> = [
    'github',
    'linkedin',
    'twitter',
    'instagram',
  ];

  // TODO: Iterar sobre cada network y crear SocialLink si existe URL
  socialNetworks.forEach(network => {
    const url = profile.socialLinks?.[network];
    if (url) {
      const networkConfig = NETWORK_CONFIG[network];
      // TODO: Extraer username de la URL
      const username = url.replace(networkConfig?.prefix || '', '').split('/').pop() || '';
      links.push({
        id: network,
        networkId: network,
        username,
        fullUrl: url,
      });
    }
  });

  return links;
};
