/**
 * Keyboard Utilities
 * Shared utility functions for keyboard event handling in input fields
 */

/**
 * Handles copy (Cmd/Ctrl+C) operation for text inputs
 */
export const handleCopyText = async (
  selectedText: string,
  fallbackElement?: HTMLElement
): Promise<void> => {
  try {
    await navigator.clipboard.writeText(selectedText);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = selectedText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Handles paste (Cmd/Ctrl+V) operation for text inputs
 */
export const handlePasteText = async (fallback?: () => void): Promise<string> => {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (error) {
    // Fallback for older browsers
    if (fallback) {
      fallback();
    }
    return '';
  }
};

/**
 * Handles cut (Cmd/Ctrl+X) operation for text inputs
 */
export const handleCutText = async (selectedText: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(selectedText);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = selectedText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Handles keyboard shortcuts for search input fields
 * Supports: Cmd/Ctrl+A, Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+X
 */
export const handleSearchKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  currentValue: string,
  onValueChange: (newValue: string) => void
): void => {
  if (e.ctrlKey || e.metaKey) {
    const target = e.currentTarget as HTMLInputElement;

    switch (e.key.toLowerCase()) {
      case 'a':
        // Select all text
        e.preventDefault();
        target.select();
        break;

      case 'c':
        // Copy selected text
        e.preventDefault();
        if (target.selectionStart !== target.selectionEnd) {
          const selectedText = currentValue.substring(
            target.selectionStart || 0,
            target.selectionEnd || 0
          );
          handleCopyText(selectedText);
        }
        break;

      case 'v':
        // Paste text
        e.preventDefault();
        handlePasteText(() => {
          document.execCommand('paste');
        }).then(text => {
          if (text && typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
            onValueChange(newValue);
            setTimeout(() => {
              target.setSelectionRange(start + text.length, start + text.length);
            }, 0);
          } else if (text) {
            onValueChange(currentValue + text);
          }
        });
        break;

      case 'x':
        // Cut selected text
        e.preventDefault();
        if (target.selectionStart !== target.selectionEnd) {
          const selectedText = currentValue.substring(
            target.selectionStart || 0,
            target.selectionEnd || 0
          );
          handleCutText(selectedText).then(() => {
            if (typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const newValue = currentValue.substring(0, start) + currentValue.substring(end);
              onValueChange(newValue);
            } else {
              onValueChange('');
            }
          });
        }
        break;
    }
  }
};

/**
 * Checks if a key event is a modifier key (Cmd/Ctrl)
 */
export const isModifierKey = (e: React.KeyboardEvent | KeyboardEvent): boolean => {
  return e.ctrlKey || e.metaKey;
};

/**
 * Checks if a specific keyboard shortcut is pressed
 */
export const isShortcut = (
  e: React.KeyboardEvent | KeyboardEvent,
  key: string
): boolean => {
  return isModifierKey(e) && e.key.toLowerCase() === key.toLowerCase();
};
