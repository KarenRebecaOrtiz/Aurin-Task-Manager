'use client';

import type React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Save } from 'lucide-react';
import { Link } from '@/components/animate-ui/icons';
import { useSocialLinks } from './use-social-links';
import { NetworkSelector } from './NetworkSelector';
import { SmartInput } from './SmartInput';
import { AddedLinkItem } from './AddedLinkItem';
import styles from './SocialLinksManager.module.scss';

interface SocialLinksManagerProps {
  initialLinks?: Array<{
    networkId: string;
    username: string;
  }>;
  onChange?: (links: Array<{ networkId: string; username: string }>) => void;
  disabled?: boolean;
}

export function SocialLinksManager({ initialLinks = [], onChange, disabled = false }: SocialLinksManagerProps) {
  const {
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
  } = useSocialLinks(initialLinks, onChange);

  const currentConfig = getNetworkConfig(selectedNetwork);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLink();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <div className={styles.iconWrapper}>
            <Link size={20} animateOnHover loop />
          </div>
          Redes Sociales
        </h2>
        <p className={styles.description}>
          Agrega tus perfiles de redes sociales para que otros puedan conectarse contigo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputRow}>
          <div className={styles.selectorWrapper}>
            <NetworkSelector
              value={selectedNetwork}
              onChange={(value) => {
                setSelectedNetwork(value);
                setUsername('');
              }}
              disabled={disabled}
            />
          </div>
          <div className={styles.inputWrapper}>
            <SmartInput
              networkConfig={currentConfig}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onPaste={handlePaste}
              disabled={disabled}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!username.trim() || disabled}
          className={styles.submitButton}
        >
          {isEditing ? (
            <>
              <Save size={16} />
              <span>Guardar Cambios</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Agregar Link</span>
            </>
          )}
        </button>
      </form>

      {links.length > 0 && (
        <>
          <div className={styles.divider} />
          <p className={styles.listHeader}>
            Links Agregados ({links.length})
          </p>
          <div className={styles.list}>
            <AnimatePresence mode="popLayout">
              {links.map((link) => (
                <AddedLinkItem
                  key={link.id}
                  link={link}
                  onEdit={editLink}
                  onRemove={removeLink}
                  disabled={disabled}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {links.length === 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Link size={20} loop className={styles.emptyIcon} />
            </div>
            <p className={styles.emptyText}>
              No hay links agregados. Selecciona una plataforma y agrega tu perfil.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
