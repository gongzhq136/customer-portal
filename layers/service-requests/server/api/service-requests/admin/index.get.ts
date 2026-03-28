import { auth } from '~~/server/utils/auth'
import { filterServiceRequestSchema } from '../../../utils/service-request-validation'
import { buildRequestQuery, verifyServiceRequestAdminAccess } from '../../../utils/service-request-helpers'
import { db } from '~~/server/utils/db'
import { desc, sql } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get active organization from session
  type SessionWithOrg = { session?: { activeOrganizationId?: string }, activeOrganizationId?: string }
  const sessionWithOrg = session as SessionWithOrg
  const organizationId = sessionWithOrg?.session?.activeOrganizationId || sessionWithOrg?.activeOrganizationId

  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }

  // Check if user has admin-level access (can delete service requests)
  const isAdmin = await verifyServiceRequestAdminAccess(session, organizationId)

  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const filters = filterServiceRequestSchema.parse(query)

  const where = buildRequestQuery(filters)

  const [requests, totalRows, statusCounts] = await Promise.all([
    db
      .select()
      .from(serviceRequest)
      .where(where as any)
      .orderBy(desc(serviceRequest.createdAt))
      .offset(((filters.page || 1) - 1) * (filters.limit || 20))
      .limit(filters.limit || 20),
    db
      .select({ count: sql<number>`count(*)` })
      .from(serviceRequest)
      .where(where as any),
    db
      .select({
        status: serviceRequest.status,
        count: sql<number>`count(*)`
      })
      .from(serviceRequest)
      .where(where as any)
      .groupBy(serviceRequest.status)
  ])

  const total = Number(totalRows[0]?.count || 0)
  const stats = statusCounts.reduce((acc, item) => {
    acc[item.status as string] = Number(item.count)
    return acc
  }, {} as Record<string, number>)

  return {
    requests,
    pagination: {
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
      pages: Math.ceil(total / (filters.limit || 20))
    },
    stats
  }
})
