import { useMemo } from 'react';
import { DropdownItem } from '@/modules/shared/components/molecules/Dropdown';

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

interface UseTaskFiltersProps {
  clients: Client[];
  users: User[];
  priorityFilter: string;
  clientFilter: string;
  userFilter: string;
  setPriorityFilter: (value: string) => void;
  setClientFilter: (value: string) => void;
  setUserFilter: (value: string) => void;
  isAdmin: boolean;
}

export const useTaskFilters = ({
  clients,
  users,
  priorityFilter,
  clientFilter,
  userFilter,
  setPriorityFilter,
  setClientFilter,
  setUserFilter,
  isAdmin,
}: UseTaskFiltersProps) => {
  const priorityOptions: DropdownItem[] = useMemo(
    () => [
      { id: 'all', label: 'Todos', value: '' },
      { id: 'alta', label: 'Alta', value: 'Alta' },
      { id: 'media', label: 'Media', value: 'Media' },
      { id: 'baja', label: 'Baja', value: 'Baja' },
    ],
    []
  );

  const clientOptions: DropdownItem[] = useMemo(
    () => [
      { id: 'all', label: 'Todos', value: '' },
      ...clients.map((client) => ({
        id: client.id,
        label: client.name,
        value: client.id,
      })),
    ],
    [clients]
  );

  const userOptions: DropdownItem[] = useMemo(
    () => [
      { id: 'all', label: 'Todos', value: '' },
      ...users.map((user) => ({
        id: user.id,
        label: user.fullName,
        value: user.id,
      })),
    ],
    [users]
  );

  const filters = useMemo(() => {
    const baseFilters = [
      {
        id: 'priority',
        label: priorityFilter || 'Prioridad',
        value: priorityFilter,
        options: priorityOptions,
        onChange: setPriorityFilter,
        icon: '/filter.svg',
      },
      {
        id: 'client',
        label: clients.find((c) => c.id === clientFilter)?.name || 'Cuenta',
        value: clientFilter,
        options: clientOptions,
        onChange: setClientFilter,
        icon: '/filter.svg',
      },
    ];

    if (isAdmin) {
      baseFilters.push({
        id: 'user',
        label: users.find((u) => u.id === userFilter)?.fullName || 'Usuario',
        value: userFilter,
        options: userOptions,
        onChange: setUserFilter,
        icon: '/filter.svg',
      });
    }

    return baseFilters;
  }, [
    priorityFilter,
    clientFilter,
    userFilter,
    clients,
    users,
    isAdmin,
    priorityOptions,
    clientOptions,
    userOptions,
    setPriorityFilter,
    setClientFilter,
    setUserFilter,
  ]);

  return filters;
};
