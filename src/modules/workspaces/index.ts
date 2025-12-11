// Components
export { CreateWorkspaceDialog } from './components/CreateWorkspaceDialog';

// Re-export store types and hooks
export {
  useWorkspacesStore,
  useSelectedWorkspace,
  useSelectedWorkspaceId,
  useWorkspaces,
  useWorkspacesLoading,
  useIsFilteringByWorkspace,
  ALL_WORKSPACES_ID,
  type Workspace,
} from '@/stores/workspacesStore';
