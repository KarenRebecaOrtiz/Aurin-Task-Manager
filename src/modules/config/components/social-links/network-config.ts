import { Github, Linkedin, Twitter, Instagram, Facebook, Globe, Music2 } from 'lucide-react';
import type { NetworkConfig } from './types';

export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  github: {
    id: 'github',
    label: 'GitHub',
    prefix: 'github.com/',
    icon: Github,
    placeholder: 'username',
    regex: /^(?:https?:\/\/)?(?:www\.)?github\.com\/(.+?)(?:\/.*)?$/i,
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    prefix: 'linkedin.com/in/',
    icon: Linkedin,
    placeholder: 'johndoe',
    regex: /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/(.+?)(?:\/.*)?$/i,
  },
  twitter: {
    id: 'twitter',
    label: 'X (Twitter)',
    prefix: 'x.com/',
    icon: Twitter,
    placeholder: 'username',
    regex: /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(.+?)(?:\/.*)?$/i,
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    prefix: 'instagram.com/',
    icon: Instagram,
    placeholder: 'username',
    regex: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(.+?)(?:\/.*)?$/i,
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    prefix: 'facebook.com/',
    icon: Facebook,
    placeholder: 'username',
    regex: /^(?:https?:\/\/)?(?:www\.)?facebook\.com\/(.+?)(?:\/.*)?$/i,
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    prefix: 'tiktok.com/@',
    icon: Music2,
    placeholder: 'username',
    regex: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?(.+?)(?:\/.*)?$/i,
  },
  website: {
    id: 'website',
    label: 'Website',
    prefix: 'https://',
    icon: Globe,
    placeholder: 'yoursite.com',
    regex: /^(?:https?:\/\/)?(.+)$/i,
  },
};

export const NETWORK_OPTIONS = Object.values(NETWORK_CONFIG);
