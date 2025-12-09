/**
 * Types for Shared Plan feature
 */

export interface SharedPlanData {
  id: string
  name: string
  description: string
  clientName: string
  status: string
  priority: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  involvedUsers: {
    id: string
    fullName: string
    imageUrl: string
    role?: string
  }[]
  // Sharing metadata
  publicShareEnabled: boolean
  publicShareToken: string
  publicShareCreatedAt: string
  publicShareExpiresAt: string | null
  publicShareFirstAccessedAt: string | null
}

export interface PlanComment {
  id: string
  taskId: string
  authorName: string
  authorType: 'client' | 'team'
  authorId?: string // userId if team member
  message: string
  createdAt: string
  attachments?: {
    name: string
    url: string
    type: string
  }[]
}

export interface ShareTokenValidation {
  valid: boolean
  expired: boolean
  planId?: string
  error?: string
  firstAccess?: boolean
}
