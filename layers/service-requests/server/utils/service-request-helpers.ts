import { checkOrganizationPermission, hasPermission, isOrganizationMember } from '~~/server/utils/permissions'
import { db } from '~~/server/utils/db'
import { eq, and, ilike, or } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'

/**
 * Verify user has access to service requests in an organization
 * Uses the centralized permission system
 */
export async function verifyServiceRequestAccess(
  session: { user: { id: string, role?: string } },
  organizationId: string,
  action: 'read' | 'update' | 'delete' | 'list'
): Promise<boolean> {
  return await checkOrganizationPermission(session, organizationId, 'service-request', action)
}

/**
 * Verify user has admin-level access (can delete service requests)
 * Organization owners/admins and system admins have this permission
 */
export async function verifyServiceRequestAdminAccess(
  session: { user: { id: string, role?: string } },
  organizationId: string
): Promise<boolean> {
  return await hasPermission(
    session.user.id,
    session.user.role,
    organizationId,
    'service-request',
    'delete'
  )
}

/**
 * Verify user is a member of the organization
 * System admins are considered members of all organizations
 */
export async function verifyOrganizationMembership(
  session: { user: { id: string, role?: string } },
  organizationId: string
): Promise<boolean> {
  return await isOrganizationMember(session.user.id, organizationId, session.user.role)
}

export async function verifyRequestOwnership(
  userId: string,
  requestId: string
): Promise<boolean> {
  const [row] = await db
    .select({ createdById: serviceRequest.createdById })
    .from(serviceRequest)
    .where(eq(serviceRequest.id, requestId))
    .limit(1)
  return row?.createdById === userId
}

/**
 * Build query conditions for filtering service requests
 */
export function buildRequestQuery(filters: any) {
  const conditions = [] as any[]
  if (filters.status) conditions.push(eq(serviceRequest.status, filters.status))
  if (filters.priority) conditions.push(eq(serviceRequest.priority, filters.priority))
  if (filters.category) conditions.push(eq(serviceRequest.category, filters.category))
  if (filters.assignedToId) conditions.push(eq(serviceRequest.assignedToId, filters.assignedToId))
  if (filters.createdById) conditions.push(eq(serviceRequest.createdById, filters.createdById))
  if (filters.search) {
    conditions.push(
      or(
        ilike(serviceRequest.title, `%${filters.search}%`),
        ilike(serviceRequest.description, `%${filters.search}%`)
      )!
    )
  }
  return conditions.length ? and(...conditions) : undefined
}
