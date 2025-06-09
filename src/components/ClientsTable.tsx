'use client';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { gsap } from 'gsap';
import { db } from '@/lib/firebase';
import Table from './Table';
import ActionMenu from './ui/ActionMenu';
import styles from './ClientsTable.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount: number;
  projects: string[];
  createdBy: string;
  createdAt: string;
}

interface ClientsTableProps {
  clients: Client[];
  onCreateOpen: () => void;
  onEditOpen: (client: Client) => void;
  onDeleteOpen: (clientId: string) => void;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

const ClientsTable: React.FC<ClientsTableProps> = memo(
  ({ clients, onCreateOpen, onEditOpen, onDeleteOpen, setClients }) => {
    console.log('ClientsTable rendered');
    const { user } = useUser();
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [sortKey, setSortKey] = useState<string>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const fetchClients = useCallback(async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientsData: Client[] = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name || '',
            imageUrl: doc.data().imageUrl || '/empty-image.png',
            projectCount: doc.data().projectCount || 0,
            projects: doc.data().projects || [],
            createdBy: doc.data().createdBy || '',
            createdAt: doc.data().createdAt || new Date().toISOString(),
          }))
          .filter((client) => client.name && client.createdBy);
        console.log('Fetched clients:', clientsData.map(c => ({ id: c.id, createdBy: c.createdBy, userId: user?.id })));
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    }, [setClients, user?.id]);

    useEffect(() => {
      fetchClients();
    }, [fetchClients]);

    const memoizedFilteredClients = useMemo(() => {
      return clients.filter((client) =>
        client.name && typeof client.name === 'string'
          ? client.name.toLowerCase().includes(searchQuery.toLowerCase())
          : false,
      );
    }, [searchQuery, clients]);

    useEffect(() => {
      setFilteredClients(memoizedFilteredClients);
    }, [memoizedFilteredClients]);

    useEffect(() => {
      const currentActionMenuRef = actionMenuRef.current;
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
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.get(actionMenuOpenId || '')?.contains(event.target as Node)
        ) {
          setActionMenuOpenId(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId]);

    const handleSort = useCallback(
      (key: string) => {
        if (key === sortKey) {
          setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
          setSortKey(key);
          setSortDirection('asc');
        }
      },
      [sortKey],
    );

    const handleActionClick = useCallback((clientId: string) => {
      setActionMenuOpenId((prev) => (prev === clientId ? null : clientId));
    }, []);

    const baseColumns = useMemo(
      () => [
        {
          key: 'imageUrl',
          label: '',
          width: '20%',
          mobileVisible: false,
        },
        {
          key: 'name',
          label: 'Cuentas',
          width: '50%',
          mobileVisible: true,
        },
        {
          key: 'projectCount',
          label: 'Proyectos Asignados',
          width: '20%',
          mobileVisible: false,
        },
        {
          key: 'action',
          label: 'Acciones',
          width: '10%',
          mobileVisible: true,
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
                console.log('Rendering ActionMenu for client:', {
                  clientId: client.id,
                  createdBy: client.createdBy,
                  userId: user?.id,
                  isCreator: client.createdBy === user?.id,
                });
                return (
                  <ActionMenu
                    task={{
                      id: client.id,
                      clientId: '',
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
                    userId={user?.id}
                    isOpen={actionMenuOpenId === client.id}
                    onOpen={() => handleActionClick(client.id)}
                    onEdit={() => {
                      onEditOpen(client);
                      setActionMenuOpenId(null);
                    }}
                    onDelete={() => {
                      onDeleteOpen(client.id);
                      setActionMenuOpenId(null);
                    }}
                    animateClick={() => {}}
                    actionMenuRef={actionMenuRef}
                    actionButtonRef={(el) => {
                      if (el) actionButtonRefs.current.set(client.id, el);
                      else actionButtonRefs.current.delete(client.id);
                    }}
                  />
                );
              },
            };
          }
          return col;
        }),
      [baseColumns, actionMenuOpenId, handleActionClick, onEditOpen, onDeleteOpen, user?.id],
    );

    return (
      <div className={styles.container}>
        {clients.length === 0 && !searchQuery ? (
          <div className={styles.emptyState}>
            <div className={styles.header}>
              <div className={styles.searchWrapper}>
                <input
                  type="text"
                  placeholder="Buscar Cuentas"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Buscar cuentas"
                />
              </div>
              <div className={styles.createButtonWrapper}>
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
            </div>
            <div className={styles.emptyContent}>
              <Image src="/emptyStateImage.png" alt="No hay clientes" width={289} height={289} />
              <div className={styles.emptyText}>
                <h2>¡Todo en orden por ahora!</h2>
                <p>No tienes clientes activos. ¿Por qué no comienzas creando uno nuevo?</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.searchWrapper}>
                <input
                  type="text"
                  placeholder="Buscar Cuentas"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.createButtonWrapper}>
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
            </div>
            <Table
              data={filteredClients}
              columns={columns}
              itemsPerPage={10}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </>
        )}
      </div>
    );
  },
);

ClientsTable.displayName = 'ClientsTable';

export default ClientsTable;