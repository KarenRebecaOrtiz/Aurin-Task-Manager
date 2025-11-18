export type ContainerType = 'tareas' | 'cuentas' | 'miembros' | 'config';

export interface HeaderProps {
  selectedContainer: ContainerType;
  isArchiveTableOpen?: boolean;
  onChangeContainer: (container: ContainerType) => void;
  isCreateTaskOpen?: boolean;
  isEditTaskOpen?: boolean;
  hasUnsavedChanges?: boolean;
}
