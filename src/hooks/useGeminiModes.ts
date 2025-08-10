// src/hooks/useGeminiModes.ts
import { useCallback, useMemo } from 'react';
import useGeminiStore from '@/stores/geminiStore';

export type GeminiMode = 'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list';

export interface ModeConfig {
  id: GeminiMode;
  label: string;
  description: string;
  icon: string;
  prompt: string;
}

export const useGeminiModes = () => {
  const { currentMode, setMode } = useGeminiStore();

  const modes: ModeConfig[] = useMemo(() => [
    {
      id: 'rewrite',
      label: 'Reformular',
      description: 'Reescribir el mensaje manteniendo el significado',
      icon: 'rotate-ccw',
      prompt: 'Reformula el siguiente mensaje manteniendo su significado original pero con un estilo diferente:'
    },
    {
      id: 'friendly',
      label: 'Amigable',
      description: 'Hacer el mensaje más casual y cercano',
      icon: 'smile-plus',
      prompt: 'Convierte el siguiente mensaje a un tono más amigable y casual:'
    },
    {
      id: 'professional',
      label: 'Profesional',
      description: 'Hacer el mensaje más formal y corporativo',
      icon: 'briefcase',
      prompt: 'Convierte el siguiente mensaje a un tono más profesional y formal:'
    },
    {
      id: 'concise',
      label: 'Conciso',
      description: 'Acortar el mensaje manteniendo la información clave',
      icon: 'scissors',
      prompt: 'Haz el siguiente mensaje más conciso manteniendo toda la información importante:'
    },
    {
      id: 'summarize',
      label: 'Resumir',
      description: 'Crear un resumen del mensaje',
      icon: 'file-text',
      prompt: 'Crea un resumen conciso del siguiente mensaje:'
    },
    {
      id: 'keypoints',
      label: 'Puntos Clave',
      description: 'Extraer los puntos principales del mensaje',
      icon: 'list',
      prompt: 'Extrae los puntos clave del siguiente mensaje:'
    },
    {
      id: 'list',
      label: 'Lista',
      description: 'Convertir el mensaje en una lista organizada',
      icon: 'list-ordered',
      prompt: 'Convierte el siguiente mensaje en una lista organizada:'
    }
  ], []);

  const selectMode = useCallback((mode: GeminiMode) => {
    setMode(mode);
  }, [setMode]);

  const clearMode = useCallback(() => {
    setMode(null);
  }, [setMode]);

  const getCurrentModeConfig = useCallback(() => {
    if (!currentMode) return null;
    return modes.find(mode => mode.id === currentMode) || null;
  }, [currentMode, modes]);

  const getModePrompt = useCallback((mode: GeminiMode) => {
    const modeConfig = modes.find(m => m.id === mode);
    return modeConfig?.prompt || '';
  }, [modes]);

  return {
    modes,
    currentMode,
    selectMode,
    clearMode,
    getCurrentModeConfig,
    getModePrompt,
  };
};
