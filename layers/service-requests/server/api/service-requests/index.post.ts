import { auth } from '~~/server/utils/auth'
import { createServiceRequestSchema } from '../../utils/service-request-validation'
import { db } from '~~/server/utils/db'
import { serviceRequest } from '~~/server/db/schema/service-requests'
import { verifyServiceRequestAccess } from '../../utils/service-request-helpers'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const data = createServiceRequestSchema.parse(body)

  // Get user's active organization from session
  type SessionWithOrg = { session?: { activeOrganizationId?: string }, activeOrganizationId?: string }
  const sessionWithOrg = session as SessionWithOrg
  const organizationId = sessionWithOrg?.session?.activeOrganizationId || sessionWithOrg?.activeOrganizationId

  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }

  // Verify user has permission to create service requests
  const hasAccess = await verifyServiceRequestAccess(session, organizationId, 'create')
  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const [request] = await db
    .insert(serviceRequest)
    .values({
      id: nanoid(),
      ...data,
      organizationId,
      createdById: session.user.id,
      status: 'OPEN',
      priority: (data as any).priority || 'MEDIUM',
    })
    .returning()

  return request
})
