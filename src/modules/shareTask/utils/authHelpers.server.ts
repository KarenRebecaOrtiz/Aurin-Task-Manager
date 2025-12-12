// src/modules/shareTask/utils/authHelpers.server.ts
import 'server-only';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Check if user is admin
 * @param userId - Clerk user ID
 * @returns true if user has admin access
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data();
    return userData?.access === 'admin';
  } catch (error) {
    console.error('[authHelpers] Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user can share a task
 * Admin OR involved in task (creator, leader, assigned)
 */
export async function canUserShareTask(
  userId: string,
  task: any
): Promise<boolean> {
  // Check if admin
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return true;
  }

  // Check if involved in task
  const isInvolved =
    task.CreatedBy === userId ||
    task.LeadedBy?.includes(userId) ||
    task.AssignedTo?.includes(userId);

  return isInvolved;
}

/**
 * Check if user can share a team
 * Admin OR member of team (creator or member)
 */
export async function canUserShareTeam(
  userId: string,
  team: any
): Promise<boolean> {
  // Check if admin
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return true;
  }

  // Check if member of team
  const isMember =
    team.createdBy === userId ||
    team.memberIds?.includes(userId);

  return isMember;
}
