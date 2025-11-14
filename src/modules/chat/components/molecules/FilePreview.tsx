/**
 * InputChat Module - File Preview Molecule
 *
 * Preview for attached files/images before sending
 * @module chat/components/molecules/FilePreview
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilePreviewProps {
  file: File | null;
  previewUrl: string | null;
  onRemove: () => void;
  uploadProgress?: number;
  isUploading?: boolean;
}

/**
 * FilePreview - Shows preview of attached file
 *
 * Features:
 * - Image preview with thumbnail
 * - File info for non-images
 * - Upload progress bar
 * - Remove button
 * - Animated entry/exit
 */
export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  previewUrl,
  onRemove,
  uploadProgress = 0,
  isUploading = false,
}) => {
  if (!file && !previewUrl) return null;

  const isImage = file?.type.startsWith('image/') || previewUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0, scale: 0.9 }}
        animate={{ height: 'auto', opacity: 1, scale: 1 }}
        exit={{ height: 0, opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="relative m-3 p-3 flex items-center gap-3 bg-gray-100 rounded-lg border border-gray-200"
      >
        {/* Preview thumbnail or icon */}
        {isImage && previewUrl ? (
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-gray-200">
            <Image
              src="/file.svg"
              alt="File"
              width={24}
              height={24}
              draggable={false}
            />
          </div>
        )}

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file?.name || 'Archivo adjunto'}
          </p>
          {file && (
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="mt-2">
              <motion.div
                className="h-1 bg-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              <p className="text-xs text-gray-600 mt-1">
                {uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : 'Procesando...'}
              </p>
            </div>
          )}
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          title="Eliminar archivo"
          aria-label="Eliminar archivo"
        >
          <Image
            src="/x.svg"
            alt="Eliminar"
            width={14}
            height={14}
            draggable={false}
            style={{ filter: 'invert(100%)' }}
          />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

FilePreview.displayName = 'FilePreview';
