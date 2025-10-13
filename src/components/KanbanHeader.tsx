'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '@/modules/tasks/components/tables/KanbanBoard/TasksKanban.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface KanbanHeaderProps {
  onNewTaskOpen: () => void;
  onViewChange: (view: 'table' | 'kanban') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  clientFilter: string;
  setClientFilter: (clientId: string) => void;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  clients: Client[];
  users: User[];
  isAdmin: boolean;
  userId: string;
  isLoadingClients?: boolean;
  isLoadingUsers?: boolean;
}

const KanbanHeader: React.FC<KanbanHeaderProps> = ({
  onNewTaskOpen,
  onViewChange,
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter,
  clientFilter,
  setClientFilter,
  userFilter,
  setUserFilter,
  clients,
  users,
  isAdmin,
  userId,
  isLoadingClients = false,
  isLoadingUsers = false,
}) => {
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const animateClick = useCallback((element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      opacity: 0.8,
      duration: 0.15,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
    });
  }, []);

  const handlePrioritySelect = useCallback((priority: string, e: React.MouseEvent<HTMLDivElement>) => {
    animateClick(e.currentTarget);

    const filterIcon = e.currentTarget.querySelector('img');
    if (filterIcon) {
      gsap.to(filterIcon, {
        rotation: 360,
        scale: 1.2,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      });
    }

    setPriorityFilter(priority);
    setIsPriorityDropdownOpen(false);
  }, [animateClick, setPriorityFilter]);

  const handleClientSelect = useCallback((clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
    animateClick(e.currentTarget);

    const filterIcon = e.currentTarget.querySelector('img');
    if (filterIcon) {
      gsap.to(filterIcon, {
        rotation: 360,
        scale: 1.2,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      });
    }

    setClientFilter(clientId);
    setIsClientDropdownOpen(false);
  }, [animateClick, setClientFilter]);

  const handleUserFilter = useCallback((id: string) => {
    const userDropdownTrigger = userDropdownRef.current?.querySelector(`.${styles.dropdownTrigger}`);
    if (userDropdownTrigger) {
      const filterIcon = userDropdownTrigger.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1
        });
      }
    }

    setUserFilter(id);
    setIsUserDropdownOpen(false);
  }, [setUserFilter]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
            const selectedText = targetC.value.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).catch(() => {
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
              const newValue = targetV.value.substring(0, start) + text + targetV.value.substring(end);
              setSearchQuery(newValue);
              setTimeout(() => {
                targetV.setSelectionRange(start + text.length, start + text.length);
              }, 0);
            } else {
              setSearchQuery(targetV.value + text);
            }
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = targetX.value.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = targetX.value.substring(0, start) + targetX.value.substring(end);
                setSearchQuery(newValue);
              } else {
                setSearchQuery('');
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = targetX.value.substring(0, start) + targetX.value.substring(end);
                setSearchQuery(newValue);
              } else {
                setSearchQuery('');
              }
            });
          }
          break;
      }
    }
  }, [setSearchQuery]);

  return (
    <div className={styles.header} style={{ margin: '20px 0px' }}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Buscar Tareas"
          value={searchQuery}
          onChange={(e) => {
            const newValue = e.target.value;
            setSearchQuery(newValue);

            const searchInput = e.currentTarget;
            gsap.to(searchInput, {
              scale: 1.02,
              duration: 0.2,
              ease: 'power2.out',
              yoyo: true,
              repeat: 1,
            });

            console.log('[KanbanHeader] Search query updated:', newValue);
          }}
          className={styles.searchInput}
          aria-label="Buscar tareas"
          onKeyDown={handleInputKeyDown}
        />
      </div>

      <div className={styles.filtersWrapper}>
        <div className={styles.buttonWithTooltip}>
          <button
            className={styles.viewButton}
            onClick={(e) => {
              animateClick(e.currentTarget);
              onViewChange('table');
            }}
          >
            <Image
              src="/table.svg"
              alt="table"
              draggable="false"
              width={20}
              height={20}
              style={{
                marginLeft: '5px',
                transition: 'transform 0.3s ease, filter 0.3s ease',
                filter:
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.81)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
              }}
            />
          </button>
          <span className={styles.tooltip}>Vista Tabla</span>
        </div>

        <div className={styles.buttonWithTooltip}>
          <div className={styles.filter}>
            <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
              <div
                className={styles.dropdownTrigger}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  setIsPriorityDropdownOpen((prev) => {
                    if (!prev) {
                      setIsClientDropdownOpen(false);
                      setIsUserDropdownOpen(false);
                    }
                    return !prev;
                  });
                }}
              >
                <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                <span>{priorityFilter || 'Prioridad'}</span>
              </div>
              {isPriorityDropdownOpen && (
                <AnimatePresence>
                  <motion.div 
                    className={styles.dropdownItems}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {['Alta', 'Media', 'Baja', ''].map((priority, index) => (
                      <motion.div
                        key={priority || 'all'}
                        className={styles.dropdownItem}
                        onClick={(e) => handlePrioritySelect(priority, e)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        {priority || 'Todos'}
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
          <span className={styles.tooltip}>Filtrar por Prioridad</span>
        </div>

        <div className={styles.buttonWithTooltip}>
          <div className={styles.filter}>
            <div className={styles.dropdownContainer} ref={clientDropdownRef}>
              <div
                className={styles.dropdownTrigger}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  setIsClientDropdownOpen((prev) => {
                    if (!prev) {
                      setIsPriorityDropdownOpen(false);
                      setIsUserDropdownOpen(false);
                    }
                    return !prev;
                  });
                }}
              >
                <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                <span>
                  {isLoadingClients 
                    ? 'Cargando...' 
                    : clients.find((c) => c.id === clientFilter)?.name || 'Cuenta'
                  }
                </span>
              </div>
              {isClientDropdownOpen && !isLoadingClients && (
                <AnimatePresence>
                  <motion.div 
                    className={styles.dropdownItems}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {[{ id: '', name: 'Todos' }, ...clients].map((client, index) => (
                      <motion.div
                        key={client.id || 'all'}
                        className={styles.dropdownItem}
                        onClick={(e) => handleClientSelect(client.id, e)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        {client.name}
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
          <span className={styles.tooltip}>Filtrar por Cuenta</span>
        </div>

        {isAdmin && (
          <div className={styles.buttonWithTooltip}>
            <div className={styles.filter}>
              <div className={styles.dropdownContainer} ref={userDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsUserDropdownOpen((prev) => {
                      if (!prev) {
                        setIsPriorityDropdownOpen(false);
                        setIsClientDropdownOpen(false);
                      }
                      return !prev;
                    });
                    console.log('[KanbanHeader] User dropdown toggled');
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
                  <span>
                    {isLoadingUsers 
                      ? 'Cargando...'
                      : userFilter === ''
                        ? 'Todos'
                        : userFilter === 'me'
                        ? 'Mis tareas'
                        : users.find((u) => u.id === userFilter)?.fullName || 'Usuario'
                    }
                  </span>
                </div>
                {isUserDropdownOpen && !isLoadingUsers && (
                  <AnimatePresence>
                    <motion.div 
                      className={styles.dropdownItems}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <motion.div
                        className={styles.dropdownItem}
                        style={{ fontWeight: userFilter === '' ? 700 : 400 }}
                        onClick={() => handleUserFilter('')}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0 * 0.05 }}
                      >
                        Todos
                      </motion.div>
                      <motion.div
                        className={styles.dropdownItem}
                        style={{ fontWeight: userFilter === 'me' ? 700 : 400 }}
                        onClick={() => handleUserFilter('me')}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 1 * 0.05 }}
                      >
                        Mis tareas
                      </motion.div>
                      {users
                        .filter((u) => u.id !== userId)
                        .map((u, index) => (
                          <motion.div
                            key={u.id}
                            className={styles.dropdownItem}
                            style={{ fontWeight: userFilter === u.id ? 700 : 400 }}
                            onClick={() => handleUserFilter(u.id)}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: (index + 2) * 0.05 }}
                          >
                            {u.fullName}
                          </motion.div>
                        ))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
            <span className={styles.tooltip}>Filtrar por Usuario</span>
          </div>
        )}

        <div className={styles.buttonWithTooltip}>
          <button
            className={styles.createButton}
            onClick={(e) => {
              animateClick(e.currentTarget);
              onNewTaskOpen();
            }}
          >
            <Image src="/square-dashed-mouse-pointer.svg" alt="New Task" width={16} height={16} />
            Crear Tarea
          </button>
          <span className={styles.tooltip}>Crear Nueva Tarea</span>
        </div>
      </div>
    </div>
  );
};

export default KanbanHeader; 