import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { invitation as invitationTable, member as memberTable } from '~~/server/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'
import type { SessionUser, OrganizationInvitationsResponse } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<OrganizationInvitationsResponse> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = session.user as SessionUser
  const organizationId = getRouterParam(event, 'id')
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'Organization ID is required' })
  }

  // Check if user is admin - admins have full access
  if (user.role !== 'admin') {
    // For non-admin users, check if they are a member of this organization
    const [member] = await db
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.userId, user.id),
          eq(memberTable.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!member) {
      throw createError({ statusCode: 403, message: 'Access denied. You must be an admin or a member of this organization.' })
    }

    // Members can view invitations even though they don't have invitation.create/cancel permissions
  }

  // Get all pending invitations for this organization
  const invitations = await db
    .select()
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.organizationId, organizationId),
        eq(invitationTable.status, 'pending')
      )
    )
    .orderBy(invitationTable.expiresAt)

  return invitations as OrganizationInvitationsResponse
})


