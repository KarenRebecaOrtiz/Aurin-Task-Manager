import { ContainerType } from './header.types';

export interface NavigationOptions {
  checkUnsavedChanges: boolean;
  showConfirmation: boolean;
}

export interface ContainerChangeEvent {
  from: ContainerType;
  to: ContainerType;
  timestamp: number;
}

export interface NavigationHandler {
  handleContainerChange: (container: ContainerType) => void;
}
