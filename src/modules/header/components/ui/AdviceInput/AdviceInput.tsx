'use client';

// Declare module to extend CSSProperties with custom properties
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, setDoc, collection, Timestamp, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './AdviceInput.module.scss';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';

interface AdviceInputProps {
  isAdmin: boolean;
}

const AdviceInput: React.FC<AdviceInputProps> = ({ isAdmin }) => {
  const { user } = useUser();
  const [inputText, setInputText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [activeAdviceId, setActiveAdviceId] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRootRef = useRef<HTMLElement | null>(null);

  const intervals = [
    { label: '12 horas', ms: 12 * 60 * 60 * 1000 },
    { label: '1 día', ms: 24 * 60 * 60 * 1000 },
    { label: '3 días', ms: 3 * 24 * 60 * 60 * 1000 },
    { label: '1 semana', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: '2 semanas', ms: 14 * 24 * 60 * 60 * 1000 },
    { label: '1 mes', ms: 30 * 24 * 60 * 60 * 1000 },
  ];

  useEffect(() => {
    portalRootRef.current = document.body;
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const checkExistingAdvice = async () => {
      try {
        const q = query(
          collection(db, 'advices'),
          where('creatorId', '==', user.id),
          where('expiry', '>', Timestamp.now())
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const advice = querySnapshot.docs[0].data() as { message: string; expiry: Timestamp };
          setActiveAdviceId(querySnapshot.docs[0].id);
          setInputText(advice.message);
          setExpiryTime(advice.expiry.toMillis());
        }
      } catch (error) {
        console.error('Error checking existing advice:', error);
      }
    };

    checkExistingAdvice();
  }, [user?.id]);

  // Eliminamos el useEffect de expiración automática para evitar conflictos
  // La expiración será manejada exclusivamente por el componente Marquee

  // EFFECTS – DROPDOWN POSITION (replicando lógica del Header)
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left + (rect.width / 2), // Centrado horizontalmente
      });
    }
  }, [isDropdownOpen]);

  // EFFECTS – DROPDOWN ANIMATION (replicando lógica del Header)
  useEffect(() => {
    if (isDropdownOpen) {
      setIsDropdownVisible(true);
      if (dropdownRef.current) {
        gsap.fromTo(
          dropdownRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
        );
      }
    } else if (isDropdownVisible && dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setIsDropdownVisible(false),
      });
    }
  }, [isDropdownOpen, isDropdownVisible]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    // Siempre abrir el dropdown al hacer hover sobre el botón
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    // Solo cerrar si no estamos haciendo hover sobre el dropdown
    setTimeout(() => {
      if (!buttonRef.current?.matches(':hover')) {
        setIsDropdownOpen(false);
      }
    }, 100);
  };

  const handlePostAdvice = async (intervalMs: number) => {
    console.log('handlePostAdvice triggered with interval:', intervalMs);
    
    setErrorMessage('');
    
    if (!user?.id || !user?.firstName || !inputText.trim()) {
      setErrorMessage('El anuncio no puede estar vacío.');
      return;
    }

    try {
      const q = query(
        collection(db, 'advices'),
        where('creatorId', '==', user.id),
        where('expiry', '>', Timestamp.now())
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setErrorMessage('Ya tienes un anuncio activo. Elimina el actual antes de crear uno nuevo.');
        setIsDropdownOpen(false);
        return;
      }

      const adviceId = doc(collection(db, 'advices')).id;
      const expiry = Date.now() + intervalMs;

      await setDoc(doc(db, 'advices', adviceId), {
        message: inputText.trim(),
        creatorId: user.id,
        creatorFirstName: user.firstName,
        expiry: Timestamp.fromMillis(expiry),
        createdAt: Timestamp.now(),
      });
      console.log('Advice posted successfully, ID:', adviceId);
      setActiveAdviceId(adviceId);
      setExpiryTime(expiry);
      setIsDropdownOpen(false);
      setErrorMessage('');
    } catch (error: unknown) {
      console.error('Error posting advice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verifica el índice en Firestore.';
      setErrorMessage(`Error al publicar el anuncio: ${errorMessage}`);
    }
  };

  const handleDeleteAdvice = async () => {
    if (!activeAdviceId || !user?.id) {
      setErrorMessage('No hay anuncio activo o usuario no autenticado.');
      return;
    }

    if (isDeleting) {
      console.log('Delete operation already in progress');
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      // Usar transacción para operación atómica
      await runTransaction(db, async (transaction) => {
        const adviceRef = doc(db, 'advices', activeAdviceId);
        const adviceDoc = await transaction.get(adviceRef);
        
        if (!adviceDoc.exists()) {
          throw new Error('El anuncio no existe o ya fue eliminado.');
        }

        const adviceData = adviceDoc.data();
        if (adviceData.creatorId !== user.id) {
          throw new Error('Solo el creador puede eliminar este anuncio.');
        }

        transaction.delete(adviceRef);
      });

      console.log(`Advice ${activeAdviceId} deleted successfully by user ${user.id}`);
      // Solo limpiar estado después de eliminación exitosa
      setInputText('');
      setActiveAdviceId(null);
      setExpiryTime(null);
      setErrorMessage('');
    } catch (error: unknown) {
      console.error('Error deleting advice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setErrorMessage(`Error al eliminar el anuncio: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) return null;

  const Countdown = ({ seconds }: { seconds: number }) => {
    const hh = Math.floor(seconds / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    const ss = seconds % 60;
    return (
      <NumberFlowGroup>
        <div
          style={{ 
            fontVariantNumeric: 'tabular-nums', 
            '--number-flow-char-height': '0.85em' as const,
            display: 'flex',
            alignItems: 'baseline',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'Urbanist, monospace'
          }}
        >
          <NumberFlow 
            trend={-1} 
            value={hh} 
            format={{ minimumIntegerDigits: 2 }} 
            willChange={true}
          />
          <NumberFlow
            prefix=":"
            trend={-1}
            value={mm}
            digits={{ 1: { max: 5 } }}
            format={{ minimumIntegerDigits: 2 }}
            willChange={true}
          />
          <NumberFlow
            prefix=":"
            trend={-1}
            value={ss}
            digits={{ 1: { max: 5 } }}
            format={{ minimumIntegerDigits: 2 }}
            willChange={true}
          />
        </div>
      </NumberFlowGroup>
    );
  };

  const DropdownPortal = () =>
    portalRootRef.current && isDropdownVisible && !activeAdviceId
      ? createPortal(
          <div
            ref={dropdownRef}
            className={styles.dropdown}
            onMouseEnter={() => {
              setIsDropdownOpen(true);
            }}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!buttonRef.current?.matches(':hover')) {
                  setIsDropdownOpen(false);
                }
              }, 100);
            }}
            style={{
              position: 'absolute',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              transform: 'translateX(-50%)', // Centrar horizontalmente
            }}
          >
            {intervals.map((interval) => (
              <button
                key={interval.label}
                className={styles.dropdownItem}
                onClick={() => handlePostAdvice(interval.ms)}
              >
                {interval.label}
              </button>
            ))}
          </div>,
          portalRootRef.current
        )
      : null;

  return (
    <div className={styles.inputWrapper}>
      <input
        type="text"
        name="text"
        className={styles.input}
        placeholder="Escribe un anuncio..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={!!activeAdviceId || isDeleting}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
              case 'a':
                e.preventDefault();
                e.currentTarget.select();
                break;
              case 'c':
                e.preventDefault();
                const targetC = e.currentTarget as HTMLInputElement;
                if (targetC.selectionStart !== targetC.selectionEnd) {
                  const selectedText = inputText.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
                  navigator.clipboard.writeText(selectedText).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = selectedText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                  });
                }
                break;
              case 'v':
                e.preventDefault();
                const targetV = e.currentTarget as HTMLInputElement;
                navigator.clipboard.readText().then(text => {
                  if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                    const start = targetV.selectionStart;
                    const end = targetV.selectionEnd;
                    const newValue = inputText.substring(0, start) + text + inputText.substring(end);
                    setInputText(newValue);
                    // Set cursor position after paste
                    setTimeout(() => {
                      targetV.setSelectionRange(start + text.length, start + text.length);
                    }, 0);
                  } else {
                    setInputText(inputText + text);
                  }
                }).catch(() => {
                  // Fallback for older browsers or when clipboard access is denied
                  document.execCommand('paste');
                });
                break;
              case 'x':
                e.preventDefault();
                const targetX = e.currentTarget as HTMLInputElement;
                if (targetX.selectionStart !== targetX.selectionEnd) {
                  const selectedText = inputText.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
                  navigator.clipboard.writeText(selectedText).then(() => {
                    if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                      const start = targetX.selectionStart;
                      const end = targetX.selectionEnd;
                      const newValue = inputText.substring(0, start) + inputText.substring(end);
                      setInputText(newValue);
                    } else {
                      setInputText('');
                    }
                  }).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = selectedText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                      const start = targetX.selectionStart;
                      const end = targetX.selectionEnd;
                      const newValue = inputText.substring(0, start) + inputText.substring(end);
                      setInputText(newValue);
                    } else {
                      setInputText('');
                    }
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
      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      )}
      {activeAdviceId && expiryTime ? (
        <button
          className={styles.countdownBtn}
          onClick={handleDeleteAdvice}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={isDeleting}
          title={isDeleting ? 'Eliminando...' : 'Hacer clic para eliminar anuncio'}
        >
          {isDeleting ? (
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Eliminando...</div>
          ) : (
            <Countdown seconds={Math.max(0, Math.floor((expiryTime - Date.now()) / 1000))} />
          )}
        </button>
      ) : (
        <button
          ref={buttonRef}
          className={styles.subscribeBtn}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={isDeleting}
        >
          <Image src="/rocket.svg" alt="Agregar" width={20} height={20} />
        </button>
      )}
      <DropdownPortal />
    </div>
  );
};

export default AdviceInput;