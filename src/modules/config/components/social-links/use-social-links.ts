'use client';

import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { NETWORK_CONFIG } from './network-config';
import type { SocialLink, UseSocialLinksReturn } from './types';

export function useSocialLinks(
  initialLinks: Array<{ networkId: string; username: string }> = [],
  onChange?: (links: Array<{ networkId: string; username: string }>) => void
): UseSocialLinksReturn {
  const [links, setLinks] = useState<SocialLink[]>(() => {
    return initialLinks.map((link) => {
      const config = NETWORK_CONFIG[link.networkId];
      if (!config) return null;

      const fullUrl =
        link.networkId === 'website'
          ? `${config.prefix}${link.username}`
          : `https://${config.prefix}${link.username}`;

      return {
        id: crypto.randomUUID(),
        networkId: link.networkId,
        username: link.username,
        fullUrl,
      };
    }).filter((link): link is SocialLink => link !== null);
  });

  const [selectedNetwork, setSelectedNetwork] = useState<string>('github');
  const [username, setUsername] = useState<string>('');
  const [isEditing, setIsEditing] = useState<string | null>(null);

  useEffect(() => {
    if (onChange) {
      const simplifiedLinks = links.map(link => ({
        networkId: link.networkId,
        username: link.username,
      }));
      onChange(simplifiedLinks);
    }
  }, [links, onChange]);

  const getNetworkConfig = useCallback((networkId: string) => {
    return NETWORK_CONFIG[networkId];
  }, []);

  const addLink = useCallback(() => {
    if (!username.trim()) return false;

    const config = getNetworkConfig(selectedNetwork);
    if (!config) return false;

    const isDuplicate = links.some(
      (link) => link.networkId === selectedNetwork && link.username.toLowerCase() === username.toLowerCase(),
    );
    if (isDuplicate && !isEditing) return false;

    const fullUrl =
      selectedNetwork === 'website' ? `${config.prefix}${username}` : `https://${config.prefix}${username}`;

    const newLink: SocialLink = {
      id: isEditing || crypto.randomUUID(),
      networkId: selectedNetwork,
      username: username.trim(),
      fullUrl,
    };

    if (isEditing) {
      setLinks((prev) => prev.map((link) => (link.id === isEditing ? newLink : link)));
      setIsEditing(null);
    } else {
      setLinks((prev) => [...prev, newLink]);
    }

    setUsername('');
    return true;
  }, [username, selectedNetwork, links, isEditing, getNetworkConfig]);

  const removeLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== id));
  }, []);

  const editLink = useCallback(
    (id: string) => {
      const link = links.find((l) => l.id === id);
      if (link) {
        setSelectedNetwork(link.networkId);
        setUsername(link.username);
        setIsEditing(id);
      }
    },
    [links],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const config = getNetworkConfig(selectedNetwork);

      if (!config) return;

      const match = pastedText.match(config.regex);
      if (match && match[1]) {
        e.preventDefault();
        let cleanUsername = match[1].replace(/\/$/, '');
        if (selectedNetwork === 'tiktok') {
          cleanUsername = cleanUsername.replace(/^@/, '');
        }
        setUsername(cleanUsername);
      }
    },
    [selectedNetwork, getNetworkConfig],
  );

  return {
    links,
    selectedNetwork,
    username,
    setSelectedNetwork,
    setUsername,
    addLink,
    removeLink,
    editLink,
    handlePaste,
    getNetworkConfig,
    isEditing,
  };
}
