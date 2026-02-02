/**
 * ClientsDialog Module - Public Exports
 */

// Main component
export { ClientsDialog } from './ClientsDialog';

// Types
export type { ClientsDialogProps, UseClientsDialogReturn } from './types';

// Hook (for advanced use cases)
export { useClientsDialog } from './hooks';

// Sub-components (for customization)
export {
  ClientListItem,
  ClientEmptyState,
  ClientActionMenu,
  ClientActionDrawer,
} from './components';
