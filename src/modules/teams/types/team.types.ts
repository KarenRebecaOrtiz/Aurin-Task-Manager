/**
 * Teams Module - Type Definitions
 *
 * Teams are simplified group chats with: name, description, and assigned members.
 * They don't have dates, leads, or priorities like tasks.
 */

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  isPublic: boolean;
  gradientId: string;
  avatarUrl?: string; // Custom uploaded image URL
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  lastMessageAt?: string;
  clientId: string;
}

export interface TeamFormData {
  name: string;
  description: string;
  memberIds: string[];
  isPublic: boolean;
  gradientId: string;
  avatarUrl?: string;
}

export interface TeamFormErrors {
  name?: string;
  memberIds?: string;
}

export interface CreateTeamDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  teamId?: string;
  clientId: string;
  onTeamCreated?: () => void;
  onTeamUpdated?: () => void;
}

export interface TeamCardProps {
  team: Team;
}
