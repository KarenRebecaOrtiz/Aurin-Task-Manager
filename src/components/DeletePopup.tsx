'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DeletePopup.module.scss';

interface DeletePopupProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const DeletePopup: React.FC<DeletePopupProps> = ({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const deletePopupRef = useRef<HTMLDivElement>(null);

  // Block scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset confirm input when popup opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirm('');
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        deletePopupRef.current &&
        !deletePopupRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onCancel]);

  const handleConfirm = () => {
    if (deleteConfirm.toLowerCase() === 'eliminar') {
      onConfirm();
    }
  };

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      y: 20
    }
  };

  const buttonVariants = {
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  };

  const inputVariants = {
    focus: { scale: 1.01 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.deletePopupOverlay}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className={styles.deletePopup} 
            ref={deletePopupRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className={styles.deletePopupContent}>
              <motion.div 
                className={styles.deletePopupText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <h2 className={styles.deletePopupTitle}>{title}</h2>
                <p className={styles.deletePopupDescription}>
                  {description} <strong>Esta acción no se puede deshacer.</strong>
                </p>
              </motion.div>
              
              <motion.input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Escribe 'Eliminar' para confirmar"
                className={styles.deleteConfirmInput}
                autoFocus
                variants={inputVariants}
                whileFocus="focus"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    switch (e.key.toLowerCase()) {
                      case 'a':
                        e.preventDefault();
                        e.currentTarget.select();
                        break;
                      case 'c':
                        e.preventDefault();
                        const selection = window.getSelection();
                        if (selection && selection.toString().length > 0) {
                          navigator.clipboard.writeText(selection.toString()).catch(() => {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = selection.toString();
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                          });
                        }
                        break;
                      case 'v':
                        e.preventDefault();
                        navigator.clipboard.readText().then(text => {
                          const target = e.currentTarget;
                          const start = target.selectionStart;
                          const end = target.selectionEnd;
                          const newValue = deleteConfirm.substring(0, start) + text + deleteConfirm.substring(end);
                          setDeleteConfirm(newValue);
                          // Set cursor position after paste
                          setTimeout(() => {
                            target.setSelectionRange(start + text.length, start + text.length);
                          }, 0);
                        }).catch(() => {
                          // Fallback for older browsers or when clipboard access is denied
                          document.execCommand('paste');
                        });
                        break;
                      case 'x':
                        e.preventDefault();
                        const cutSelection = window.getSelection();
                        if (cutSelection && cutSelection.toString().length > 0) {
                          navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                            const target = e.currentTarget;
                            const start = target.selectionStart;
                            const end = target.selectionEnd;
                            const newValue = deleteConfirm.substring(0, start) + deleteConfirm.substring(end);
                            setDeleteConfirm(newValue);
                          }).catch(() => {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = cutSelection.toString();
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            const target = e.currentTarget;
                            const start = target.selectionStart;
                            const end = target.selectionEnd;
                            const newValue = deleteConfirm.substring(0, start) + deleteConfirm.substring(end);
                            setDeleteConfirm(newValue);
                          });
                        }
                        break;
                    }
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  
                  const selection = window.getSelection();
                  const hasSelection = selection && selection.toString().length > 0;
                  
                  const menu = document.createElement('div');
                  menu.className = 'context-menu';
                  menu.style.cssText = `
                    position: fixed;
                    top: ${e.clientY}px;
                    left: ${e.clientX}px;
                    background: white;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 1000;
                    font-family: 'Inter Tight', sans-serif;
                    font-size: 14px;
                    min-width: 150px;
                  `;

                  const menuItems = [
                    { label: 'Deshacer', action: () => document.execCommand('undo'), shortcut: 'Ctrl+Z' },
                    { label: 'Rehacer', action: () => document.execCommand('redo'), shortcut: 'Ctrl+Y' },
                    { type: 'separator' },
                    { 
                      label: 'Cortar', 
                      action: async () => {
                        if (hasSelection) {
                          try {
                            await navigator.clipboard.writeText(selection.toString());
                            document.execCommand('delete');
                          } catch {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = selection.toString();
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            document.execCommand('delete');
                          }
                        }
                      }, 
                      shortcut: 'Ctrl+X', 
                      disabled: !hasSelection 
                    },
                    { 
                      label: 'Copiar', 
                      action: async () => {
                        if (hasSelection) {
                          try {
                            await navigator.clipboard.writeText(selection.toString());
                          } catch {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = selection.toString();
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                          }
                        }
                      }, 
                      shortcut: 'Ctrl+C', 
                      disabled: !hasSelection 
                    },
                    { 
                      label: 'Pegar', 
                      action: async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          document.execCommand('insertText', false, text);
                        } catch {
                          // Fallback for older browsers
                          document.execCommand('paste');
                        }
                      }, 
                      shortcut: 'Ctrl+V'
                    },
                    { type: 'separator' },
                    { 
                      label: 'Seleccionar Todo', 
                      action: () => {
                        const target = e.currentTarget;
                        target.select();
                      }, 
                      shortcut: 'Ctrl+A'
                    },
                    { 
                      label: 'Eliminar', 
                      action: () => {
                        if (hasSelection) {
                          document.execCommand('delete');
                        }
                      }, 
                      shortcut: 'Delete', 
                      disabled: !hasSelection 
                    }
                  ];

                  menuItems.forEach((item) => {
                    if (item.type === 'separator') {
                      const separator = document.createElement('hr');
                      separator.style.cssText = 'margin: 4px 0; border: none; border-top: 1px solid #eee;';
                      menu.appendChild(separator);
                      return;
                    }

                    const menuItem = document.createElement('div');
                    menuItem.style.cssText = `
                      padding: 8px 12px;
                      cursor: pointer;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      ${item.disabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    `;
                    menuItem.innerHTML = `
                      <span>${item.label}</span>
                      <span style="color: #666; font-size: 12px;">${item.shortcut}</span>
                    `;
                    
                    if (!item.disabled) {
                      menuItem.addEventListener('click', () => {
                        item.action();
                        document.body.removeChild(menu);
                      });
                      
                      menuItem.addEventListener('mouseenter', () => {
                        menuItem.style.backgroundColor = '#f5f5f5';
                      });
                      menuItem.addEventListener('mouseleave', () => {
                        menuItem.style.backgroundColor = 'transparent';
                      });
                    }
                    
                    menu.appendChild(menuItem);
                  });

                  document.body.appendChild(menu);

                  // Close menu when clicking outside
                  const closeMenu = () => {
                    if (document.body.contains(menu)) {
                      document.body.removeChild(menu);
                    }
                    document.removeEventListener('click', closeMenu);
                  };
                  
                  setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                  }, 0);
                }}
              />
              
              <motion.div 
                className={styles.deletePopupActions}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <motion.button
                  className={styles.deleteConfirmButton}
                  onClick={handleConfirm}
                  disabled={deleteConfirm.toLowerCase() !== 'eliminar' || isDeleting}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                </motion.button>
                <motion.button
                  className={styles.deleteCancelButton}
                  onClick={onCancel}
                  disabled={isDeleting}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Cancelar
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeletePopup;