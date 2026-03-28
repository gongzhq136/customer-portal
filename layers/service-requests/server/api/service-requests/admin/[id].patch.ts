import { auth } from '~~/server/utils/auth'
import { adminUpdateServiceRequestSchema } from '../../../utils/service-request-validation'
import { db } from '~~/server/utils/db'
import { eq } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'
import { verifyServiceRequestAdminAccess } from '../../../utils/service-request-helpers'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  // Get the request to check organization
  const [existingRequest] = await db
    .select({ organizationId: serviceRequest.organizationId })
    .from(serviceRequest)
    .where(eq(serviceRequest.id, id!))
    .limit(1)

  if (!existingRequest) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }

  // Check if user has admin-level access
  const isAdmin = await verifyServiceRequestAdminAccess(session, existingRequest.organizationId)

  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const data = adminUpdateServiceRequestSchema.parse(body)

  // Prepare update data
  const updateData: any = { ...data }

  // Handle status transitions
  if (data.status === 'RESOLVED' && !updateData.resolvedAt) {
    updateData.resolvedAt = new Date()
  }
  if (data.status === 'CLOSED' && !updateData.closedAt) {
    updateData.closedAt = new Date()
  }

  const [request] = await db
    .update(serviceRequest)
    .set(updateData)
    .where(eq(serviceRequest.id, id!))
    .returning()

  return request
})
