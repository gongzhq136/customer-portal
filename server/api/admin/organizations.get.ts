import { defineEventHandler, createError } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { organization as organizationTable } from '~~/server/db/schema/auth-schema'
import type { SessionUser, AdminOrganizationsResponse } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<AdminOrganizationsResponse> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Get all organizations with member counts
  const organizations = await db
    .select()
    .from(organizationTable)
    .orderBy(organizationTable.createdAt)

  return organizations as AdminOrganizationsResponse
})
