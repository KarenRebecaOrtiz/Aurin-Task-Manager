import { Timestamp } from 'firebase/firestore';

export interface Client {
  id: string;
  name: string;
  imageUrl: string;
  gradientId?: string; // Gradient identifier for avatar
  projects?: string[];
  projectCount?: number;
  createdBy?: string;
  createdAt?: string;
  // Extended fields for detailed client information
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  website?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
  lastModified?: string;
  lastModifiedBy?: string;
}

export interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
}

export interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
  lastActivity?: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: string };
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  // Sharing fields
  shared?: boolean;
  shareToken?: string | null;
  commentsEnabled?: boolean;
  shareExpiresAt?: string | null;
  shareAccessCount?: number;
  shareLastAccess?: string | null;
  // Time tracking - New structured approach
  timeTracking?: {
    totalHours: number;
    totalMinutes: number;
    lastLogDate: string | null;
    memberHours?: { [userId: string]: number };
  };
  // Legacy time tracking fields (kept for backward compatibility)
  totalHours?: number;
  memberHours?: { [userId: string]: number };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; // Optional for task messages, required for private messages
  senderName: string;
  text?: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;
  hours?: number; // Add hours field for time tracking
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
  isDatePill?: boolean; // Indicates if this message is a date separator pill
  isSummary?: boolean; // Indicates if this message is an AI summary
  isLoading?: boolean; // Indicates if this message is a loading state (for AI operations)
}