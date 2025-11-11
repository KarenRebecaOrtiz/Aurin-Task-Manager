// Components
export { Modal } from './components/Modal';
export { ModalProvider } from './components/ModalProvider';
export { ConfirmModal } from './components/variants/ConfirmModal';
export { LoaderModal } from './components/variants/LoaderModal';
export { AlertModal } from './components/variants/AlertModal';

// Hooks
export { useModal } from './hooks/useModal';

// Store
export { useModalStore } from './stores/modalStore';
export type {
  ModalConfig,
  ModalVariant,
  ModalType,
  ModalSize,
  ModalPosition,
} from './stores/modalStore';

// Animations
export * from './config/animations';
