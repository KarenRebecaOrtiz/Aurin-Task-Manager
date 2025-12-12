/**
 * Team Service
 *
 * Firebase/Firestore service for team CRUD operations.
 * Teams are stored at the top level: teams/{teamId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Team, TeamFormData } from '../types';
import { DEFAULT_GRADIENT_ID } from '../config';

const TEAMS_COLLECTION = 'teams';

interface CreateTeamData extends TeamFormData {
  clientId: string;
  createdBy: string;
}

class TeamService {
  /**
   * Create a new team
   */
  async createTeam(data: CreateTeamData): Promise<Team> {
    // Debug: log received data
    console.log('[TeamService] createTeam called with:', {
      avatarUrl: data.avatarUrl,
      gradientId: data.gradientId,
      name: data.name,
    });

    const teamData: Record<string, unknown> = {
      name: data.name,
      description: data.description || '',
      memberIds: data.memberIds,
      isPublic: data.isPublic,
      gradientId: data.gradientId || DEFAULT_GRADIENT_ID,
      clientId: data.clientId,
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add avatarUrl if provided
    if (data.avatarUrl) {
      teamData.avatarUrl = data.avatarUrl;
      console.log('[TeamService] Added avatarUrl to teamData:', data.avatarUrl);
    } else {
      console.log('[TeamService] No avatarUrl provided in data');
    }

    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), teamData);

    return {
      id: docRef.id,
      ...teamData,
    } as Team;
  }

  /**
   * Update an existing team
   */
  async updateTeam(teamId: string, updates: Partial<TeamFormData>): Promise<void> {
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(teamRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete a team and all its messages
   * Messages are stored in tasks/{teamId}/messages (shared system with tasks)
   */
  async deleteTeam(teamId: string): Promise<void> {
    // First, delete all messages in the team's conversation
    const messagesRef = collection(db, `tasks/${teamId}/messages`);
    const messagesSnapshot = await getDocs(messagesRef);

    if (!messagesSnapshot.empty) {
      // Use batched writes for efficiency (max 500 per batch)
      const batchSize = 500;
      let batch = writeBatch(db);
      let operationCount = 0;

      for (const messageDoc of messagesSnapshot.docs) {
        batch.delete(messageDoc.ref);
        operationCount++;

        // Commit batch when it reaches the limit
        if (operationCount === batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      // Commit any remaining operations
      if (operationCount > 0) {
        await batch.commit();
      }

      console.log(`[TeamService] Deleted ${messagesSnapshot.size} messages for team ${teamId}`);
    }

    // Then delete the team document
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await deleteDoc(teamRef);

    console.log(`[TeamService] Deleted team ${teamId}`);
  }

  /**
   * Get all teams for a specific client/workspace
   */
  async getTeamsByClient(clientId: string): Promise<Team[]> {
    const teamsQuery = query(
      collection(db, TEAMS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(teamsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Team[];
  }

  /**
   * Subscribe to teams for a specific client (real-time updates)
   */
  subscribeToTeamsByClient(
    clientId: string,
    onTeamsUpdate: (teams: Team[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const teamsQuery = query(
      collection(db, TEAMS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      teamsQuery,
      (snapshot) => {
        const teams = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Team[];
        onTeamsUpdate(teams);
      },
      (error) => {
        console.error('[TeamService] Error subscribing to teams:', error);
        onError?.(error);
      }
    );
  }

  /**
   * Subscribe to all teams the user has access to
   * (either member of or public teams for the client)
   */
  subscribeToUserTeams(
    userId: string,
    clientId: string,
    onTeamsUpdate: (teams: Team[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    // For now, we'll fetch all teams for the client
    // Access control can be enforced in Firestore rules
    return this.subscribeToTeamsByClient(clientId, onTeamsUpdate, onError);
  }

  /**
   * Update the last message timestamp for a team
   */
  async updateLastMessageAt(teamId: string): Promise<void> {
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(teamRef, {
      lastMessageAt: new Date().toISOString(),
    });
  }

  /**
   * Subscribe to all teams visible to the user
   * (public teams or teams where user is a member)
   */
  subscribeToAllVisibleTeams(
    userId: string,
    onTeamsUpdate: (teams: Team[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    // Get all teams ordered by creation date
    const teamsQuery = query(
      collection(db, TEAMS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      teamsQuery,
      (snapshot) => {
        const allTeams = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Team[];

        // Filter to only show teams the user can access:
        // - Public teams (isPublic: true)
        // - Teams where the user is a member
        // - Teams created by the user
        const visibleTeams = allTeams.filter((team) =>
          team.isPublic ||
          team.memberIds.includes(userId) ||
          team.createdBy === userId
        );

        onTeamsUpdate(visibleTeams);
      },
      (error) => {
        console.error('[TeamService] Error subscribing to all teams:', error);
        onError?.(error);
      }
    );
  }
}

// Export singleton instance
export const teamService = new TeamService();
export default teamService;
