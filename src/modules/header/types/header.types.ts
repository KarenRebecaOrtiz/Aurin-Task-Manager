export type ContainerType = 'tareas' | 'cuentas' | 'miembros' | 'config';

export interface PersonalLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface PersonalLocations {
  home?: PersonalLocation;
  secondary?: PersonalLocation;
}

export interface HeaderProps {
  selectedContainer: ContainerType;
  isArchiveTableOpen?: boolean;
  onChangeContainer: (container: ContainerType) => void;
  isCreateTaskOpen?: boolean;
  isEditTaskOpen?: boolean;
  hasUnsavedChanges?: boolean;
  personalLocations?: PersonalLocations;
}
