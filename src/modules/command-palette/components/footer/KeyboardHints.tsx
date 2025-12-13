/**
 * KeyboardHints Component
 *
 * Muestra los atajos de teclado disponibles en el footer del Command Palette.
 * @module command-palette/components/footer/KeyboardHints
 */

'use client';

import React from 'react';
import styles from '../../styles/command-palette.module.scss';

export interface KeyboardHintsProps {
  showBackHint?: boolean;
  showAIHint?: boolean;
}

interface HintItem {
  keys: string[];
  label: string;
}

export function KeyboardHints({
  showBackHint = true,
  showAIHint = false,
}: KeyboardHintsProps) {
  const hints: HintItem[] = [
    { keys: ['↑', '↓'], label: 'Navegar' },
    { keys: ['↵'], label: 'Seleccionar' },
  ];

  if (showBackHint) {
    hints.push({ keys: ['⌫'], label: 'Volver' });
  }

  hints.push({ keys: ['Esc'], label: 'Cerrar' });

  if (showAIHint) {
    hints.push({ keys: ['Tab'], label: 'AI' });
  }

  return (
    <div className={styles.footer}>
      <div className={styles.footerHints}>
        {hints.map((hint, index) => (
          <div key={index} className={styles.footerHint}>
            {hint.keys.map((key, keyIndex) => (
              <span key={keyIndex} className={styles.footerKey}>
                {key}
              </span>
            ))}
            <span>{hint.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KeyboardHints;
