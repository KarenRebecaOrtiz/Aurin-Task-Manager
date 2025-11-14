/**
 * InputChat Module - Drag Overlay Molecule
 *
 * Overlay shown when dragging files over input area
 * @module chat/components/molecules/DragOverlay
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export interface DragOverlayProps {
  isVisible: boolean;
}

/**
 * DragOverlay - Visual feedback for drag-and-drop
 *
 * Features:
 * - Animated entry/exit
 * - Upload icon
 * - Instructional text
 */
export const DragOverlay: React.FC<DragOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-blue-50/95 border-2 border-dashed border-blue-400 rounded-lg backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <div className="p-4 bg-blue-100 rounded-full">
          <Image
            src="/upload-cloud.svg"
            alt="Upload"
            width={48}
            height={48}
            className="text-blue-600"
          />
        </div>
      </motion.div>

      <p className="mt-4 text-lg font-medium text-blue-900">
        Suelta el archivo aquí
      </p>
      <p className="mt-1 text-sm text-blue-700">
        Imágenes, PDFs y documentos permitidos
      </p>
    </motion.div>
  );
};

DragOverlay.displayName = 'DragOverlay';
