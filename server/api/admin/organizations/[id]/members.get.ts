import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { member as memberTable, user as userTable } from '~~/server/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'
import type { SessionUser, OrganizationMemberWithUser } from '#types'

export default defineEventHandler(async (event): Promise<OrganizationMemberWithUser[]> => {
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
  if (user.role === 'admin') {
    // Continue to load members
  } else {
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

    // Members have member.list permission (as defined in permissions.get.ts)
    // So if they're a member, they can list members
  }

  // Get all members for this organization with user details
  const members = await db
    .select({
      id: memberTable.id,
      organizationId: memberTable.organizationId,
      userId: memberTable.userId,
      role: memberTable.role,
      createdAt: memberTable.createdAt,
      user: {
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        image: userTable.image
      }
    })
    .from(memberTable)
    .innerJoin(userTable, eq(memberTable.userId, userTable.id))
    .where(eq(memberTable.organizationId, organizationId))
    .orderBy(memberTable.createdAt)

  return members as OrganizationMemberWithUser[]
})

