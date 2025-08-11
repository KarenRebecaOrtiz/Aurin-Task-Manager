// src/components/ui/GeminiImageAnalyzer.tsx
import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2, Tag, BarChart3 } from 'lucide-react';
import { useGeminiImageAnalysis } from '@/hooks/useGeminiImageAnalysis';
import styles from './GeminiImageAnalyzer.module.scss';

// Helper function for conditional error logging (only in development)
const debugError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(message, ...args);
  }
};

interface GeminiImageAnalyzerProps {
  taskId?: string;
  onAnalysisComplete?: (result: GeminiAnalysisResult) => void;
  className?: string;
  disabled?: boolean;
}

interface GeminiAnalysisResult {
  description: string;
  tags: string[];
  confidence: number;
}

export const GeminiImageAnalyzer: React.FC<GeminiImageAnalyzerProps> = ({
  taskId,
  onAnalysisComplete,
  className = '',
  disabled = false
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzeImage, isAnalyzing, lastResult, clearResult } = useGeminiImageAnalysis();

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Limpiar resultado anterior
      clearResult();
    }
  }, [clearResult]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage || !imagePreview) return;

    try {
      const result = await analyzeImage(imagePreview, customPrompt || undefined, taskId);
      if (result && onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (error) {
      debugError('[GeminiImageAnalyzer] Error analyzing image:', error);
    }
  }, [selectedImage, imagePreview, customPrompt, taskId, analyzeImage, onAnalysisComplete]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setCustomPrompt('');
    setShowPromptInput(false);
    clearResult();
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearResult]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        clearResult();
      }
    }
  }, [clearResult]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePromptToggle = useCallback(() => {
    setShowPromptInput(!showPromptInput);
  }, [showPromptInput]);

  const handleCustomPromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomPrompt(e.target.value);
  }, []);

  const handleClearResult = useCallback(() => {
    clearResult();
  }, [clearResult]);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className={styles.hiddenInput}
      />

      {/* Área de drop/upload */}
      {!selectedImage ? (
        <div
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={openFileDialog}
        >
          <div className={styles.dropZoneContent}>
            <Upload className={styles.uploadIcon} size={32} />
            <p className={styles.dropZoneText}>
              Arrastra una imagen aquí o haz clic para seleccionar
            </p>
            <p className={styles.dropZoneSubtext}>
              Soporta JPG, PNG, GIF, WebP
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.imageContainer}>
          {/* Preview de la imagen */}
          <div className={styles.imagePreview}>
            <Image 
              src={imagePreview} 
              alt="Preview" 
              className={styles.previewImage}
              width={200}
              height={200}
              style={{ objectFit: 'cover' }}
            />
            <button
              type="button"
              className={styles.removeButton}
              onClick={handleRemoveImage}
              disabled={isAnalyzing}
            >
              <X size={16} />
            </button>
          </div>

          {/* Controles */}
          <div className={styles.controls}>
            {/* Prompt personalizado */}
            <div className={styles.promptSection}>
              <button
                type="button"
                className={styles.promptToggle}
                onClick={handlePromptToggle}
                disabled={isAnalyzing}
              >
                <ImageIcon size={16} />
                {showPromptInput ? 'Ocultar prompt' : 'Prompt personalizado'}
              </button>
              
              <AnimatePresence>
                {showPromptInput && (
                  <motion.div
                    className={styles.promptInput}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <textarea
                      placeholder="Describe qué quieres que analice en la imagen..."
                      value={customPrompt}
                      onChange={handleCustomPromptChange}
                      className={styles.promptTextarea}
                      rows={3}
                      disabled={isAnalyzing}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Botón de análisis */}
            <button
              type="button"
              className={styles.analyzeButton}
              onClick={handleAnalyze}
              disabled={isAnalyzing || disabled}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className={styles.loadingIcon} size={16} />
                  Analizando...
                </>
              ) : (
                <>
                  <BarChart3 size={16} />
                  Analizar imagen
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Resultados del análisis */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            className={styles.results}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.resultsHeader}>
              <h4 className={styles.resultsTitle}>Análisis de la imagen</h4>
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClearResult}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.resultContent}>
              {/* Descripción */}
              <div className={styles.resultSection}>
                <h5 className={styles.resultSectionTitle}>
                  <ImageIcon size={16} />
                  Descripción
                </h5>
                <p className={styles.resultText}>
                  {lastResult.description}
                </p>
              </div>

              {/* Etiquetas */}
              {lastResult.tags.length > 0 && (
                <div className={styles.resultSection}>
                  <h5 className={styles.resultSectionTitle}>
                    <Tag size={16} />
                    Etiquetas
                  </h5>
                  <div className={styles.tagsContainer}>
                    {lastResult.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nivel de confianza */}
              <div className={styles.resultSection}>
                <h5 className={styles.resultSectionTitle}>
                  <BarChart3 size={16} />
                  Confianza
                </h5>
                <div className={styles.confidenceBar}>
                  <div 
                    className={styles.confidenceFill}
                    style={{ width: `${lastResult.confidence * 100}%` }}
                  />
                </div>
                <span className={styles.confidenceText}>
                  {Math.round(lastResult.confidence * 100)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
