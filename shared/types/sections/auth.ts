/**
 * Auth-related types including roles, session user, and permissions
 */
import type { User } from './database'

/**
 * User role type - possible values for user.role
 */
export type UserRole = 'user' | 'admin'

/**
 * Member role type - possible values for organization member roles
 */
export type MemberRole = 'admin' | 'member' | 'owner'

/**
 * Invitation status type
 */
export type InvitationStatus = 'pending' | 'accepted' | 'rejected'

/**
 * Session user extends User with providerId added by customSession hook
 * This is the user object that appears in session.user
 */
export interface SessionUser extends User {
  providerId?: string | null
  activeOrganizationId?: string | null
}

/**
 * Standard API error response type
 */
export interface ApiError {
  statusCode: number
  message: string
  data?: unknown
}

/**
 * Organization member with nested user object
 * This is the structure returned by better-auth organization.listMembers()
 */
export interface OrganizationMemberWithUser {
  id: string
  organizationId: string
  userId: string
  role: MemberRole | MemberRole[]
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    emailVerified: boolean
  }
}

/**
 * Response from listMembers API which may include pagination
 */
export interface ListMembersResponse {
  members?: OrganizationMemberWithUser[]
  data?: OrganizationMemberWithUser[]
  total?: number
}
