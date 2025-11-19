export type ContainerType = 'tareas' | 'kanban' | 'archive' | 'files' | 'settings' | 'cuentas' | 'miembros' | 'config';

export interface HeaderProps {
  selectedContainer: ContainerType | null;
  isArchiveTableOpen?: boolean;
  onChangeContainer?: (container: ContainerType) => void;
  isCreateTaskOpen?: boolean;
  isEditTaskOpen?: boolean;
  hasUnsavedChanges?: boolean;
}
