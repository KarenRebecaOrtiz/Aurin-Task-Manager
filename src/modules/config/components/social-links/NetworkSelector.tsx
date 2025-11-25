'use client';

import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NETWORK_OPTIONS } from './network-config';
import { SocialIcon } from './SocialIcon';
import styles from './NetworkSelector.module.scss';

interface NetworkSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function NetworkSelector({ value, onChange, disabled }: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedNetwork = NETWORK_OPTIONS.find((n) => n.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedNetwork && (
          <>
            <SocialIcon networkId={selectedNetwork.id} size={18} />
            <span className={styles.label}>{selectedNetwork.label}</span>
          </>
        )}
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={styles.dropdown}
          >
            <ul className={styles.list} role="listbox">
              {NETWORK_OPTIONS.map((network) => (
                <li key={network.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(network.id);
                      setIsOpen(false);
                    }}
                    className={`${styles.option} ${value === network.id ? styles.selected : ''}`}
                    role="option"
                    aria-selected={value === network.id}
                  >
                    <SocialIcon networkId={network.id} size={16} />
                    <span className={styles.optionLabel}>{network.label}</span>
                    {value === network.id && <Check size={14} className={styles.checkIcon} />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
