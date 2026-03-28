import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { organization as organizationTable } from '~~/server/db/schema/auth-schema'
import { eq } from 'drizzle-orm'
import { checkOrganizationPermission } from '~~/server/utils/permissions'
import type { Organization } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<Organization> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const organizationId = getRouterParam(event, 'id')
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'Organization ID is required' })
  }

  // Check if user has permission to read this organization
  const hasPermission = await checkOrganizationPermission(
    session as { user: { id: string, role?: string } },
    organizationId,
    'organization',
    'read'
  )

  if (!hasPermission) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Get organization details
  const [organization] = await db
    .select()
    .from(organizationTable)
    .where(eq(organizationTable.id, organizationId))
    .limit(1)

  if (!organization) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  return organization as Organization
})
