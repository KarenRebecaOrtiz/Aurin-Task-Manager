/**
 * Team Notification Service
 *
 * Client-side service for sending team notifications via the API.
 * Calls the server-side notification API to send emails.
 */

type TeamNotificationType = 'team_member_added_you' | 'team_member_added' | 'team_new_message';

interface TeamNotificationParams {
  type: TeamNotificationType;
  teamId: string;
  recipientIds: string[];
  newMemberName?: string;
  newMemberId?: string;
  messageSummary?: string;
}

interface NotificationResult {
  sent: number;
  failed: number;
}

class TeamNotificationService {
  /**
   * Send a team notification via the API
   */
  private async sendNotification(params: TeamNotificationParams): Promise<NotificationResult> {
    try {
      const response = await fetch('/api/teams/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { sent: 0, failed: params.recipientIds.length };
      }

      const data = await response.json();
      return {
        sent: data.data?.sent || 0,
        failed: data.data?.failed || 0,
      };
    } catch (error) {
      return { sent: 0, failed: params.recipientIds.length };
    }
  }

  /**
   * Notify users when they are added to a team (ALWAYS sent)
   *
   * @param teamId - The team ID
   * @param newMemberIds - IDs of the newly added members
   * @param excludeActorId - ID of the user who added them (don't notify themselves)
   */
  async notifyMembersAddedToTeam(
    teamId: string,
    newMemberIds: string[],
    excludeActorId: string
  ): Promise<NotificationResult> {
    // Filter out the actor (they don't need to be notified about adding themselves)
    const recipientIds = newMemberIds.filter((id) => id !== excludeActorId);

    if (recipientIds.length === 0) {
      return { sent: 0, failed: 0 };
    }

    return this.sendNotification({
      type: 'team_member_added_you',
      teamId,
      recipientIds,
    });
  }

  /**
   * Notify existing team members when someone new joins (configurable)
   *
   * @param teamId - The team ID
   * @param existingMemberIds - IDs of existing members to notify
   * @param newMemberName - Name of the new member
   * @param newMemberId - ID of the new member
   * @param excludeActorId - ID of the user who added them
   */
  async notifyTeamOfNewMember(
    teamId: string,
    existingMemberIds: string[],
    newMemberName: string,
    newMemberId: string,
    excludeActorId: string
  ): Promise<NotificationResult> {
    // Filter out the actor and the new member
    const recipientIds = existingMemberIds.filter(
      (id) => id !== excludeActorId && id !== newMemberId
    );

    if (recipientIds.length === 0) {
      return { sent: 0, failed: 0 };
    }

    return this.sendNotification({
      type: 'team_member_added',
      teamId,
      recipientIds,
      newMemberName,
      newMemberId,
    });
  }

  /**
   * Notify team members of a new message (configurable)
   *
   * @param teamId - The team ID
   * @param memberIds - IDs of team members
   * @param senderName - Name of the message sender
   * @param senderId - ID of the message sender (to exclude)
   * @param messageSummary - Optional preview of the message
   */
  async notifyTeamOfNewMessage(
    teamId: string,
    memberIds: string[],
    senderId: string,
    messageSummary?: string
  ): Promise<NotificationResult> {
    // Filter out the sender
    const recipientIds = memberIds.filter((id) => id !== senderId);

    if (recipientIds.length === 0) {
      return { sent: 0, failed: 0 };
    }

    return this.sendNotification({
      type: 'team_new_message',
      teamId,
      recipientIds,
      messageSummary,
    });
  }
}

// Export singleton instance
export const teamNotificationService = new TeamNotificationService();
export default teamNotificationService;
