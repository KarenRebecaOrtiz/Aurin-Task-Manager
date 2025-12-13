/**
 * Teams Module
 *
 * NOTE: Team data is now managed through the unified dataStore for consistency
 * with tasks, clients, and users. Use '@/stores/dataStore' for:
 * - Reading teams: useTeams(), useDataStore(state => state.teams)
 * - Team CRUD: addTeam, updateTeam, deleteTeam from dataStore
 *
 * The teamService is still used for Firebase operations.
 */

// Types
export * from './types';

// Config
export * from './config';

// Stores (legacy - use dataStore instead)
export * from './stores';

// Hooks
export * from './hooks';

// Services
export * from './services';

// Components
export * from './components';
