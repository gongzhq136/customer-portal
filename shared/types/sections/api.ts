/**
 * API request/response types for all API endpoints
 */
import type { Organization, User, Invitation } from './database'
import type { UserRole } from './auth'

/**
 * GET /api/admin/organizations
 * Response: Array of organizations
 */
export type AdminOrganizationsResponse = Organization[]

/**
 * GET /api/admin/users
 * Response: Array of users with selected fields
 */
export type AdminUserResponse = User

export type AdminUsersResponse = AdminUserResponse[]

/**
 * PATCH /api/admin/users/[id]/role
 * Request body for updating user role
 */
export interface UpdateUserRoleRequest {
  role: UserRole
}

/**
 * PATCH /api/admin/users/[id]/role
 * Response after updating user role
 */
export interface UpdateUserRoleResponse {
  success: boolean
  message: string
}

/**
 * GET /api/organizations/[id]/invitations
 * Response: Array of invitations for an organization
 */
export type OrganizationInvitationsResponse = Invitation[]

/**
 * Admin user management types
 */

/**
 * Ban user request
 */
export interface BanUserRequest {
  userId: string
  banReason?: string
  banExpiresIn?: number // seconds
}

/**
 * Unban user request
 */
export interface UnbanUserRequest {
  userId: string
}

/**
 * Impersonate user request
 */
export interface ImpersonateUserRequest {
  userId: string
}

/**
 * Impersonate user response
 */
export interface ImpersonateUserResponse {
  success: boolean
  message?: string
}

/**
 * User session from better-auth
 */
export interface UserSession {
  id: string
  expiresAt: Date
  token: string
  createdAt: Date
  updatedAt: Date
  ipAddress?: string
  userAgent?: string
  userId: string
  activeOrganizationId?: string
  impersonatedBy?: string
}

/**
 * List user sessions response
 */
export interface ListUserSessionsResponse {
  sessions: UserSession[]
}

/**
 * Revoke user session request
 */
export interface RevokeUserSessionRequest {
  sessionToken: string
}

/**
 * Revoke all user sessions request
 */
export interface RevokeUserSessionsRequest {
  userId: string
}

/**
 * Set user password request
 */
export interface SetUserPasswordRequest {
  userId: string
  newPassword: string
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  userId: string
  data: {
    name?: string
    image?: string | null
    [key: string]: unknown
  }
}
