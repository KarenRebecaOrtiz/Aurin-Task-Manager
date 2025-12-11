/**
 * Chat Module - Main Export
 * 
 * Punto de entrada principal del módulo de chat modularizado.
 * Exporta todos los componentes, hooks, tipos y stores.
 */

// ============================================================================
// COMPONENTS
// ============================================================================

// Organisms
export { default as ChatSidebar } from './components/ChatSidebar';
export { default as ChatSidebarVirtualized } from './components/ChatSidebarVirtualized';
export { ResponsiveChatSidebar } from './components/ResponsiveChatSidebar';
export { ChatHeader } from './components/organisms/ChatHeader';
export { MessageList } from './components/organisms/MessageList';
export { VirtualizedMessageList } from './components/organisms/VirtualizedMessageList';

// Dialog Variant (re-export from dialogs module for convenience)
export { ChatDialog } from '@/modules/dialogs';

// Molecules
export { MessageItem } from './components/molecules/MessageItem';
export { ReplyPreview } from './components/molecules/ReplyPreview';
export { ActionDropdown } from './components/molecules/ActionDropdown';
export { ImagePreviewOverlay } from './components/molecules/ImagePreviewOverlay';
export { MessageActionMenu } from './components/molecules/MessageActionMenu';

// Atoms
export { DatePill } from './components/atoms/DatePill';
export { MessageActionButton } from './components/atoms/MessageActionButton';

// ============================================================================
// HOOKS
// ============================================================================

export {
  useEncryption,
  useMessagePagination,
  useMessageActions,
} from './hooks';
export { useVirtuosoMessages } from './hooks/useVirtuosoMessages';

// ============================================================================
// STORES
// ============================================================================

export { useChatStore } from './stores/chatStore';
export type { ChatStore } from './types';

// ============================================================================
// ANIMATIONS
// ============================================================================

export {
  // Sidebar container animations
  sidebarContainerVariants,
  sidebarScaleVariants,
  overlayVariants,
  sidebarHeaderVariants,
  sidebarContentVariants,
  sidebarInputVariants,

  // Mobile drawer animations
  drawerContainerVariants,
  drawerContentVariants,

  // Image preview animations
  imagePreviewOverlayVariants,
  imagePreviewContentVariants,

  // Message animations
  messageEntryVariants,

  // Utilities & presets
  getSidebarTransition,
  withDelay,
  sidebarAnimationPresets,
} from './animations';

export type {
  SidebarAnimationPreset,
  DesktopSidebarVariants,
  MobileSidebarVariants,
} from './animations';

// ============================================================================
// TYPES
// ============================================================================

export type {
  Message,
  ChatUser,
  Task,
  MessageAction,
  MessageGroup,
  ChatSidebarProps,
  ChatSidebarState,
  TimerState,
} from './types';
