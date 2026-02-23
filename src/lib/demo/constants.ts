/**
 * Demo Mode Constants
 *
 * Centralized constants for the demo version of Aurin Task Manager.
 * Activated via NEXT_PUBLIC_DEMO_MODE=true environment variable.
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const DEMO_USER = {
  userId: 'demo_user_001',
  email: 'demo@aurin.com',
  firstName: 'Demo',
  lastName: 'User',
  fullName: 'Demo User',
  imageUrl: '',
  publicMetadata: {
    access: 'admin' as const,
    role: 'Admin',
  },
};

export const DEMO_USERS = [
  {
    id: 'demo_user_001',
    firstName: 'Demo',
    lastName: 'User',
    fullName: 'Demo User',
    imageUrl: '',
    emailAddresses: [{ emailAddress: 'demo@aurin.com' }],
    publicMetadata: { access: 'admin', role: 'Admin' },
  },
  {
    id: 'demo_user_002',
    firstName: 'Maria',
    lastName: 'Lopez',
    fullName: 'Maria Lopez',
    imageUrl: '',
    emailAddresses: [{ emailAddress: 'maria@aurin.com' }],
    publicMetadata: { role: 'Designer' },
  },
  {
    id: 'demo_user_003',
    firstName: 'Carlos',
    lastName: 'Rivera',
    fullName: 'Carlos Rivera',
    imageUrl: '',
    emailAddresses: [{ emailAddress: 'carlos@aurin.com' }],
    publicMetadata: { role: 'Developer' },
  },
];
