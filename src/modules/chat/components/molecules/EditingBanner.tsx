/**
 * InputChat Module - Editing Banner Molecule
 *
 * Banner shown when editing a message
 * @module chat/components/molecules/EditingBanner
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export interface EditingBannerProps {
  onCancel: () => void;
}

/**
 * EditingBanner - Shows editing state
 *
 * Features:
 * - Clear visual indicator of editing mode
 * - Cancel button
 * - Keyboard shortcut hint
 */
export const EditingBanner: React.FC<EditingBannerProps> = ({ onCancel }) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between px-4 py-2 bg-yellow-50 border-b border-yellow-200"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-yellow-900">
          ✏️ Editando mensaje
        </span>
        <span className="text-xs text-yellow-700">
          Presiona Enter para guardar o Esc para cancelar
        </span>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded-md hover:bg-yellow-100 transition-colors"
        aria-label="Cancelar edición"
        title="Cancelar (Esc)"
      >
        <Image
          src="/x.svg"
          alt="Cancelar"
          width={16}
          height={16}
          draggable={false}
        />
      </button>
    </motion.div>
  );
};

EditingBanner.displayName = 'EditingBanner';
