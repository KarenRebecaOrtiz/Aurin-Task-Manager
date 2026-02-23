/**
 * Mock implementation of @clerk/nextjs for demo mode.
 * Webpack aliases @clerk/nextjs to this file when DEMO_MODE is enabled.
 */

import { DEMO_USER } from './constants';

// Mock user object matching Clerk's User shape
const mockUser = {
  id: DEMO_USER.userId,
  firstName: DEMO_USER.firstName,
  lastName: DEMO_USER.lastName,
  fullName: DEMO_USER.fullName,
  imageUrl: DEMO_USER.imageUrl,
  emailAddresses: [{ emailAddress: DEMO_USER.email }],
  primaryEmailAddress: { emailAddress: DEMO_USER.email },
  publicMetadata: DEMO_USER.publicMetadata,
  username: 'demo',
  hasImage: false,
  profileImageUrl: DEMO_USER.imageUrl,
};

// --- Hooks ---

export function useUser() {
  return { user: mockUser, isLoaded: true, isSignedIn: true };
}

export function useAuth() {
  return {
    userId: DEMO_USER.userId,
    isLoaded: true,
    isSignedIn: true,
    sessionId: 'demo_session',
    getToken: async () => 'demo_token',
  };
}

export function useClerk() {
  return {
    signOut: async () => { window.location.href = '/'; },
    user: mockUser,
    session: { id: 'demo_session' },
    openUserProfile: () => {},
    openSignIn: () => {},
    openSignUp: () => {},
  };
}

export function useSession() {
  return {
    session: { id: 'demo_session', status: 'active' },
    isLoaded: true,
    isSignedIn: true,
  };
}

export function useReverification() {
  return [async (fn: any) => fn(), { isLoading: false }];
}

// --- Components ---

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return children;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  return null;
}

// --- Server functions (no-op in demo) ---

export async function auth() {
  return { userId: DEMO_USER.userId, sessionId: 'demo_session' };
}

export async function currentUser() {
  return mockUser;
}

export async function clerkClient() {
  return {
    users: {
      getUser: async () => mockUser,
      getUserList: async () => ({ data: [mockUser], totalCount: 1 }),
      createUser: async () => mockUser,
      deleteUser: async () => ({}),
    },
  };
}

export function clerkMiddleware() {
  return () => {};
}

export function createRouteMatcher() {
  return () => false;
}
