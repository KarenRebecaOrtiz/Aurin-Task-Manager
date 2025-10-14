'use client';

import { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, onSnapshot, query } from 'firebase/firestore';
import Image from 'next/image';
import { gsap } from 'gsap';
import { db } from '@/lib/firebase';
import Table from './Table';
import ActionMenu from '@/modules/tasks/components/ui/ActionMenu';
import styles from './ClientsTable.module.scss';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import SkeletonLoader from '@/components/SkeletonLoader'; // Import SkeletonLoader
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { clientsTableStore } from '@/stores/clientsTableStore';
import { Client } from '@/types';
import { useState } from 'react';
import { useDataStore } from '@/stores/dataStore'; // Import useDataStore

// Cache global persistente para ClientsTable
const clientsTableCache = {
  clients: new Map<string, { data: Client[]; timestamp: number }>(),
  listeners: new Map<string, { clients: (() => void) | null }>(),
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Cache utilities
function getCacheKey(type: 'clients', userId: string) {
  return `clientsTableCache_${type}_${userId}`;
}

function saveClientsCache(userId: string, data: Client[]) {
  try {
    const cacheKey = getCacheKey('clients', userId);
    const cacheData = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.error('[ClientsTable] Error saving clients cache:', error);
  }
}

function loadClientsCache(userId: string): Client[] | null {
  try {
    const cacheKey = getCacheKey('clients', userId);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const now = Date.now();
    if (!parsed.data || !parsed.timestamp || (now - parsed.timestamp) > CACHE_DURATION) {
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.error('[ClientsTable] Error loading clients cache:', error);
    return null;
  }
}

// Función para limpiar listeners de ClientsTable
export const cleanupClientsTableListeners = () => {
  clientsTableCache.listeners.forEach((listener) => {
    if (listener.clients) listener.clients();
  });
  clientsTableCache.listeners.clear();
  clientsTableCache.clients.clear();
};

interface ClientsTableProps {
  onCreateOpen: () => void;
  onEditOpen: (client: Client) => void;
  onDeleteOpen: (clientId: string) => void;
  externalClients?: Client[];
  onCacheUpdate?: (clients: Client[]) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = memo(
  ({ onCreateOpen, onEditOpen, onDeleteOpen, externalClients, onCacheUpdate }) => {
    const { user } = useUser();
    const { isAdmin, isLoading } = useAuth();
    
    // Estados optimizados con refs para evitar re-renders
    const clientsRef = useRef<Client[]>([]);
    
    // Estado para visibilidad de columnas
    const [visibleColumns, setVisibleColumns] = useState<string[]>([
      'imageUrl', 'name', 'projectCount', 'action'
    ]);

    // Zustand selectors agrupados
    const {
      clients,
      filteredClients,
      sortKey,
      sortDirection,
      searchQuery,
      actionMenuOpenId,
      isDataLoading,
      setClients,
      setFilteredClients,
      setSortKey,
      setSortDirection,
      setSearchQuery,
      setActionMenuOpenId,
      setIsDataLoading,
    } = useStore(
      clientsTableStore,
      useShallow((state) => ({
        clients: state.clients,
        filteredClients: state.filteredClients,
        sortKey: state.sortKey,
        sortDirection: state.sortDirection,
        searchQuery: state.searchQuery,
        actionMenuOpenId: state.actionMenuOpenId,
        isDataLoading: state.isDataLoading,
        setClients: state.setClients,
        setFilteredClients: state.setFilteredClients,
        setSortKey: state.setSortKey,
        setSortDirection: state.setSortDirection,
        setSearchQuery: state.setSearchQuery,
        setActionMenuOpenId: state.setActionMenuOpenId,
        setIsDataLoading: state.setIsDataLoading,
      }))
    );

    // Obtener tasks desde dataStore para contar proyectos
    const tasks = useDataStore(useShallow(state => state.tasks));

    const userId = useMemo(() => user?.id || '', [user]);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    // Use external data if provided, otherwise use internal state
    const effectiveClients = externalClients || clients;
    const effectiveTasks = tasks;

    // Setup de clients con cache optimizado - siempre cargar internamente
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `clients_${user.id}`;
      
      // Verificar cache persistente primero
      const cached = loadClientsCache(user.id);
      if (cached) {
        clientsRef.current = cached;
        setClients(cached);
        setIsDataLoading(false);
        
        // Pasar datos al cache global
        if (onCacheUpdate) {
          onCacheUpdate(cached);
        }
        return;
      }

      // Verificar si ya existe un listener
      const existingListener = clientsTableCache.listeners.get(cacheKey);
      
      if (existingListener?.clients) {
        if (clientsTableCache.clients.has(cacheKey)) {
          const cachedData = clientsTableCache.clients.get(cacheKey)!.data;
          clientsRef.current = cachedData;
          setClients(cachedData);
          setIsDataLoading(false);
          
          // Pasar datos al cache global
          if (onCacheUpdate) {
            onCacheUpdate(cachedData);
          }
        }
        return;
      }

      setIsDataLoading(true);

      const clientsQuery = query(collection(db, 'clients'));
      const unsubscribeClients = onSnapshot(
        clientsQuery,
        (snapshot) => {
          const clientsData: Client[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              name: doc.data().name || '',
              imageUrl: doc.data().imageUrl || '/empty-image.png',
            projectCount: doc.data().projects?.length || 0,
              projects: doc.data().projects || [],
              createdBy: doc.data().createdBy || '',
            createdAt: doc.data().createdAt || '',
          }));
          
          clientsRef.current = clientsData;
          setClients(clientsData);
          
          // Guardar en cache local
          saveClientsCache(user.id, clientsData);
          
          // Actualizar cache
          clientsTableCache.clients.set(cacheKey, {
            data: clientsData,
            timestamp: Date.now(),
          });
          
          // Pasar datos al cache global
          if (onCacheUpdate) {
            onCacheUpdate(clientsData);
          }
          
          setIsDataLoading(false);
        },
        (error) => {
          setClients([]);
          setIsDataLoading(false);
        }
      );

      // Guardar el listener en el cache global
      clientsTableCache.listeners.set(cacheKey, {
        clients: unsubscribeClients,
      });

      return () => {
        // No limpiar el listener aquí
      };
    }, [user?.id, onCacheUpdate, setClients, setIsDataLoading]);

    const memoizedFilteredClients = useMemo(() => {
      return effectiveClients.filter((client) =>
        client.name && typeof client.name === 'string'
          ? client.name.toLowerCase().includes(searchQuery.toLowerCase())
          : false,
      );
    }, [searchQuery, effectiveClients]);

    useEffect(() => {
      setFilteredClients(memoizedFilteredClients);
    }, [memoizedFilteredClients, setFilteredClients]);

    useEffect(() => {
      const currentActionMenuRef = actionMenuOpenId && actionMenuOpenId;
      if (actionMenuOpenId && currentActionMenuRef) {
        gsap.fromTo(
          currentActionMenuRef,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
      return () => {
        if (currentActionMenuRef) {
          gsap.killTweensOf(currentActionMenuRef);
        }
      };
    }, [actionMenuOpenId]);

    useEffect(() => {
      const handleClickOutside = () => {
        if (
          actionMenuOpenId &&
          actionMenuOpenId
        ) {
          setActionMenuOpenId(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId, setActionMenuOpenId]);

    const handleSort = useCallback(
      (key: string) => {
        setSortKey(key);
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      },
      [sortDirection, setSortKey, setSortDirection],
    );

    // Ordenar clientes
    const sortedClients = useMemo(() => {
      if (!sortKey || sortKey === '') {
        return filteredClients;
      }

      return [...filteredClients].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortKey) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'projectCount':
            // Contar proyectos asignados a este cliente
            const aProjectCount = effectiveTasks?.filter(task => task.clientId === a.id).length || 0;
            const bProjectCount = effectiveTasks?.filter(task => task.clientId === b.id).length || 0;
            aValue = aProjectCount;
            bValue = bProjectCount;
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }, [filteredClients, sortKey, sortDirection, effectiveTasks]);

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

    const baseColumns = useMemo(
      () => [
        {
          key: 'imageUrl',
          label: '',
          width: '15%',
          mobileVisible: false,
        },
        {
          key: 'name',
          label: 'Cuentas',
          width: '45%',
          mobileVisible: true,
          mobileWidth: '50%',
        },
        {
          key: 'projectCount',
          label: 'Proyectos Asignados',
          width: '25%',
          mobileVisible: false,
        },
        {
          key: 'action',
          label: 'Acciones',
          width: '15%',
          mobileVisible: true,
          mobileWidth: '50%',
        },
      ],
      [],
    );

    const columns = useMemo(
      () =>
        baseColumns.map((col) => {
          if (col.key === 'imageUrl') {
            return {
              ...col,
              render: (client: Client) =>
                client.imageUrl ? (
                  <Image
                    src={client.imageUrl}
                    alt={client.name || 'Client Image'}
                    width={38}
                    height={38}
                    className={styles.profileImage}
                    onError={(e) => {
                      e.currentTarget.src = '/empty-image.png';
                    }}
                  />
                ) : null,
            };
          }
          if (col.key === 'action') {
            return {
              ...col,
              render: (client: Client) => {
                if (!isAdmin || isLoading) return null; // Use isAdmin and isLoading from useAuth
                return (
                  <ActionMenu
                    task={{
                      id: client.id,
                      clientId: client.id,
                      project: '',
                      name: client.name,
                      description: '',
                      status: '',
                      priority: '',
                      startDate: null,
                      endDate: null,
                      LeadedBy: [],
                      AssignedTo: [],
                      createdAt: client.createdAt,
                      CreatedBy: client.createdBy,
                    }}
                    userId={userId}
                    onEdit={() => {
                      onEditOpen(client);
                      setActionMenuOpenId(null);
                    }}
                    onDelete={() => {
                      onDeleteOpen(client.id);
                      setActionMenuOpenId(null);
                    }}
                    animateClick={animateClick}
                    actionMenuRef={actionMenuRef}
                    actionButtonRef={() => {
                      // This ref is not directly used in the current ActionMenu component
                      // as it expects a Map of refs.
                    }}
                  />
                );
              },
            };
          }
          return col;
        }),
      [baseColumns, onEditOpen, onDeleteOpen, userId, isAdmin, isLoading, animateClick, setActionMenuOpenId],
    );

    // Función para manejar cambios de visibilidad de columnas
    const handleColumnVisibilityChange = useCallback((columnKey: string, visible: boolean) => {
      setVisibleColumns(prev => {
        if (visible) {
          // Agregar columna si no está presente
          return prev.includes(columnKey) ? prev : [...prev, columnKey];
        } else {
          // Remover columna
          return prev.filter(key => key !== columnKey);
        }
      });
    }, []);

    // Handle loading state - mostrar loader mientras cargan los datos
    if (isLoading || isDataLoading) {
      return (
        <div className={`${styles.container} ${styles.mobileContainer}`}>
          <div className={`${styles.header} ${styles.mobileHeader}`}>
            <div className={`${styles.searchWrapper} ${styles.mobileSearchWrapper}`}>
              <input
                type="text"
                placeholder="Buscar Cuentas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="Buscar cuentas"
                disabled={isLoading || isDataLoading}
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
                          const selectedText = searchQuery.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
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
                            const newValue = searchQuery.substring(0, start) + text + searchQuery.substring(end);
                            setSearchQuery(newValue);
                            setTimeout(() => {
                              targetV.setSelectionRange(start + text.length, start + text.length);
                            }, 0);
                          } else {
                            setSearchQuery(searchQuery + text);
                          }
                        }).catch(() => {
                          document.execCommand('paste');
                        });
                        break;
                      case 'x':
                        e.preventDefault();
                        const targetX = e.currentTarget as HTMLInputElement;
                        if (targetX.selectionStart !== targetX.selectionEnd) {
                          const selectedText = searchQuery.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
                          navigator.clipboard.writeText(selectedText).then(() => {
                            if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                              const start = targetX.selectionStart;
                              const end = targetX.selectionEnd;
                              const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
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
                              const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                              setSearchQuery(newValue);
                            } else {
                              setSearchQuery('');
                            }
                          });
                        }
                        break;
                    }
                  }
                }}
              />
            </div>
            {isAdmin && (
              <div className={`${styles.createButtonWrapper} ${styles.hideOnMobile}`}>
                <button
                  onClick={onCreateOpen}
                  className={styles.createButton}
                  aria-label="Crear nueva cuenta"
                  data-testid="create-client-button"
                  disabled={isLoading || isDataLoading}
                  style={{ opacity: isLoading || isDataLoading ? 0.6 : 1 }}
                >
                  <Image src="/wallet-cards.svg" alt="Crear" width={17} height={17} />
                  Nueva Cuenta
                </button>
              </div>
            )}
          </div>
          
          <SkeletonLoader type="clients" rows={6} />
        </div>
      );
    }

    // ✅ NUEVO: Mostrar estado vacío elegante cuando no hay clientes
    if (effectiveClients.length === 0 && !searchQuery) {
      return (
        <div className={`${styles.container} ${styles.mobileContainer}`}>
          <div className={`${styles.header} ${styles.mobileHeader}`}>
            <div className={`${styles.searchWrapper} ${styles.mobileSearchWrapper}`}>
              <input
                type="text"
                placeholder="Buscar Cuentas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="Buscar cuentas"
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
                          const selectedText = searchQuery.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
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
                            const newValue = searchQuery.substring(0, start) + text + searchQuery.substring(end);
                            setSearchQuery(newValue);
                            setTimeout(() => {
                              targetV.setSelectionRange(start + text.length, start + text.length);
                            }, 0);
                          } else {
                            setSearchQuery(searchQuery + text);
                          }
                        }).catch(() => {
                          document.execCommand('paste');
                        });
                        break;
                      case 'x':
                        e.preventDefault();
                        const targetX = e.currentTarget as HTMLInputElement;
                        if (targetX.selectionStart !== targetX.selectionEnd) {
                          const selectedText = searchQuery.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
                          navigator.clipboard.writeText(selectedText).then(() => {
                            if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                              const start = targetX.selectionStart;
                              const end = targetX.selectionEnd;
                              const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
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
                              const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                              setSearchQuery(newValue);
                            } else {
                              setSearchQuery('');
                            }
                          });
                        }
                        break;
                    }
                  }
                }}
              />
            </div>
            {isAdmin && !isLoading && (
              <div className={`${styles.createButtonWrapper} ${styles.hideOnMobile}`}>
                <button
                  onClick={onCreateOpen}
                  className={styles.createButton}
                  aria-label="Crear nueva cuenta"
                  data-testid="create-client-button"
                >
                  <Image src="/wallet-cards.svg" alt="Crear" width={17} height={17} />
                  Nueva Cuenta
                </button>
              </div>
            )}
          </div>
          
          <SkeletonLoader 
            type="clients" 
            isEmpty={true}
            emptyMessage="¡Comienza agregando tu primer cliente!"
          />
        </div>
      );
    }

    return (
      <div className={`${styles.container} ${styles.mobileContainer}`}>
        <div className={`${styles.header} ${styles.mobileHeader}`}>
          <div className={`${styles.searchWrapper} ${styles.mobileSearchWrapper}`}>
            <input
              type="text"
              placeholder="Buscar Cuentas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar cuentas"
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
                        const selectedText = searchQuery.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
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
                          const newValue = searchQuery.substring(0, start) + text + searchQuery.substring(end);
                          setSearchQuery(newValue);
                          setTimeout(() => {
                            targetV.setSelectionRange(start + text.length, start + text.length);
                          }, 0);
                        } else {
                          setSearchQuery(searchQuery + text);
                        }
                      }).catch(() => {
                        document.execCommand('paste');
                      });
                      break;
                    case 'x':
                      e.preventDefault();
                      const targetX = e.currentTarget as HTMLInputElement;
                      if (targetX.selectionStart !== targetX.selectionEnd) {
                        const selectedText = searchQuery.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
                        navigator.clipboard.writeText(selectedText).then(() => {
                          if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                            const start = targetX.selectionStart;
                            const end = targetX.selectionEnd;
                            const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
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
                            const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                            setSearchQuery(newValue);
                          } else {
                            setSearchQuery('');
                          }
                        });
                      }
                      break;
                  }
                }
              }}
            />
          </div>
          {isAdmin && (
            <div className={`${styles.createButtonWrapper} ${styles.hideOnMobile}`}>
              <button
                onClick={onCreateOpen}
                className={styles.createButton}
                aria-label="Crear nueva cuenta"
                data-testid="create-client-button"
                disabled={isLoading || isDataLoading}
                style={{ opacity: isLoading || isDataLoading ? 0.6 : 1 }}
              >
                <Image src="/wallet-cards.svg" alt="Crear" width={17} height={17} />
                Nueva Cuenta
              </button>
            </div>
          )}
        </div>
        <Table
          data={sortedClients}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyStateType="clients"
          className="clients-table"
          enableColumnVisibility={true}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
      </div>
    );
  },
);

ClientsTable.displayName = 'ClientsTable';

export default ClientsTable;