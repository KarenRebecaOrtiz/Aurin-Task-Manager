/**
 * Editor Persistence Hook
 *
 * Hook for persisting editor content to localStorage
 * Copied from src/components/ui/use-form-persistence.ts for modular architecture
 */

import { useEffect, useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface PersistedData {
  content: string;
  timestamp: number;
}

export function useEditorPersistence(
  editor: Editor | null,
  key: string,
  enabled: boolean = true
) {
  const [restoredData, setRestoredData] = useState<PersistedData | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    if (!enabled || !key) return;

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data: PersistedData = JSON.parse(stored);
        setRestoredData(data);
      }
    } catch (error) {
      console.error('[useEditorPersistence] Error loading persisted data:', error);
    }
  }, [key, enabled]);

  // Save current content
  const watchAndSave = useCallback(() => {
    if (!enabled || !editor || !key) return;

    try {
      const content = editor.getHTML();
      const data: PersistedData = {
        content,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('[useEditorPersistence] Error saving persisted data:', error);
    }
  }, [editor, key, enabled]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    if (!key) return;

    try {
      localStorage.removeItem(key);
      setRestoredData(null);
    } catch (error) {
      console.error('[useEditorPersistence] Error clearing persisted data:', error);
    }
  }, [key]);

  return {
    watchAndSave,
    clearPersistedData,
    restoredData,
  };
}
